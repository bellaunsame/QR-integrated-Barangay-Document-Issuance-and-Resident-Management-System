import React from 'react';
import { X, Edit2, User, FileText, CreditCard, Eye } from 'lucide-react';
import { calculateAge, calculateResidencyYears, formatParentName } from '../../utils/residentUtils';

const ResidentViewModal = ({ resident, onClose, onEdit, userRole }) => {
  if (!resident) return null;

  // --- SAFE IMAGE VIEWER FOR WEBCAM DATA URLs ---
  const handleViewImage = (url, title) => {
    if (!url) return;
    
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      const win = window.open();
      win.document.write(`
        <html>
          <head><title>${title}</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; background-color:#0f172a; height:100vh; overflow:hidden;">
            <img src="${url}" style="width: 90vw; height: 90vh; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border-radius: 10px;" />
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resident Profile</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body preview-body" style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Avatar & QR Side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '250px' }}>
              {resident.photo_url ? (
                <img src={resident.photo_url} alt="Resident Profile" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-md)' }} />
              ) : (
                <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', boxShadow: 'var(--shadow-md)' }} >
                  <User size={80} />
                </div>
              )}
              
              {resident.qr_code_url ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={resident.qr_code_url} alt="QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Resident QR Code</p>
                </div>
              ) : (
                <span className="badge badge-warning">QR Pending</span>
              )}
              
              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {resident.voter_status && <span className="badge badge-primary">Voter</span>}
                {resident.pwd_status && <span className="badge badge-warning">PWD</span>}
                {resident.senior_citizen && <span className="badge badge-success">Senior</span>}
                {resident.other_id_status && <span className="badge badge-secondary">Other ID</span>}
              </div>
              
              {/* IN-FORM IMAGE PREVIEWS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                
                {/* Proof of Residency Thumbnail */}
                {resident.proof_of_residency_url && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                    <div style={{ padding: '8px 12px', background: 'var(--neutral-100)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> Proof of Residency</span>
                    </div>
                    <div 
                      onClick={() => handleViewImage(resident.proof_of_residency_url, "Proof of Residency")}
                      style={{ width: '100%', height: '140px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                      title="Click to view fullscreen"
                    >
                      <img src={resident.proof_of_residency_url} alt="Proof of Residency" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} /> Enlarge
                      </div>
                    </div>
                  </div>
                )}

                {/* Valid ID Thumbnail */}
                {resident.valid_id_url && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                    <div style={{ padding: '8px 12px', background: 'var(--neutral-100)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={14} /> Valid ID</span>
                    </div>
                    <div 
                      onClick={() => handleViewImage(resident.valid_id_url, "Valid ID")}
                      style={{ width: '100%', height: '140px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                      title="Click to view fullscreen"
                    >
                      <img src={resident.valid_id_url} alt="Valid ID" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} /> Enlarge
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Information Data */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Basic Info */}
              <div>
                <h1 style={{ marginBottom: '0.2rem', color: 'var(--primary-800)' }}>
                  {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>{resident.occupation || 'No occupation listed'}</p>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Gender</p><p className="font-medium">{calculateAge(resident.date_of_birth)} yrs / {resident.gender}</p></div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Date of Birth</p><p className="font-medium">{new Date(resident.date_of_birth).toLocaleDateString()}</p></div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Civil Status</p><p className="font-medium">{resident.civil_status}</p></div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact Number</p><p className="font-medium">{resident.mobile_number || 'N/A'}</p></div>
                <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Complete Address</p>
                  <p className="font-medium">{resident.full_address}, {resident.purok ? `${resident.purok}, ` : ''} {resident.barangay}, {resident.city_municipality}, {resident.province} {resident.zip_code}</p>
                </div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Residency Duration</p>
                  <p className="font-medium">{resident.residency_start_date ? `${calculateResidencyYears(resident.residency_start_date)} Years (Since ${new Date(resident.residency_start_date).getFullYear()})` : 'Not specified'}</p>
                </div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion / Blood Type</p><p className="font-medium">{resident.religion || 'N/A'} / {resident.blood_type || 'N/A'}</p></div>
                <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Educational Attainment</p><p className="font-medium">{resident.educational_attainment || 'N/A'}</p></div>
              </div>

              {/* Family Information Preview */}
              <div style={{ background: 'var(--neutral-50)', padding: '1.5rem', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-700)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Detailed Family Information</h3>
                
                {/* Father */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                    Father {resident.father_deceased && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'normal' }}>(Deceased)</span>}
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ gridColumn: '1 / span 2' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Name</p><p className="font-medium">{formatParentName(resident, 'father')}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{resident.father_age || 'N/A'} / {resident.father_birthdate ? new Date(resident.father_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact No.</p><p className="font-medium">{resident.father_phone_number || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Occupation</p><p className="font-medium">{resident.father_occupation || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion</p><p className="font-medium">{resident.father_religion || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nationality</p><p className="font-medium">{resident.father_nationality || 'N/A'}</p></div>
                    <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Address</p><p className="font-medium">{resident.father_address || 'N/A'}</p></div>
                  </div>
                </div>

                {/* Mother */}
                <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                    Mother {resident.mother_deceased && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'normal' }}>(Deceased)</span>}
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ gridColumn: '1 / span 2' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Maiden Name</p><p className="font-medium">{formatParentName(resident, 'mother')}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{resident.mother_age || 'N/A'} / {resident.mother_birthdate ? new Date(resident.mother_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact No.</p><p className="font-medium">{resident.mother_phone_number || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Occupation</p><p className="font-medium">{resident.mother_occupation || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion</p><p className="font-medium">{resident.mother_religion || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nationality</p><p className="font-medium">{resident.mother_nationality || 'N/A'}</p></div>
                    <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Address</p><p className="font-medium">{resident.mother_address || 'N/A'}</p></div>
                  </div>
                </div>

                {/* Spouse / Guardian / Emergency */}
                <div style={{ paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Spouse's Name</p><p className="font-medium">{resident.spouse_name || 'N/A'}</p></div>
                      <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{resident.spouse_age || 'N/A'} / {resident.spouse_birthdate ? new Date(resident.spouse_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                      <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Spouse Occupation</p><p className="font-medium">{resident.spouse_occupation || 'N/A'}</p></div>
                      <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No. of Children </p>
                        <p className="font-medium">{resident.number_of_children !== null ? resident.number_of_children : 'None'}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Guardian's Name</p><p className="font-medium">{resident.guardian_name || 'N/A'} {resident.guardian_relationship ? `(${resident.guardian_relationship})` : ''}</p></div>
                    <div style={{ marginTop: '1rem' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Emergency Contact</p><p className="font-medium">{resident.emergency_contact_name || 'N/A'} - {resident.emergency_contact_number || 'N/A'}</p></div>
                  </div>
                </div>
              </div>

              {/* DOCUMENT HISTORY SECTION */}
              <div style={{ background: 'var(--neutral-50)', padding: '1.5rem', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-700)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} /> Requested Documents History
                </h3>
                
                {resident?.document_requests?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {resident.document_requests
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map((doc) => {
                        return (
                          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <div>
                              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                {doc.template?.template_name || 'Unknown Document'}
                              </strong>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <small style={{ color: 'var(--text-tertiary)' }}>
                                  Requested: {new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </small>
                                
                                {doc.expiration_date && (doc.status === 'completed' || doc.status === 'released') && (
                                  <div style={{ marginTop: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                                    {new Date(doc.expiration_date) < new Date() ? (
                                      <span style={{ color: '#f87171' }}> 
                                        Expired on: {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#34d399' }}> 
                                        Valid until: {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <span className={`badge badge-${
                              doc.status === 'released' ? 'success' : 
                              doc.status === 'completed' ? 'success' : 
                              doc.status === 'processing' ? 'warning' : 'gray'
                            }`}>
                              {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
                            </span>
                          </div>
                        );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)' }}>No documents requested yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          
          {userRole !== 'view_only' && (
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              <Edit2 size={16} style={{ marginRight: '0.5rem' }} /> Edit Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentViewModal;