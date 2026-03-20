import React, { useState, useEffect } from 'react';
import { X, Edit2, CheckCircle, XCircle, AlertTriangle, User, Calendar, MapPin, Phone, ShieldCheck, Mail, FileText, Scale, ShieldAlert, Loader2 } from 'lucide-react'; 
import { calculateAge } from '../../utils/residentUtils';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

const ResidentViewModal = ({ resident, onClose, onEdit, onApprove, onReject, userRole }) => {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // --- NEW: BLOTTER/BACKGROUND CHECK STATES ---
  const [blotterHits, setBlotterHits] = useState([]);
  const [loadingHits, setLoadingHits] = useState(false);

  // Run the background check when modal opens
  useEffect(() => {
    if (resident) {
      checkDerogatoryRecords();
    }
  }, [resident]);

  const checkDerogatoryRecords = async () => {
    setLoadingHits(true);
    try {
      const fullName = `${resident.first_name} ${resident.last_name}`;
      
      // Search the blotter_records where this resident is the RESPONDENT
      const { data, error } = await supabase
        .from('blotter_records')
        .select('case_number, incident_type, status, incident_date')
        .ilike('respondent_name', `%${fullName}%`)
        .order('incident_date', { ascending: false });

      if (error) throw error;
      setBlotterHits(data || []);
    } catch (error) {
      console.error("Error fetching derogatory records:", error);
    } finally {
      setLoadingHits(false);
    }
  };

  if (!resident) return null;

  const isPending = resident.account_status === 'Pending';
  const age = resident.date_of_birth ? calculateAge(resident.date_of_birth) : 'N/A';
  const activeHits = blotterHits.filter(hit => hit.status !== 'Dismissed' && hit.status !== 'Settled');

  const handleConfirmReject = () => {
    if (!rejectReason) {
      toast.error("Please select a reason for rejection.");
      return;
    }
    onReject(resident, rejectReason);
    setRejectMode(false);
  };

  const handleCopy = (text, label) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
  };

  // SECURITY: Un-clickable CSS Watermark Overlay
  const Watermark = () => (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 10, overflow: 'hidden'
    }}>
      <div style={{
        transform: 'rotate(-30deg)', color: 'rgba(239, 68, 68, 0.4)', 
        fontSize: '1.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px',
        border: '4px solid rgba(239, 68, 68, 0.4)', padding: '10px 20px', whiteSpace: 'nowrap'
      }}>
        Barangay Dos Verification Only<br/><span style={{fontSize: '0.8rem'}}>{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
      <div className="modal-content animation-fade-in" onClick={e => e.stopPropagation()} style={{ 
        background: '#fff', borderRadius: '12px', width: '100%', 
        maxWidth: '1000px', 
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
      }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0', background: isPending ? '#fffbeb' : '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isPending ? <ShieldCheck size={28} color="#d97706" /> : <User size={28} color="var(--primary-600)" />}
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>
              {isPending ? 'Pending Registration Review' : 'Resident Profile'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', overflowY: 'auto', flex: 1 }}>
          
          {/* LEFT SIDE: Text Details & Background Check */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Resident Name & Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '5px' }}>
              {resident.photo_url ? (
                <img src={resident.photo_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} color="#94a3b8"/></div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>
                  {[resident.first_name, resident.middle_name, resident.last_name, resident.suffix].filter(Boolean).join(' ')}
                </h3>
                <span className="badge badge-primary">{resident.residency_type || 'Permanent'} Resident</span>
              </div>
            </div>

            {/* --- BACKGROUND / BLOTTER CHECK UI --- */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                <Scale size={18} color="var(--primary-600)"/> Background Check
              </h4>
              
              {loadingHits ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                  <Loader2 size={16} className="animate-spin" /> Scanning barangay records...
                </div>
              ) : blotterHits.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                  <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.9rem' }}>
                    <strong>Clear Record</strong>
                    <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>No derogatory or blotter records found.</div>
                  </div>
                </div>
              ) : (
                <div style={{ background: activeHits.length > 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${activeHits.length > 0 ? '#fecaca' : '#fde68a'}`, padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: activeHits.length > 0 ? '#dc2626' : '#d97706', marginBottom: '8px' }}>
                    <ShieldAlert size={18} />
                    <strong style={{ fontSize: '0.95rem' }}>
                      {activeHits.length > 0 ? 'Active Derogatory Record(s)' : 'Past Blotter Record(s)'}
                    </strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#475569' }}>
                    {blotterHits.map((hit, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>
                        <strong>{hit.case_number}</strong>: {hit.incident_type} 
                        <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', background: hit.status === 'Active' ? '#fee2e2' : '#f1f5f9', color: hit.status === 'Active' ? '#b91c1c' : '#64748b' }}>
                          {hit.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Resident Demographics & Contact */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} color="#64748b" style={{ marginTop: '3px' }}/> 
                <span><strong>Address:</strong> {[resident.full_address, resident.purok, resident.barangay].filter(Boolean).join(', ')}</span>
              </p>
              
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#64748b"/> 
                <strong>Date of Birth:</strong> {resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : 'N/A'} ({age !== 'Invalid' ? age : 'N/A'} yrs)
              </p>
              
              <p 
                style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleCopy(resident.mobile_number || resident.contact_number, 'Phone Number')}
                title="Click to copy"
              >
                <Phone size={16} color="#64748b"/> 
                <strong>Contact:</strong> 
                <span style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>
                  {resident.mobile_number || resident.contact_number || 'N/A'}
                </span>
              </p>
              
              <p 
                style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleCopy(resident.email, 'Email Address')}
                title="Click to copy"
              >
                <Mail size={16} color="#64748b"/> 
                <strong>Email:</strong> 
                <span style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>
                  {resident.email || 'N/A'}
                </span>
              </p>
              
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="#64748b"/> 
                <strong>Gender / Civil Status:</strong> {[resident.gender, resident.civil_status].filter(Boolean).join(' / ') || 'N/A'}
              </p>
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ marginLeft: '24px' }}>Occupation:</strong> {resident.occupation || 'N/A'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {resident.voter_status && <span className="badge badge-success">Registered Voter</span>}
              {resident.senior_citizen && <span className="badge badge-warning">Senior Citizen</span>}
              {resident.pwd_status && <span className="badge badge-danger">PWD</span>}
            </div>
          </div>

          {/* RIGHT SIDE: Sensitive Documents */}
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPending ? <AlertTriangle size={20} color="#eab308"/> : <FileText size={20} color="var(--primary-600)"/>}
              Identity Verification
            </h3>
            
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>Valid ID (National ID, Passport, etc.)</label>
              {resident.id_image_url ? (
                <div style={{ position: 'relative', marginTop: '5px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#000' }}>
                  <img src={resident.id_image_url} alt="Valid ID" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', display: 'block' }} />
                  <Watermark />
                </div>
              ) : (
                <p style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic' }}>No Valid ID Uploaded</p>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>Proof of Residency</label>
              {resident.proof_of_residency_url ? (
                <div style={{ position: 'relative', marginTop: '5px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#000' }}>
                  {resident.proof_of_residency_url.includes('.pdf') ? (
                     <a href={resident.proof_of_residency_url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'20px', background:'#f1f5f9', textAlign:'center', color:'var(--primary-600)', fontWeight:'bold', textDecoration: 'none' }}>📄 View PDF Document</a>
                  ) : (
                    <>
                      <img src={resident.proof_of_residency_url} alt="Proof of Residency" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', display: 'block' }} />
                      <Watermark />
                    </>
                  )}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No Proof of Residency Uploaded</p>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        {userRole !== 'view_only' && (
          <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
            
            {!isPending ? (
               <button onClick={onEdit} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}><Edit2 size={18} /> Edit Resident Profile</button>
            ) : (
              rejectMode ? (
                <div style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select 
                    value={rejectReason} 
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ef4444' }}
                  >
                    <option value="">-- Select Reason for Rejection --</option>
                    <option value="Valid ID is blurred or unreadable.">Valid ID is blurred or unreadable.</option>
                    <option value="Name on ID does not match registered name.">Name on ID does not match registered name.</option>
                    <option value="Address on Proof of Residency is not in Barangay Dos.">Address on Proof of Residency is not in Barangay Dos.</option>
                    <option value="Missing required documents.">Missing required documents.</option>
                    <option value="Suspected duplicate or fake account.">Suspected duplicate or fake account.</option>
                  </select>
                  <button onClick={handleConfirmReject} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>Confirm Reject</button>
                  <button onClick={() => setRejectMode(false)} className="btn btn-secondary">Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setRejectMode(true)} className="btn" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}><XCircle size={18} /> Reject</button>
                    <button onClick={onEdit} className="btn btn-secondary" title="Fix typos before approving"><Edit2 size={18} /> Edit Typos</button>
                  </div>
                  <button onClick={() => onApprove(resident)} className="btn" style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', fontSize: '1rem' }}><CheckCircle size={20} /> Verify & Approve</button>
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentViewModal;