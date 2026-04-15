import React, { useState, useEffect } from 'react';
import { 
  X, Edit2, CheckCircle, XCircle, AlertTriangle, User, 
  Calendar, MapPin, Phone, ShieldCheck, Mail, FileText, 
  Scale, Loader2, ShieldAlert, UserCheck, Star, Send
} from 'lucide-react'; 
import { calculateAge } from '../../utils/residentUtils';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

const ResidentViewModal = ({ resident, onClose, onEdit, onApprove, onReject, userRole }) => {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [customRejectNote, setCustomRejectNote] = useState(''); 

  // Background Check & Checklist States
  const [loadingHits, setLoadingHits] = useState(false);
  const [blotterHits, setBlotterHits] = useState([]);
  const [activeHits, setActiveHits] = useState([]);
  const [verificationChecklist, setVerificationChecklist] = useState({
    idMatchesName: false,
    addressMatchesProof: false,
    selfieMatchesId: false,
    idIsValid: false
  });

  // --- FIXED: Fetch Background Data Logic ---
  useEffect(() => {
    if (!resident) return;

    const fetchBackgroundData = async () => {
      setLoadingHits(true);
      try {
        const { data, error } = await supabase
          .from('blotter_records')
          .select('*')
          // 👇 THIS IS THE FIX: Changed 'resident_id' to 'complainant_id'
          .eq('complainant_id', resident.id);

        if (error) {
          console.warn("⚠️ Blotter check skipped: 'blotter_records' table or 'complainant_id' column may not exist yet.");
          setBlotterHits([]);
          setActiveHits([]);
        } else if (data) {
          setBlotterHits(data);
          setActiveHits(data.filter(hit => hit.status === 'Active'));
        }
      } catch (err) {
        console.warn("⚠️ Failed to load background check safely:", err.message);
        setBlotterHits([]);
        setActiveHits([]);
      } finally {
        setLoadingHits(false);
      }
    };

    fetchBackgroundData();
  }, [resident]);

  if (!resident) return null;

  const isPending = resident.account_status === 'Pending';
  const age = resident.date_of_birth ? calculateAge(resident.date_of_birth) : 'N/A';

  // Checklist Handlers
  const handleChecklistChange = (field) => {
    setVerificationChecklist(prev => ({ ...prev, [field]: !prev[field] }));
  };
  const isAllChecked = Object.values(verificationChecklist).every(Boolean);

  const handleConfirmReject = () => {
    if (!rejectReason) {
      toast.error("Please select a primary reason for rejection.");
      return;
    }
    onReject(resident, rejectReason, customRejectNote);
    setRejectMode(false);
  };

  const handleCopy = (text, label) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
  };

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

  const hasSpecialClass = resident.voter_status || resident.senior_citizen || resident.pwd_status;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
      <div className="modal-content animation-fade-in" onClick={e => e.stopPropagation()} style={{ 
        background: '#fff', borderRadius: '12px', width: '100%', 
        maxWidth: '1000px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
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

        {/* BODY */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
          
          {/* LEFT SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '5px' }}>
              {resident.photo_url ? (
                <img src={resident.photo_url} alt="Profile Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} color="#94a3b8"/></div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>
                  {[resident.first_name, resident.middle_name, resident.last_name, resident.suffix].filter(Boolean).join(' ')}
                </h3>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
                  <span className="badge badge-primary">{resident.residency_type || 'Permanent'} Resident</span>
                  {resident.account_status === 'Pending' ? (
                    <span className="badge badge-warning">Pending Review</span>
                  ) : resident.is_verified ? (
                    <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                      <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} /> Verified
                    </span>
                  ) : (
                    <span className="badge badge-secondary" style={{ background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' }}>
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasSpecialClass && (
              <div style={{ background: '#f0fdf4', padding: '12px 15px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Star size={16} /> Special Classifications
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {resident.voter_status && <span className="badge" style={{ background: '#10b981', color: 'white' }}>✓ Registered Voter</span>}
                  {resident.senior_citizen && <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>★ Senior Citizen</span>}
                  {resident.pwd_status && <span className="badge" style={{ background: '#ef4444', color: 'white' }}>♿ PWD</span>}
                </div>
              </div>
            )}

            {/* BACKGROUND / BLOTTER CHECK UI */}
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
          </div>

          {/* RIGHT SIDE: Sensitive Documents */}
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPending ? <AlertTriangle size={20} color="#eab308"/> : <FileText size={20} color="var(--primary-600)"/>}
              Identity Verification
            </h3>
            
            {/* Valid ID (Front and Back) */}
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Valid ID 
                {resident.id_type && <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: '#334155' }}>{resident.id_type}</span>}
              </label>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#000', minHeight: '120px' }}>
                  {resident.id_image_url ? (
                    <>
                      <img src={resident.id_image_url} alt="Valid ID Front" style={{ width: '100%', height: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }} />
                      <Watermark />
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: 'white', textAlign: 'center', fontSize: '0.7rem', padding: '4px' }}>FRONT</div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', fontSize: '0.8rem', fontStyle: 'italic' }}>No Front Image</div>
                  )}
                </div>

                <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#000', minHeight: '120px' }}>
                  {resident.id_image_back_url ? (
                    <>
                      <img src={resident.id_image_back_url} alt="Valid ID Back" style={{ width: '100%', height: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }} />
                      <Watermark />
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: 'white', textAlign: 'center', fontSize: '0.7rem', padding: '4px' }}>BACK</div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', fontSize: '0.8rem', fontStyle: 'italic' }}>No Back Image</div>
                  )}
                </div>
              </div>
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

            {/* Liveness Check Selfie */}
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} /> Liveness Check (Selfie holding ID)
              </label>
              {resident.liveness_image_url ? (
                <div style={{ position: 'relative', marginTop: '5px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #fdba74', background: '#000' }}>
                  <img src={resident.liveness_image_url} alt="Liveness Selfie" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', display: 'block' }} />
                  <Watermark />
                </div>
              ) : (
                <p style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic' }}>No Liveness Check Uploaded</p>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        {userRole !== 'view_only' && (
          <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '15px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
            
            {/* STRICT VERIFICATION CHECKLIST */}
            {isPending && !rejectMode && (
              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--primary-600)" /> Security Verification Checklist
                </h4>
                <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#64748b' }}>Staff must manually verify all criteria before this account can be approved.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="checkbox" checked={verificationChecklist.idMatchesName} onChange={() => handleChecklistChange('idMatchesName')} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                    <span style={{ flex: 1 }}>Name on Valid ID exactly matches the registered form name.</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="checkbox" checked={verificationChecklist.addressMatchesProof} onChange={() => handleChecklistChange('addressMatchesProof')} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                    <span style={{ flex: 1 }}>Address on Proof of Residency matches the registered Barangay Dos address.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="checkbox" checked={verificationChecklist.selfieMatchesId} onChange={() => handleChecklistChange('selfieMatchesId')} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                    <span style={{ flex: 1 }}>The face in the <strong>Liveness Check Selfie</strong> clearly matches the face on the Valid ID, and they are physically holding the card.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="checkbox" checked={verificationChecklist.idIsValid} onChange={() => handleChecklistChange('idIsValid')} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                    <span style={{ flex: 1 }}>Valid ID is clear, readable, and not expired.</span>
                  </label>
                </div>
              </div>
            )}

            {/* BUTTON ROW / REJECTION PANEL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              {!isPending ? (
                 <button onClick={onEdit} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}><Edit2 size={18} /> Edit Resident Profile</button>
              ) : (
                rejectMode ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 'bold' }}>
                      <AlertTriangle size={18} /> Require Re-submission (Reject)
                    </div>
                    
                    <select 
                      value={rejectReason} 
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ef4444', background: '#fff' }}
                    >
                      <option value="">-- Select Primary Reason for Rejection --</option>
                      <option value="Valid ID is blurred or unreadable.">Valid ID is blurred or unreadable.</option>
                      <option value="Name on ID does not match registered name.">Name on ID does not match registered name.</option>
                      <option value="Address on Proof of Residency is not in Barangay Dos.">Address on Proof of Residency is not in Barangay Dos.</option>
                      <option value="Liveness check failed (Selfie holding ID is unclear or missing).">Liveness check failed (Selfie holding ID is unclear or missing).</option>
                      <option value="Missing required documents.">Missing required documents.</option>
                      <option value="Suspected duplicate or fake account.">Suspected duplicate or fake account.</option>
                    </select>

                    <textarea
                      placeholder="Add specific instructions for the resident (e.g., 'Please re-upload your ID in a well-lit room'). This note will be included in the email."
                      value={customRejectNote}
                      onChange={(e) => setCustomRejectNote(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                    />

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '5px' }}>
                      <button onClick={() => setRejectMode(false)} className="btn btn-secondary" style={{ background: '#fff' }}>Cancel</button>
                      <button onClick={handleConfirmReject} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                        <Send size={16} /> Send Email & Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setRejectMode(true)} className="btn" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}><XCircle size={18} /> Reject / Request Change</button>
                      <button onClick={onEdit} className="btn btn-secondary" title="Fix typos before approving"><Edit2 size={18} /> Edit Typos</button>
                    </div>
                    
                    <button 
                      onClick={() => onApprove(resident)} 
                      disabled={!isAllChecked}
                      className="btn" 
                      style={{ 
                        background: isAllChecked ? '#10b981' : '#e2e8f0', 
                        color: isAllChecked ? 'white' : '#94a3b8', 
                        border: 'none', 
                        padding: '10px 20px', 
                        fontSize: '1rem',
                        cursor: isAllChecked ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s'
                      }}
                    >
                      <CheckCircle size={20} /> Verify & Approve
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentViewModal;