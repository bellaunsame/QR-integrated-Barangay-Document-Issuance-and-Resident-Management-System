import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import emailjs from '@emailjs/browser';
import { Plus, Search, Edit, Scale, Paperclip, Loader2, Filter, AlertCircle, Gavel, BellRing, CheckCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common'; 
import { usePagination } from '../hooks';

const BlotterPage = () => {
  const { user } = useAuth();
  const canEdit = !['barangay_captain'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('incident');
  const [records, setRecords] = useState([]);
  const [allResidents, setAllResidents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    action_taken: '', 
    summon_schedule: '', 
    status: 'Active',
    evidence_url: '',
    report_type: 'Incident' 
  });

  useEffect(() => {
    fetchRecords();
    fetchResidents();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('blotter_records').select('*').order('incident_date', { ascending: false });
    if (!error) setRecords(data);
    setLoading(false);
  };

  const fetchResidents = async () => {
    const { data, error } = await supabase.from('residents').select('first_name, last_name, email');
    if (!error && data) setAllResidents(data);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${formData.case_number}-${Math.random()}.${fileExt}`;

    try {
      const { error } = await supabase.storage.from('blotter_evidence').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('blotter_evidence').getPublicUrl(fileName);
      setFormData({ ...formData, evidence_url: publicUrlData.publicUrl });
      toast.success('Evidence uploaded successfully!');
    } catch (error) {
      toast.error('Upload failed. Ensure storage bucket exists.');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (record = null) => {
    if (!canEdit) return; 
    if (record) {
      setFormData({
        ...record,
        incident_date: new Date(record.incident_date).toISOString().slice(0, 16),
        summon_schedule: record.summon_schedule ? new Date(record.summon_schedule).toISOString().slice(0, 16) : '',
        action_taken: record.action_taken || '',
      });
      setEditingId(record.id);
    } else {
      const prefix = activeTab === 'incident' ? 'INC' : 'BLT';
      setFormData({
        case_number: `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        complainant_name: '', respondent_name: '', incident_type: '', incident_date: '', location: '', narrative: '', action_taken: '', summon_schedule: '', status: 'Active', evidence_url: '', report_type: activeTab === 'incident' ? 'Incident' : 'Blotter'
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, summon_schedule: formData.summon_schedule || null }; 
    try {
      let dbError;
      if (editingId) {
        const { error } = await supabase.from('blotter_records').update(payload).eq('id', editingId);
        dbError = error;
      } else {
        const { error } = await supabase.from('blotter_records').insert([payload]);
        dbError = error;
      }
      if (dbError) throw dbError;
      toast.success('Record saved successfully');
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- NEW: ACCEPT PENDING REPORT ---
  const handleAcceptReport = async (record) => {
    if (!window.confirm(`Accept this ${record.report_type} report and mark it as Active?`)) return;
    try {
      const { error } = await supabase.from('blotter_records').update({ status: 'Active' }).eq('id', record.id);
      if (error) throw error;
      toast.success('Report accepted and marked as Active.');
      fetchRecords();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- SEND SUMMON EMAIL ---
  const handleSendSummon = async (record) => {
    if (record.status === 'Pending') {
      return toast.error("Please accept the report (change status to Active) before sending a summon.");
    }
    if (!record.summon_schedule) {
      return toast.error("Please edit the record and set a Summon Schedule first.");
    }
    if (!window.confirm(`Send official summon notice to ${record.respondent_name}?`)) return;

    setIsProcessing(true);
    const toastId = toast.loading('Finding resident and sending notice...');

    const respondent = allResidents.find(r => `${r.first_name} ${r.last_name}`.toLowerCase() === record.respondent_name.toLowerCase());

    if (!respondent || !respondent.email) {
      toast.error(`Could not find a registered email for ${record.respondent_name}.`, { id: toastId });
      setIsProcessing(false);
      return;
    }

    try {
      const schedDate = new Date(record.summon_schedule).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
      await emailjs.send(
        'service_178ko1n', 'template_qzkqkvf', 
        {
          to_email: respondent.email,
          to_name: respondent.first_name,
          barangay_name: "Dos, Calamba",
          email_subject_message: `OFFICIAL SUMMON NOTICE: You are hereby requested to appear at the Barangay Hall for a mandatory conciliation/mediation regarding Case No. ${record.case_number} filed by ${record.complainant_name}.\n\nSCHEDULE: ${schedDate}\n\nFailure to appear may result in legal implications. Please log in to your Resident Portal for more details.`,
          otp_code: "SUMMON NOTICE" 
        },
        'pfTdQReY0nVV3CjnY'
      );
      toast.success(`Summon notice sent to ${respondent.email}!`, { id: toastId });
    } catch (error) {
      toast.error('Failed to send email notice.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const isCorrectType = activeTab === 'incident' ? (record.report_type === 'Incident' || !record.report_type) : record.report_type === 'Blotter';
    const matchesSearch = record.complainant_name?.toLowerCase().includes(searchTerm.toLowerCase()) || record.respondent_name?.toLowerCase().includes(searchTerm.toLowerCase()) || record.case_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    return isCorrectType && matchesSearch && matchesStatus;
  });

  const { currentPage, totalPages, currentData: paginatedRecords, goToPage } = usePagination(filteredRecords, 10); 
  useEffect(() => { goToPage(1); }, [searchTerm, statusFilter, activeTab, goToPage]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    let bg = '#f1f5f9', color = '#64748b'; // Default
    if (status === 'Pending') { bg = '#ffedd5'; color = '#9a3412'; }
    if (status === 'Active') { bg = '#dbeafe'; color = '#1e40af'; }
    if (status === 'Settled') { bg = '#d1fae5'; color = '#065f46'; }
    if (status === 'Dismissed' || status === 'Escalated') { bg = '#fee2e2'; color = '#b91c1c'; }
    
    return (
      <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold', background: bg, color: color }}>
        {status}
      </span>
    );
  };

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <datalist id="resident-list">{allResidents.map((r, idx) => <option key={idx} value={`${r.first_name} ${r.last_name}`} />)}</datalist>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeTab === 'incident' ? <AlertCircle size={28} color="#f59e0b" /> : <Gavel size={28} color="#ef4444" />}
            {activeTab === 'incident' ? 'Incident Management' : 'Official Blotter Records'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{activeTab === 'incident' ? 'Track community complaints and minor incidents.' : 'Manage formal cases and barangay mediation.'}</p>
        </div>
        {canEdit && (
          <button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeTab === 'incident' ? '#f59e0b' : '#ef4444', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            <Plus size={20} /> New {activeTab === 'incident' ? 'Incident' : 'Blotter'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
        <button onClick={() => setActiveTab('incident')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'incident' ? '3px solid #f59e0b' : '3px solid transparent', color: activeTab === 'incident' ? '#f59e0b' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Community Incidents</button>
        <button onClick={() => setActiveTab('blotter')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'blotter' ? '3px solid #ef4444' : '3px solid transparent', color: activeTab === 'blotter' ? '#ef4444' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Mediation/Blotter</button>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 2, minWidth: '250px' }}>
            <Search size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="Search by names or case no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-100)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1, minWidth: '200px' }}>
            <Filter size={20} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', cursor: 'pointer' }}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending (Needs Review)</option>
              <option value="Active">Active</option>
              <option value="Settled">Settled</option>
              <option value="Dismissed">Dismissed</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Case No.</th>
                <th style={{ padding: '1rem' }}>Complainant</th>
                <th style={{ padding: '1rem' }}>Respondent</th>
                <th style={{ padding: '1rem' }}>Schedule</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', background: record.status === 'Pending' ? '#fafafa' : 'transparent' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{record.case_number}</td>
                    <td style={{ padding: '1rem' }}>{record.complainant_name}</td>
                    <td style={{ padding: '1rem' }}>{record.respondent_name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {record.summon_schedule ? new Date(record.summon_schedule).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '--'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(record.status)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => openModal(record)} title="Edit Record" style={{ color: 'var(--primary-600)', background: 'none', border: 'none', cursor: 'pointer' }}><Edit size={18} /></button>
                        
                        {/* ACCEPT BUTTON FOR PENDING REPORTS */}
                        {record.status === 'Pending' && canEdit && (
                          <button onClick={() => handleAcceptReport(record)} title="Accept & Mark Active" style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}><CheckCircle size={18} /></button>
                        )}

                        {/* SUMMON BUTTON LOGIC */}
                        {activeTab === 'blotter' && canEdit && (
                          <button 
                            onClick={() => handleSendSummon(record)} 
                            disabled={isProcessing || record.status === 'Pending'} 
                            title={record.status === 'Pending' ? "Must be 'Active' to send summon" : "Send Summon Email"} 
                            style={{ 
                              color: record.status === 'Pending' ? '#cbd5e1' : '#ef4444', 
                              background: 'none', border: 'none', 
                              cursor: (isProcessing || record.status === 'Pending') ? 'not-allowed' : 'pointer' 
                            }}
                          >
                            <BellRing size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingId ? 'Edit' : 'New'} {activeTab === 'incident' ? 'Incident Report' : 'Blotter Case'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Case Number (System Generated)</label>
                <input type="text" name="case_number" value={formData.case_number} readOnly style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Complainant *</label>
                  <input list="resident-list" name="complainant_name" value={formData.complainant_name} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Involved Persons / Respondent *</label>
                  <input list="resident-list" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Names, Ages, Addresses" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Location *</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Date & Time of Incident *</label>
                    <input type="datetime-local" name="incident_date" value={formData.incident_date} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Type of Incident *</label>
                <select name="incident_type" value={formData.incident_type} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                  <option value="" disabled>-- Select Type --</option>
                  {activeTab === 'incident' ? (
                    <>
                      <option value="Minor Civil Dispute">Minor Civil Dispute (Neighbor quarrels, petty debts)</option>
                      <option value="VAWC">VAWC (Violence Against Women & Children)</option>
                      <option value="Criminal Offense (Light)">Criminal Offense (Light Penalties e.g., theft, vandalism)</option>
                      <option value="Local Ordinance Violation">Violation of Local Ordinance (Curfew, Noise, Protocols)</option>
                      <option value="Public Safety Incident">Public Safety Incident (Accidents, Fires, Nuisance)</option>
                      <option value="KP Conciliation Dispute">Dispute Requiring KP Conciliation</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="Civil Dispute">Civil Dispute (Property, Debts)</option>
                      <option value="Minor Criminal Offense">Minor Criminal Offense (Theft, Physical Injury)</option>
                      <option value="Family / Domestic Conflict">Family / Domestic Conflict</option>
                      <option value="Public Nuisance / Disturbance">Public Nuisance (Noise, Vending)</option>
                      <option value="Assault or Threat">Assault, Harassment or Threat</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Narrative / Details *</label>
                <textarea name="narrative" value={formData.narrative} onChange={handleInputChange} rows="3" placeholder="Describe the incident (Who, What, When, Where, Why, How)..." required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
              </div>

              {activeTab === 'blotter' && (
                <div className="form-group" style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#b91c1c' }}>Schedule for Hearing / Mediation (Summon Date)</label>
                  <input type="datetime-local" name="summon_schedule" value={formData.summon_schedule} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', marginTop: '5px' }} />
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary-700)' }}>Action Taken / Recommendations</label>
                <textarea name="action_taken" value={formData.action_taken} onChange={handleInputChange} rows="2" placeholder="Action taken by barangay officials or recommendations..." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', background: '#f8fafc' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Case Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                    <option value="Pending">Pending (Needs Review)</option>
                    <option value="Active">Active</option>
                    <option value="Settled">Settled</option>
                    <option value="Dismissed">Dismissed</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', margin: 0 }}>
                    <Paperclip size={18} /> {uploading ? 'Uploading...' : 'Attach Evidence'}
                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {formData.evidence_url && (
                <div style={{ fontSize: '0.85rem', color: '#047857', background: '#d1fae5', padding: '0.5rem', borderRadius: '6px', display: 'inline-block' }}>
                  ✓ Evidence attached. <a href={formData.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'underline' }}>View File</a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', background: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'incident' ? '#f59e0b' : '#ef4444', color: 'white', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlotterPage;