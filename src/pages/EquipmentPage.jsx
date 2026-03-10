import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, Search, Package, Truck, CheckCircle, AlertTriangle, Edit2, Filter, Wrench, Trash2, AlertOctagon, Loader2 } from 'lucide-react';

// --- IMPORT PAGINATION SYSTEM ---
import { Pagination } from '../components/common'; 
import { usePagination } from '../hooks';

const EquipmentPage = () => {
  const [activeTab, setActiveTab] = useState('records');
  const [inventory, setInventory] = useState([]);
  const [records, setRecords] = useState([]);
  const [residentNames, setResidentNames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- PREVENT DOUBLE CLICKS ---
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isResolveDamageModalOpen, setIsResolveDamageModalOpen] = useState(false); 
  
  // Selected Data for Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [formData, setFormData] = useState({
    borrower_name: '', equipment_id: '', quantity: 1, borrow_date: '', expected_return: '', purpose: '', status: 'Released'
  });

  const [returnForm, setReturnForm] = useState({
    good_condition: 0, damaged_lost: 0, damage_notes: '' 
  });

  const [adjustForm, setAdjustForm] = useState({ new_total: 0 });
  const [resolveForm, setResolveForm] = useState({ repair_qty: 0, dispose_qty: 0 }); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: invData } = await supabase.from('equipment_inventory').select('*').order('item_name');
    if (invData) setInventory(invData);

    const { data: recData } = await supabase
      .from('borrowing_records')
      .select(`*, equipment_inventory(item_name)`)
      .order('borrow_date', { ascending: false });
    
    if (recData) {
      const now = new Date();
      const updatedRecords = recData.map(record => {
        if (record.status === 'Released' && new Date(record.expected_return) < now) {
          return { ...record, display_status: 'Overdue' };
        }
        return { ...record, display_status: record.status };
      });
      setRecords(updatedRecords);
    }

    const { data: resData } = await supabase.from('residents').select('first_name, last_name');
    if (resData) setResidentNames(resData.map(r => `${r.first_name} ${r.last_name}`));
    
    setLoading(false);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- 1. DISPATCH ITEM ---
  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const item = inventory.find(i => i.id === formData.equipment_id);
      if (!item || item.available_quantity < formData.quantity) {
        toast.error(`Not enough available! Only ${item?.available_quantity || 0} left.`);
        setIsProcessing(false);
        return;
      }

      const { error: insertError } = await supabase.from('borrowing_records').insert([formData]);
      if (insertError) throw insertError;

      const newQty = item.available_quantity - formData.quantity;
      await supabase.from('equipment_inventory').update({ available_quantity: newQty }).eq('id', formData.equipment_id);
      
      toast.success('Equipment dispatched successfully!');
      setIsDispatchModalOpen(false);
      fetchData();
    } catch (error) { 
      toast.error(error.message); 
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. OPEN RETURN MODAL ---
  const openReturnModal = (record) => {
    setSelectedRecord(record);
    setReturnForm({ good_condition: record.quantity, damaged_lost: 0, damage_notes: '' });
    setIsReturnModalOpen(true);
  };

  // --- 3. SUBMIT RETURN ---
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const goodQty = parseInt(returnForm.good_condition);
    const damagedQty = parseInt(returnForm.damaged_lost);

    if (goodQty + damagedQty !== selectedRecord.quantity) {
      toast.error(`Total must equal the borrowed amount (${selectedRecord.quantity}).`);
      return;
    }

    if (damagedQty > 0 && !returnForm.damage_notes.trim()) {
      toast.error("Please provide a damage report note.");
      return;
    }

    setIsProcessing(true);

    try {
      const finalStatus = damagedQty > 0 ? (goodQty === 0 ? 'Damaged' : 'Returned w/ Damage') : 'Returned';
      
      await supabase.from('borrowing_records')
        .update({ 
          status: finalStatus, 
          actual_return: new Date().toISOString(),
          damage_notes: returnForm.damage_notes
        }).eq('id', selectedRecord.id);

      const item = inventory.find(i => i.id === selectedRecord.equipment_id);
      if (item) {
        // SAFEGUARD: Ensure we don't accidentally exceed total stock during a return
        let newAvailable = item.available_quantity + goodQty;
        if (newAvailable > item.total_quantity) newAvailable = item.total_quantity;

        await supabase.from('equipment_inventory')
          .update({ 
            available_quantity: newAvailable,
            damaged_quantity: (item.damaged_quantity || 0) + damagedQty
          })
          .eq('id', selectedRecord.equipment_id);
      }

      toast.success(`Return processed! ${damagedQty > 0 ? 'Damaged items moved to maintenance.' : ''}`);
      setIsReturnModalOpen(false);
      fetchData();
    } catch (error) { 
      toast.error('Failed to process return.'); 
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 4. ADJUST STOCK MODAL (WITH AUTO-FIX SAFEGUARD) ---
  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({ new_total: item.total_quantity });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    const newTotal = parseInt(adjustForm.new_total);
    const difference = newTotal - selectedItem.total_quantity;
    let newAvailable = selectedItem.available_quantity + difference;

    // --- MAGIC FIX: If math is corrupted (available > total), this snaps it back to normal ---
    if (newAvailable > newTotal) {
      newAvailable = newTotal - (selectedItem.damaged_quantity || 0);
    }

    if (newAvailable < 0) {
      toast.error("Cannot reduce stock below currently borrowed/damaged amount!");
      setIsProcessing(false);
      return;
    }

    try {
      await supabase.from('equipment_inventory')
        .update({ total_quantity: newTotal, available_quantity: newAvailable })
        .eq('id', selectedItem.id);
      
      toast.success('Inventory stock adjusted & verified!');
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (error) { 
      toast.error('Failed to adjust stock.'); 
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 5. RESOLVE DAMAGED STOCK ---
  const openResolveModal = (item) => {
    setSelectedItem(item);
    setResolveForm({ repair_qty: 0, dispose_qty: 0 });
    setIsResolveDamageModalOpen(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const repair = parseInt(resolveForm.repair_qty) || 0;
    const dispose = parseInt(resolveForm.dispose_qty) || 0;

    if (repair + dispose === 0) return toast.error("Please enter a quantity to repair or dispose.");
    if (repair + dispose > selectedItem.damaged_quantity) return toast.error("Cannot exceed the total damaged amount.");

    setIsProcessing(true);

    try {
      const newDamaged = selectedItem.damaged_quantity - (repair + dispose);
      let newAvailable = selectedItem.available_quantity + repair;
      const newTotal = selectedItem.total_quantity - dispose;

      // Safeguard
      if (newAvailable > newTotal) newAvailable = newTotal;

      await supabase.from('equipment_inventory').update({
        damaged_quantity: newDamaged,
        available_quantity: newAvailable,
        total_quantity: newTotal
      }).eq('id', selectedItem.id);

      toast.success(`Successfully resolved ${repair + dispose} damaged items.`);
      setIsResolveDamageModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve damaged items.");
    } finally {
      setIsProcessing(false);
    }
  }

  // ==========================================
  // FILTERING & PAGINATION LOGIC
  // ==========================================

  const filteredInventory = inventory.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.equipment_inventory?.item_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'Released') matchesStatus = record.display_status === 'Released';
    if (statusFilter === 'Overdue') matchesStatus = record.display_status === 'Overdue';
    if (statusFilter === 'Returned') matchesStatus = record.display_status.includes('Returned');
    if (statusFilter === 'Damaged') matchesStatus = record.display_status.includes('Damaged');

    return matchesSearch && matchesStatus;
  });

  const { currentPage, totalPages, currentData: paginatedRecords, goToPage } = usePagination(filteredRecords, 10);

  useEffect(() => {
    goToPage(1);
  }, [searchTerm, statusFilter, activeTab, goToPage]);

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <datalist id="resident-list">{residentNames.map((name, idx) => <option key={idx} value={name} />)}</datalist>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={28} color="var(--primary-600)" /> Equipment & Vehicles
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage barangay inventory, borrowing, and stock adjustments.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ borrower_name: '', equipment_id: '', quantity: 1, borrow_date: '', expected_return: '', purpose: '', status: 'Released' });
            setIsDispatchModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-600)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <Plus size={20} /> Dispatch Item
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
        <button onClick={() => { setActiveTab('records'); setSearchTerm(''); }} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'records' ? '3px solid var(--primary-600)' : '3px solid transparent', color: activeTab === 'records' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Active Borrows & History</button>
        <button onClick={() => { setActiveTab('inventory'); setSearchTerm(''); }} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'inventory' ? '3px solid var(--primary-600)' : '3px solid transparent', color: activeTab === 'inventory' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Inventory Stock</button>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        
        {/* SMART SEARCH & FILTER BAR */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 2, minWidth: '250px' }}>
            <Search size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder={activeTab === 'records' ? "Search by Borrower or Item..." : "Search Inventory..."}
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }} 
            />
          </div>

          {activeTab === 'records' && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1, minWidth: '200px' }}>
              <Filter size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
              >
                <option value="All">All Statuses</option>
                <option value="Released">Currently Released</option>
                <option value="Overdue">Overdue Items</option>
                <option value="Returned">Returned</option>
                <option value="Damaged">Damaged / Lost</option>
              </select>
            </div>
          )}
        </div>

        {loading ? <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Loading data...</p> : (
          <>
            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Item Name</th>
                    <th style={{ padding: '1rem' }}>Total Physical Stock</th>
                    <th style={{ padding: '1rem' }}>Available Now</th>
                    <th style={{ padding: '1rem' }}>Damaged/Maint.</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No inventory items found.</td></tr>
                  ) : (
                    filteredInventory.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.category === 'Vehicle' ? <Truck size={18} color="#6366f1"/> : <Package size={18} color="#8b5cf6"/>}
                          {item.item_name}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.total_quantity}</td>
                        <td style={{ padding: '1rem' }}><span style={{ fontWeight: 'bold', color: item.available_quantity > 0 ? '#059669' : '#dc2626' }}>{item.available_quantity} Left</span></td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: item.damaged_quantity > 0 ? '#b91c1c' : 'inherit' }}>
                            {item.damaged_quantity || 0} Damaged
                          </span>
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                          <button onClick={() => openAdjustModal(item)} style={{ background: 'var(--neutral-100)', border: '1px solid var(--border)', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            <Edit2 size={14} /> Adjust
                          </button>
                          {item.damaged_quantity > 0 && (
                            <button onClick={() => openResolveModal(item)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              <Wrench size={14} /> Resolve Damage
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* RECORDS TAB */}
            {activeTab === 'records' && (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '1rem' }}>Borrower</th>
                      <th style={{ padding: '1rem' }}>Item & Qty</th>
                      <th style={{ padding: '1rem' }}>Date Borrowed</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem' }}>Notes</th>
                      <th style={{ padding: '1rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No records match your search/filter.</td></tr>
                    ) : (
                      paginatedRecords.map(record => (
                        <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', background: record.display_status === 'Overdue' ? '#fef2f2' : 'transparent' }}>
                          <td style={{ padding: '1rem', fontWeight: 'bold' }}>{record.borrower_name}</td>
                          <td style={{ padding: '1rem' }}>{record.quantity}x {record.equipment_inventory?.item_name}</td>
                          <td style={{ padding: '1rem' }}>{new Date(record.borrow_date).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px',
                              background: record.display_status === 'Released' ? '#fef3c7' : record.display_status.includes('Returned') ? '#d1fae5' : '#fee2e2',
                              color: record.display_status === 'Released' ? '#b45309' : record.display_status.includes('Returned') ? '#047857' : '#b91c1c'
                            }}>
                              {record.display_status === 'Overdue' && <AlertTriangle size={12} />}
                              {record.display_status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.damage_notes || '--'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {(record.display_status === 'Released' || record.display_status === 'Overdue') && (
                              <button onClick={() => openReturnModal(record)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                <CheckCircle size={14} /> Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* DISPATCH MODAL */}
      {isDispatchModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Dispatch Equipment</h2>
            <form onSubmit={handleBorrowSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Resident / Borrower Name *</label>
                <input list="resident-list" name="borrower_name" value={formData.borrower_name} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Item to Borrow *</label>
                  <select name="equipment_id" value={formData.equipment_id} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
                    <option value="" disabled>Select Item...</option>
                    {inventory.map(item => <option key={item.id} value={item.id} disabled={item.available_quantity === 0}>{item.item_name} ({item.available_quantity} available)</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Quantity *</label>
                  <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Date Borrowed *</label>
                  <input type="datetime-local" name="borrow_date" value={formData.borrow_date} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Expected Return *</label>
                  <input type="datetime-local" name="expected_return" value={formData.expected_return} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Purpose / Event Name *</label>
                <input type="text" name="purpose" value={formData.purpose} onChange={handleInputChange} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsDispatchModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: 'var(--primary-600)', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Dispatch Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS RETURN MODAL */}
      {isReturnModalOpen && selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Process Return</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Returning {selectedRecord.quantity}x {selectedRecord.equipment_inventory?.item_name} from {selectedRecord.borrower_name}.
            </p>
            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#047857' }}>Good Condition (Ready to reuse)</label>
                <input 
                  type="number" min="0" max={selectedRecord.quantity} value={returnForm.good_condition} 
                  onChange={(e) => {
                    let goodQty = parseInt(e.target.value) || 0;
                    if (goodQty > selectedRecord.quantity) goodQty = selectedRecord.quantity;
                    setReturnForm({ ...returnForm, good_condition: goodQty, damaged_lost: selectedRecord.quantity - goodQty });
                  }}
                  required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #10b981', background: '#ecfdf5', fontWeight: 'bold' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c' }}>Damaged or Missing</label>
                <input 
                  type="number" min="0" max={selectedRecord.quantity} value={returnForm.damaged_lost} 
                  onChange={(e) => {
                    let damagedQty = parseInt(e.target.value) || 0;
                    if (damagedQty > selectedRecord.quantity) damagedQty = selectedRecord.quantity;
                    setReturnForm({ ...returnForm, damaged_lost: damagedQty, good_condition: selectedRecord.quantity - damagedQty });
                  }}
                  required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ef4444', background: '#fef2f2', fontWeight: 'bold' }} 
                />
              </div>

              {returnForm.damaged_lost > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', animation: 'fadeIn 0.3s' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertOctagon size={14}/> Damage Report / Notes *
                  </label>
                  <textarea 
                    value={returnForm.damage_notes} 
                    onChange={(e) => setReturnForm({...returnForm, damage_notes: e.target.value})} 
                    placeholder="Describe how the item was broken or lost. (Required)" 
                    rows="3" required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', resize: 'vertical' }}
                  ></textarea>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsReturnModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: '#10b981', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE DAMAGE MODAL */}
      {isResolveDamageModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '0.5rem', color: '#b91c1c' }}>Resolve Damaged Items</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You have <strong>{selectedItem.damaged_quantity} damaged {selectedItem.item_name}s</strong>. What would you like to do with them?
            </p>
            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wrench size={16}/> Items Repaired (Back to stock)</label>
                <input type="number" min="0" max={selectedItem.damaged_quantity} value={resolveForm.repair_qty} onChange={(e) => setResolveForm({...resolveForm, repair_qty: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #6ee7b7', background: '#ecfdf5', fontWeight: 'bold' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trash2 size={16}/> Items Disposed (Remove completely)</label>
                <input type="number" min="0" max={selectedItem.damaged_quantity} value={resolveForm.dispose_qty} onChange={(e) => setResolveForm({...resolveForm, dispose_qty: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', fontWeight: 'bold' }} />
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>This will permanently deduct from total physical stock.</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsResolveDamageModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: '#b91c1c', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Adjust Physical Stock</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Update the total physical count for {selectedItem.item_name}. Currently {selectedItem.total_quantity} owned.
            </p>
            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>New Total Quantity *</label>
                <input type="number" min="0" value={adjustForm.new_total} onChange={(e) => setAdjustForm({...adjustForm, new_total: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: 'var(--primary-600)', color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentPage;