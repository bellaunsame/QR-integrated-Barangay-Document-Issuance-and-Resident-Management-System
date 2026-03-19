import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  AlertCircle, Gavel, Send, Clock, CheckCircle, XCircle, 
  Info, ChevronLeft, User, MapPin, Calendar, FileText, List 
} from 'lucide-react';

const ResidentBlotterTab = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    report_type: 'Incident', 
    respondent_name: '',
    incident_type: '',
    incident_date: '',
    location: '',
    narrative: '',
    is_agreed: false
  });

  useEffect(() => {
    fetchMyReports();
  }, [user]);

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const fullName = `${user.first_name} ${user.last_name}`;
      
      const { data, error } = await supabase
        .from('blotter_records')
        .select('*')
        .or(`complainant_name.ilike.%${fullName}%,respondent_name.ilike.%${fullName}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'report_type') {
      setFormData({ ...formData, report_type: value, incident_type: '' });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.is_agreed) {
      return toast.error("Please confirm that the information is correct.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting report...");

    try {
      const prefix = formData.report_type === 'Incident' ? 'INC' : 'BLT';
      const caseNum = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('blotter_records').insert([{
        case_number: caseNum,
        complainant_name: `${user.first_name} ${user.last_name}`,
        respondent_name: formData.respondent_name,
        incident_type: formData.incident_type,
        incident_date: formData.incident_date,
        location: formData.location,
        narrative: formData.narrative,
        report_type: formData.report_type,
        status: 'Pending' 
      }]);

      if (error) throw error;

      toast.success("Report submitted to Barangay Staff!", { id: toastId });
      setFormData({ report_type: 'Incident', respondent_name: '', incident_type: '', incident_date: '', location: '', narrative: '', is_agreed: false });
      setShowForm(false);
      fetchMyReports();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable input style
  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    backgroundColor: '#f8fafc', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s'
  };

  return (
    <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', minHeight: '60vh' }}>
      {!showForm ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Incident & Blotter History</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>View the status of your reported cases under the Katarungang Pambarangay.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ display: 'flex', gap: '8px', background: '#ef4444', borderColor: '#ef4444' }}>
              <Send size={18} /> File a Report
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner"></div></div>
          ) : reports.length === 0 ? (
            <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
              <AlertCircle size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ color: '#475569' }}>No Reports Found</h3>
              <p style={{ color: '#64748b' }}>You haven't filed any incidents or blotters yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {reports.map((report) => {
                const isRespondent = report.respondent_name.toLowerCase().includes(user.last_name.toLowerCase());

                return (
                <div key={report.id} style={{ border: isRespondent ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', background: isRespondent ? '#fef2f2' : '#fff' }}>
                  {isRespondent && (
                    <div style={{ background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px' }}>
                      ⚠️ CASE FILED AGAINST YOU
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: report.report_type === 'Blotter' ? '#fee2e2' : '#fef3c7', color: report.report_type === 'Blotter' ? '#b91c1c' : '#b45309' }}>
                      {report.report_type?.toUpperCase() || 'INCIDENT'}
                    </span>
                    <span className={`badge ${report.status === 'Settled' ? 'badge-success' : report.status === 'Pending' ? 'badge-warning' : 'badge-info'}`}>
                      {report.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{report.case_number}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '15px' }}>
                    <strong>{isRespondent ? 'Complainant:' : 'Against:'}</strong> {isRespondent ? report.complainant_name : report.respondent_name}
                  </p>

                  <div style={{ fontSize: '0.85rem', color: '#64748b', background: isRespondent ? '#fee2e2' : '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Type:</strong> {report.incident_type}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {new Date(report.incident_date).toLocaleDateString()}</p>
                    <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Details:</strong> {report.narrative}</p>

                    {report.summon_schedule && (
                       <div style={{ margin: '10px 0 0 0', padding: '10px', background: '#fff', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c' }}>
                         <strong><Gavel size={14}/> Hearing Schedule:</strong><br/>
                         {new Date(report.summon_schedule).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short'})}
                       </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
          
          <button 
            onClick={() => setShowForm(false)} 
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
             <ChevronLeft size={16} /> Back to History
          </button>
          
          <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
            
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ marginTop: 0, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontSize: '1.8rem' }}>
                <Send size={28} color="#ef4444" /> File Official Report
              </h2>
              <p style={{ margin: 0, color: '#64748b' }}>Please complete the form below. False reporting is punishable by law.</p>
            </div>
            
            {/* Legal Disclaimer Box */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '12px', marginBottom: '25px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Info size={24} color="#2563eb" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.5' }}>
                <strong>Katarungang Pambarangay Notice:</strong> Serious crimes (e.g., offenses punishable by imprisonment exceeding one year, or a fine exceeding PHP 5,000, violence against women, and drug offenses) must be reported directly to the Philippine National Police (PNP).
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              
              {/* SECTION: REPORT TYPE */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '12px', color: '#334155', fontSize: '1.1rem' }}>1. What type of report are you filing? *</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '280px', padding: '20px', borderRadius: '12px', border: formData.report_type === 'Incident' ? '2px solid #f59e0b' : '1px solid #cbd5e1', background: formData.report_type === 'Incident' ? '#fffbeb' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s', boxShadow: formData.report_type === 'Incident' ? '0 4px 6px -1px rgba(245, 158, 11, 0.1)' : 'none' }}>
                    <input type="radio" name="report_type" value="Incident" checked={formData.report_type === 'Incident'} onChange={handleInputChange} style={{ marginTop: '5px', accentColor: '#f59e0b', width: '18px', height: '18px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#b45309', fontSize: '1.1rem', marginBottom: '4px' }}>Record of Occurrence</div>
                      <div style={{ fontSize: '0.85rem', color: '#d97706', lineHeight: '1.4' }}>Minor disputes, local ordinance violations, or for insurance purposes (Not for formal charges).</div>
                    </div>
                  </label>
                  
                  <label style={{ flex: 1, minWidth: '280px', padding: '20px', borderRadius: '12px', border: formData.report_type === 'Blotter' ? '2px solid #ef4444' : '1px solid #cbd5e1', background: formData.report_type === 'Blotter' ? '#fef2f2' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s', boxShadow: formData.report_type === 'Blotter' ? '0 4px 6px -1px rgba(239, 68, 68, 0.1)' : 'none' }}>
                    <input type="radio" name="report_type" value="Blotter" checked={formData.report_type === 'Blotter'} onChange={handleInputChange} style={{ marginTop: '5px', accentColor: '#ef4444', width: '18px', height: '18px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '1.1rem', marginBottom: '4px' }}>Formal Complaint (Blotter)</div>
                      <div style={{ fontSize: '0.85rem', color: '#ef4444', lineHeight: '1.4' }}>Triggers mandatory barangay conciliation/mediation via Lupon Tagapamayapa.</div>
                    </div>
                  </label>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

              {/* SECTION: INCIDENT DETAILS */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '16px', color: '#334155', fontSize: '1.1rem' }}>2. Incident Details</label>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                      <User size={16} /> Involved Person(s) / Respondent *
                    </label>
                    <input type="text" name="respondent_name" value={formData.respondent_name} onChange={handleInputChange} placeholder="Names, Ages, Addresses (or 'Unknown')" required style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                      <List size={16} /> Type of Incident *
                    </label>
                    <select name="incident_type" value={formData.incident_type} onChange={handleInputChange} required style={inputStyle}>
                      <option value="">-- Select Type --</option>
                      {formData.report_type === 'Incident' ? (
                        <>
                          <option value="Minor Civil Dispute">Minor Civil Dispute (Neighbor quarrels, petty debts)</option>
                          <option value="VAWC">VAWC (Violence Against Women & Children)</option>
                          <option value="Criminal Offense (Light)">Criminal Offense (Light Penalties)</option>
                          <option value="Local Ordinance Violation">Violation of Local Ordinance</option>
                          <option value="Public Safety Incident">Public Safety Incident (Accidents, Fires)</option>
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
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                      <Calendar size={16} /> Date & Time of Incident *
                    </label>
                    <input type="datetime-local" name="incident_date" value={formData.incident_date} onChange={handleInputChange} required style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                      <MapPin size={16} /> Exact Location *
                    </label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="Where exactly did it happen?" required style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                    <FileText size={16} /> Narrative / Complete Details *
                  </label>
                  <textarea name="narrative" value={formData.narrative} onChange={handleInputChange} rows="6" placeholder="Provide the complete narrative (Who, What, When, Where, Why, How)..." required style={{...inputStyle, resize: 'vertical'}}></textarea>
                </div>
              </div>

              {/* SECTION: AGREEMENT & SUBMIT */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input type="checkbox" name="is_agreed" id="is_agreed" checked={formData.is_agreed} onChange={handleInputChange} style={{ marginTop: '4px', cursor: 'pointer', width: '20px', height: '20px', accentColor: '#ef4444' }} />
                <label htmlFor="is_agreed" style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', cursor: 'pointer' }}>
                  <strong>Declaration of Truth:</strong> I hereby certify that all statements provided in this report are true, correct, and completely accurate to the best of my knowledge. I understand that filing a false or malicious report is punishable by Philippine law.
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !formData.is_agreed} 
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none', 
                  background: formData.is_agreed ? '#ef4444' : '#94a3b8', color: 'white', 
                  fontWeight: 'bold', fontSize: '1.1rem', cursor: formData.is_agreed ? 'pointer' : 'not-allowed', 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                  transition: 'background 0.2s', boxShadow: formData.is_agreed ? '0 4px 10px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                {isSubmitting ? "Submitting Report..." : <><Send size={20} /> Submit Official Report</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentBlotterTab;