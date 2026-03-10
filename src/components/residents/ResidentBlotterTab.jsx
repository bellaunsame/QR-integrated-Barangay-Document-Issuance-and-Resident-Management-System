import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, ChevronLeft, Clock, ShieldAlert, Paperclip, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

const ResidentBlotterTab = ({ user }) => {
  const [view, setView] = useState('list'); // 'list' or 'form'
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State matching the Admin BlotterPage schema
  const [formData, setFormData] = useState({
    incident_type: 'Property Dispute',
    incident_date: '',
    location: '', 
    respondent_name: '',
    narrative: '',
    evidence_url: ''
  });

  // 1. Fetch Resident's Reports
  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blotter_records')
        .select('*')
        .eq('complainant_id', user.id) // Crucial: Only loads THIS resident's reports
        .order('incident_date', { ascending: false });

      if (error) throw error;
      setMyReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMyReports();
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. Handle Evidence Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `Resident-${Date.now()}-${Math.random()}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from('blotter_evidence')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('blotter_evidence')
        .getPublicUrl(fileName);

      setFormData({ ...formData, evidence_url: publicUrlData.publicUrl });
      toast.success('Evidence attached successfully!');
    } catch (error) {
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  // 3. Submit New Blotter Report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Auto-generate Case Number matching Admin logic
      const caseNumber = `C-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Combine Location into Narrative since Admin table doesn't have a Location column
      const combinedNarrative = `LOCATION: ${formData.location}\n\nDETAILS: ${formData.narrative}`;

      const payload = {
        case_number: caseNumber,
        complainant_id: user.id, // Links to resident
        complainant_name: `${user.first_name} ${user.last_name}`,
        respondent_name: formData.respondent_name || 'Unknown',
        incident_type: formData.incident_type,
        incident_date: formData.incident_date,
        narrative: combinedNarrative,
        evidence_url: formData.evidence_url,
        status: 'Active' // <-- FIXED: Matches your database's check constraint perfectly!
      };

      const { error } = await supabase.from('blotter_records').insert([payload]);

      if (error) throw error;

      toast.success("Incident report filed successfully! Your Case No is " + caseNumber);
      setView('list');
      fetchMyReports(); // Refresh the list
      
      // Reset form
      setFormData({
        incident_type: 'Property Dispute',
        incident_date: '',
        location: '',
        respondent_name: '',
        narrative: '',
        evidence_url: ''
      });

    } catch (error) {
      console.error("Submission Error:", error);
      toast.error("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('settled') || s.includes('resolved')) return '#10b981'; // Green
    if (s.includes('active') || s.includes('ongoing')) return '#f59e0b'; // Orange
    if (s.includes('escalated') || s.includes('dismissed')) return '#ef4444'; // Red
    return '#3b82f6'; // Blue fallback
  };

  return (
    <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '60vh' }}>
      
      {view === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} color="#ef4444" /> Incident & Blotter Reports
              </h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Confidential filing of complaints and community concerns.</p>
            </div>
            <button onClick={() => setView('form')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Plus size={18} /> File New Report
            </button>
          </div>

          <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#334155' }}>My Filed Reports</h3>
          
          {loading ? (
             <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>Loading your reports...</div>
          ) : myReports.length === 0 ? (
            <div style={{ background: '#f8fafc', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
              <ShieldAlert size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No Reports Filed</h3>
              <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>You have not filed any blotters or incident reports.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {myReports.map((report) => (
                <div key={report.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'block' }}>{report.incident_type}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Case No: <strong>{report.case_number}</strong> | Date: {new Date(report.incident_date).toLocaleDateString()}</span>
                    </div>
                    <span style={{ 
                      background: `${getStatusColor(report.status)}20`, 
                      color: getStatusColor(report.status), 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(report.status) }}></div>
                      {report.status || 'Active'}
                    </span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', color: '#475569' }}>
                    <strong>Respondent:</strong> {report.respondent_name || 'Unknown'} 
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* FORM VIEW */}
          <button onClick={() => setView('list')} style={{ marginBottom: '20px', background: 'transparent', border: 'none', padding: '5px 0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <ChevronLeft size={18} /> Back to My Reports
          </button>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ color: '#b91c1c', margin: '0 0 5px 0' }}>Confidentiality Notice</h3>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '0.9rem' }}>Information submitted here goes directly to the Barangay Administration. False reporting is punishable by law.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#334155' }}>Type of Incident *</label>
              <select name="incident_type" value={formData.incident_type} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="Theft">Theft / Robbery</option>
                <option value="Physical Altercation">Physical Altercation</option>
                <option value="Property Dispute">Property Dispute</option>
                <option value="Noise Complaint">Noise Complaint</option>
                <option value="Domestic Dispute">Domestic / Family Dispute</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Date & Time of Incident *</label>
                <input type="datetime-local" name="incident_date" value={formData.incident_date} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Location of Incident *</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Front of Blk 2 Lot 4" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#334155' }}>Name of Respondent (Person being reported)</label>
              <input type="text" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Leave blank if unknown" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#334155' }}>Narrative / Details *</label>
              <textarea name="narrative" value={formData.narrative} onChange={handleInputChange} placeholder="Describe exactly what happened..." rows="5" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', color: '#334155' }}>Attach Evidence (Optional)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', justifyContent: 'center', color: '#64748b' }}>
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                {uploading ? 'Uploading...' : (formData.evidence_url ? 'Evidence Attached ✓' : 'Click to Upload Photo or PDF')}
                <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} accept="image/*,.pdf" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setView('list')} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={submitting || uploading} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (submitting || uploading) ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ResidentBlotterTab;