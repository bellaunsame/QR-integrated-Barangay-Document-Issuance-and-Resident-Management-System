import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, Search, Package, Truck, CheckCircle, AlertTriangle, Edit2 } from 'lucide-react';

const EquipmentPage = () => {
  const [activeTab, setActiveTab] = useState('records');
  const [inventory, setInventory] = useState([]);
  const [records, setRecords] = useState([]);
  const [residentNames, setResidentNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  
  // Selected Data for Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [formData, setFormData] = useState({
    borrower_name: '', equipment_id: '', quantity: 1, borrow_date: '', expected_return: '', purpose: '', status: 'Released'
  });

  const [returnForm, setReturnForm] = useState({
    good_condition: 0, damaged_lost: 0
  });

  const [adjustForm, setAdjustForm] = useState({
    new_total: 0
  });

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
      // Auto-update status to "Overdue" if the date has passed and it's still "Released"
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
    try {
      const item = inventory.find(i => i.id === formData.equipment_id);
      if (!item || item.available_quantity < formData.quantity) {
        toast.error(`Not enough available! Only ${item?.available_quantity || 0} left.`);
        return;
      }

      const { error: insertError } = await supabase.from('borrowing_records').insert([formData]);
      if (insertError) throw insertError;

      const newQty = item.available_quantity - formData.quantity;
      await supabase.from('equipment_inventory').update({ available_quantity: newQty }).eq('id', formData.equipment_id);
      
      toast.success('Equipment dispatched successfully!');
      setIsDispatchModalOpen(false);
      fetchData();
    } catch (error) { toast.error(error.message); }
  };

  // --- 2. OPEN RETURN MODAL ---
  const openReturnModal = (record) => {
    setSelectedRecord(record);
    setReturnForm({ good_condition: record.quantity, damaged_lost: 0 });
    setIsReturnModalOpen(true);
  };

  // --- 3. SUBMIT RETURN (Handling Damages) ---
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const goodQty = parseInt(returnForm.good_condition);
    const damagedQty = parseInt(returnForm.damaged_lost);

    if (goodQty + damagedQty !== selectedRecord.quantity) {
      toast.error(`Total must equal the borrowed amount (${selectedRecord.quantity}).`);
      return;
    }

    try {
      // 1. Mark record as Returned (or Damaged if all are broken)
      const finalStatus = damagedQty > 0 ? (goodQty === 0 ? 'Damaged' : 'Returned w/ Damage') : 'Returned';
      await supabase.from('borrowing_records')
        .update({ status: finalStatus, actual_return: new Date().toISOString() })
        .eq('id', selectedRecord.id);

      // 2. Add Good items back to available, permanently subtract Damaged from Total
      const item = inventory.find(i => i.id === selectedRecord.equipment_id);
      if (item) {
        await supabase.from('equipment_inventory')
          .update({ 
            available_quantity: item.available_quantity + goodQty,
            total_quantity: item.total_quantity - damagedQty // Permanently removed from barangay stock!
          })
          .eq('id', selectedRecord.equipment_id);
      }

      toast.success(`Items returned. ${damagedQty > 0 ? `${damagedQty} marked as damaged/lost.` : ''}`);
      setIsReturnModalOpen(false);
      fetchData();
    } catch (error) { toast.error('Failed to process return.'); }
  };

  // --- 4. MANUAL INVENTORY ADJUSTMENT ---
  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({ new_total: item.total_quantity });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const newTotal = parseInt(adjustForm.new_total);
    const difference = newTotal - selectedItem.total_quantity;
    
    // If they added 10 to total, available goes up by 10. If they subtracted 5, available goes down 5.
    const newAvailable = selectedItem.available_quantity + difference;

    if (newAvailable < 0) {
      toast.error("Cannot reduce stock below currently borrowed amount!");
      return;
    }

    try {
      await supabase.from('equipment_inventory')
        .update({ total_quantity: newTotal, available_quantity: newAvailable })
        .eq('id', selectedItem.id);
      
      toast.success('Inventory stock adjusted successfully!');
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (error) { toast.error('Failed to adjust stock.'); }
  };

  // --- SEARCH FILTER ---
  const filteredRecords = records.filter(record => 
    record.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipment_inventory?.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <button onClick={() => setActiveTab('records')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'records' ? '3px solid var(--primary-600)' : '3px solid transparent', color: activeTab === 'records' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Active Borrows</button>
        <button onClick={() => setActiveTab('inventory')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'inventory' ? '3px solid var(--primary-600)' : '3px solid transparent', color: activeTab === 'inventory' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Inventory Stock</button>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        
        {/* Search Bar (Only visible on Records tab) */}
        {activeTab === 'records' && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1 }}>
              <Search size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
              <input type="text" placeholder="Search by Borrower or Item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }} />
            </div>
          </div>
        )}

        {loading ? <p>Loading data...</p> : (
          <>
            {/* INVENTORY TAB CONTENT */}
            {activeTab === 'inventory' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Item Name</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Total Physical Stock</th>
                    <th style={{ padding: '1rem' }}>Available Now</th>
                    <th style={{ padding: '1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.category === 'Vehicle' ? <Truck size={18} color="#6366f1"/> : <Package size={18} color="#8b5cf6"/>}
                        {item.item_name}
                      </td>
                      <td style={{ padding: '1rem' }}>{item.category}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.total_quantity}</td>
                      <td style={{ padding: '1rem' }}><span style={{ fontWeight: 'bold', color: item.available_quantity > 0 ? '#059669' : '#dc2626' }}>{item.available_quantity} Left</span></td>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => openAdjustModal(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <Edit2 size={16} /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RECORDS TAB CONTENT */}
            {activeTab === 'records' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Borrower</th>
                    <th style={{ padding: '1rem' }}>Item & Qty</th>
                    <th style={{ padding: '1rem' }}>Date Borrowed</th>
                    <th style={{ padding: '1rem' }}>Expected Return</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', background: record.display_status === 'Overdue' ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{record.borrower_name}</td>
                      <td style={{ padding: '1rem' }}>{record.quantity}x {record.equipment_inventory?.item_name}</td>
                      <td style={{ padding: '1rem' }}>{new Date(record.borrow_date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', color: record.display_status === 'Overdue' ? '#dc2626' : 'inherit', fontWeight: record.display_status === 'Overdue' ? 'bold' : 'normal' }}>
                        {new Date(record.expected_return).toLocaleDateString()}
                      </td>
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
                      <td style={{ padding: '1rem' }}>
                        {(record.display_status === 'Released' || record.display_status === 'Overdue') && (
                          <button onClick={() => openReturnModal(record)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            <CheckCircle size={14} /> Process Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <button type="submit" style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: 'var(--primary-600)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Dispatch Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS RETURN MODAL (Handles Damages) */}
      {isReturnModalOpen && selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Process Return</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Returning {selectedRecord.quantity}x {selectedRecord.equipment_inventory?.item_name} from {selectedRecord.borrower_name}.
            </p>
            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#047857' }}>Quantity in Good Condition (Returned)</label>
                <input 
                  type="number" 
                  min="0" 
                  max={selectedRecord.quantity} 
                  value={returnForm.good_condition} 
                  onChange={(e) => {
                    let goodQty = parseInt(e.target.value) || 0;
                    if (goodQty > selectedRecord.quantity) goodQty = selectedRecord.quantity;
                    if (goodQty < 0) goodQty = 0;
                    
                    setReturnForm({
                      good_condition: goodQty,
                      damaged_lost: selectedRecord.quantity - goodQty
                    });
                  }}
                  required 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #10b981', background: '#ecfdf5', fontWeight: 'bold' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c' }}>Quantity Damaged or Lost</label>
                <input 
                  type="number" 
                  min="0" 
                  max={selectedRecord.quantity} 
                  value={returnForm.damaged_lost} 
                  onChange={(e) => {
                    let damagedQty = parseInt(e.target.value) || 0;
                    if (damagedQty > selectedRecord.quantity) damagedQty = selectedRecord.quantity;
                    if (damagedQty < 0) damagedQty = 0;

                    setReturnForm({
                      damaged_lost: damagedQty,
                      good_condition: selectedRecord.quantity - damagedQty
                    });
                  }}
                  required 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ef4444', background: '#fef2f2', fontWeight: 'bold' }} 
                />
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>*Damaged items will be permanently deducted from total stock.</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsReturnModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Return</button>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>This will automatically adjust available stock.</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: 'var(--primary-600)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentPage;