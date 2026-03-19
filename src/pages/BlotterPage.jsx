import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit, Scale, Paperclip, Loader2, Filter } from 'lucide-react';

// --- IMPORT AUTH & PAGINATION ---
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common'; 
import { usePagination } from '../hooks';

const BlotterPage = () => {
  const { user } = useAuth(); // Get current user
  const canEdit = !['view_only', 'barangay_captain'].includes(user?.role); // Security Check

  const [records, setRecords] = useState([]);
  const [residentNames, setResidentNames] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    case_number: '',
    complainant_name: '',
    respondent_name: '',
    incident_type: '',
    incident_date: '',
    location: '', 
    narrative: '',
    status: 'Active',
    evidence_url: ''
  });

  useEffect(() => {
    fetchRecords();
    fetchResidents();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blotter_records')
      .select('*')
      .order('incident_date', { ascending: false });

    if (!error) setRecords(data);
    setLoading(false);
  };

  const fetchResidents = async () => {
    const { data, error } = await supabase.from('residents').select('first_name, last_name');
    if (!error && data) {
      const names = data.map(r => `${r.first_name} ${r.last_name}`);
      setResidentNames(names);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${formData.case_number}-${Math.random()}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from('blotter_evidence')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('blotter_evidence')
        .getPublicUrl(fileName);

      setFormData({ ...formData, evidence_url: publicUrlData.publicUrl });
      toast.success('Evidence uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload file. Make sure your storage bucket is set up.');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (record = null) => {
    if (!canEdit) return; // Extra security layer

    if (record) {
      setFormData({
        ...record,
        incident_date: new Date(record.incident_date).toISOString().slice(0, 16),
        location: record.location || '' 
      });
      setEditingId(record.id);
    } else {
      setFormData({
        case_number: `C-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        complainant_name: '',
        respondent_name: '',
        incident_type: '',
        incident_date: '',
        location: '', 
        narrative: '',
        status: 'Active',
        evidence_url: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      if (editingId) {
        const { error } = await supabase.from('blotter_records').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Record updated successfully');
      } else {
        const { error } = await supabase.from('blotter_records').insert([formData]);
        if (error) throw error;
        toast.success('Record added successfully');
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.complainant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.respondent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.case_number.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const { currentPage, totalPages, currentData: paginatedRecords, goToPage } = usePagination(filteredRecords, 10); 

  useEffect(() => {
    goToPage(1);
  }, [searchTerm, statusFilter, goToPage]);

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <datalist id="resident-list">
        {residentNames.map((name, index) => (
          <option key={index} value={name} />
        ))}
      </datalist>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={28} color="var(--primary-600)" /> Incident & Blotter Reports
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and track barangay incident reports and hearings.</p>
        </div>
        
        {/* HIDE ADD BUTTON IF VIEW ONLY */}
        {canEdit && (
          <button 
            onClick={() => openModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-600)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Plus size={20} /> Add Record
          </button>
        )}
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 2, minWidth: '250px' }}>
            <Search size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search by Case No. or Names..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1, minWidth: '200px' }}>
            <Filter size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active / Ongoing</option>
              <option value="Settled">Settled at Barangay</option>
              <option value="Escalated">Escalated to Police</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" color="var(--primary-600)" /></div>
        ) : paginatedRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
            <Scale size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
            <p>No blotter records found matching your filters.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Case No.</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Complainant</th>
                  <th style={{ padding: '1rem' }}>Respondent</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{record.case_number}</td>
                    <td style={{ padding: '1rem' }}>{new Date(record.incident_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>{record.complainant_name}</td>
                    <td style={{ padding: '1rem' }}>{record.respondent_name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold',
                        background: record.status === 'Active' ? '#fef3c7' : record.status === 'Settled' ? '#d1fae5' : '#fee2e2',
                        color: record.status === 'Active' ? '#b45309' : record.status === 'Settled' ? '#047857' : '#b91c1c'
                      }}>
                        {record.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {/* HIDE EDIT BUTTON IF VIEW ONLY */}
                      {canEdit ? (
                        <button onClick={() => openModal(record)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-600)' }}>
                          <Edit size={18} />
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No Access</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && canEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{editingId ? 'Edit Blotter Record' : 'New Blotter Record'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Case Number <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="case_number" value={formData.case_number} readOnly style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', fontWeight: 'bold' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Complainant Name <span style={{ color: 'red' }}>*</span></label>
                  <input list="resident-list" name="complainant_name" value={formData.complainant_name} onChange={handleInputChange} placeholder="Type or select resident..." required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Respondent Name <span style={{ color: 'red' }}>*</span></label>
                  <input list="resident-list" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Type or select resident..." required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Incident Type <span style={{ color: 'red' }}>*</span></label>
                  <select name="incident_type" value={formData.incident_type} onChange={handleInputChange} required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
                    <option value="" disabled>Select Type...</option>
                    <option value="Theft">Theft / Robbery</option>
                    <option value="Physical Altercation">Physical Altercation</option>
                    <option value="Property Dispute">Property Dispute</option>
                    <option value="Noise Complaint">Noise Complaint</option>
                    <option value="Domestic Dispute">Domestic / Family Dispute</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Incident Date & Time <span style={{ color: 'red' }}>*</span></label>
                  <input type="datetime-local" name="incident_date" value={formData.incident_date} onChange={handleInputChange} required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Location of Incident <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Purok 1, near the Basketball Court" required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Incident Narrative <span style={{ color: 'red' }}>*</span></label>
                <textarea name="narrative" value={formData.narrative} onChange={handleInputChange} placeholder="Describe exactly what happened..." rows="4" required style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Case Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
                    <option value="Active">Active / Ongoing</option>
                    <option value="Settled">Settled at Barangay</option>
                    <option value="Escalated">Escalated to Police (PNP)</option>
                    <option value="Dismissed">Dismissed</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Attach Evidence (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', width: '100%', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                      {uploading ? 'Uploading...' : (formData.evidence_url ? 'File Attached' : 'Choose File')}
                      <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
              </div>

              {formData.evidence_url && (
                <div style={{ fontSize: '0.85rem', color: '#047857', background: '#d1fae5', padding: '0.5rem', borderRadius: '6px', display: 'inline-block' }}>
                  ✓ Evidence attached. <a href={formData.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'underline' }}>View File</a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '6px', background: 'var(--primary-600)', color: 'white', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {editingId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlotterPage;