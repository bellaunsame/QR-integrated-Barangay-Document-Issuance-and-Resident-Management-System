import { useState, useEffect, useRef, useCallback } from 'react';
import { validateField } from '../../services/security/inputSanitizer';
import { Save, X, FileText, User, AlignLeft, AlertTriangle, Upload, Camera } from 'lucide-react';
import Webcam from 'react-webcam';

// 1. Import your official logos
import calambaSeal from '../../assets/Calamba,_Laguna_Seal.svg.png';
import brgyLogo from '../../assets/brgy.2-icon.png';

const DocumentRequestForm = ({ 
  resident = null,
  residents = [],
  templates = [],
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    resident_id: resident?.id || '',
    template_id: '',
    request_type: '',
    purpose: '',
    request_reason: '',
    notarizedDocFile: null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [previousDocInfo, setPreviousDocInfo] = useState(null);

  // --- CAMERA STATES & REFS ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    if (formData.resident_id && formData.template_id) {
      checkRequestStatus(formData.resident_id, formData.template_id);
    } else {
      setIsDuplicate(false);
      setHasPendingRequest(false);
      setPreviousDocInfo(null);
    }
  }, [formData.resident_id, formData.template_id, residents]);

  const checkRequestStatus = (resId, tempId) => {
    const selectedResident = residents.find(r => r.id === resId);
    
    if (selectedResident && selectedResident.document_requests) {
      const activeRequests = selectedResident.document_requests.filter(
        req => req.template?.id === tempId && (req.status === 'pending' || req.status === 'processing')
      );

      if (activeRequests.length > 0) {
        setHasPendingRequest(true); 
        setIsDuplicate(false);      
        return;                     
      } else {
        setHasPendingRequest(false);
      }

      const pastRequests = selectedResident.document_requests.filter(
        req => req.template?.id === tempId && (req.status === 'completed' || req.status === 'released')
      );

      if (pastRequests.length > 0) {
        pastRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const mostRecent = pastRequests[0];
        
        const today = new Date();
        let expiryDate;
        
        if (mostRecent.expiration_date) {
          expiryDate = new Date(mostRecent.expiration_date);
        } else {
          expiryDate = new Date(mostRecent.created_at);
          expiryDate.setDate(expiryDate.getDate() + 180); 
        }

        if (today < expiryDate) {
          setIsDuplicate(true);
          setPreviousDocInfo({ ...mostRecent, calculated_expiry: expiryDate });
        } else {
          setIsDuplicate(false);
          setPreviousDocInfo(null);
          setFormData(prev => ({ ...prev, request_reason: '', notarizedDocFile: null }));
        }
      } else {
        setIsDuplicate(false);
        setPreviousDocInfo(null);
        setFormData(prev => ({ ...prev, request_reason: '', notarizedDocFile: null }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'template_id') {
      const selectedTemp = templates.find(t => t.id === value);
      setFormData(prev => ({
        ...prev,
        template_id: value,
        request_type: selectedTemp ? selectedTemp.template_name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        setErrors(prev => ({ ...prev, notarizedDocFile: 'File size must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, notarizedDocFile: file }));
      if (errors.notarizedDocFile) {
        setErrors(prev => ({ ...prev, notarizedDocFile: '' }));
      }
    }
  };

  // --- WEBCAM CAPTURE FUNCTION ---
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      // Magically convert the Webcam Image into a standard "File" object
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `captured_document_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFormData(prev => ({ ...prev, notarizedDocFile: file }));
          
          if (errors.notarizedDocFile) {
            setErrors(prev => ({ ...prev, notarizedDocFile: '' }));
          }
          setIsCameraOpen(false); // Close camera modal
        });
    }
  }, [webcamRef, errors]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.resident_id) newErrors.resident_id = 'Please select a resident';
    if (!formData.template_id) newErrors.template_id = 'Please select a document type';

    if (isDuplicate) {
      if (!formData.notarizedDocFile) {
        newErrors.notarizedDocFile = 'A notarized affidavit or supporting document is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || hasPendingRequest) return; 

    setLoading(true);
    try {
      await onSubmit({ ...formData, is_duplicate_request: isDuplicate });
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = (content) => {
    if (!content) return '';
    let html = content.replace(/\n/g, '<br>');
    const thumbprintHTML = `
      <div style="float: right; display: flex; gap: 20px; margin-top: -65px;">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; border: 1.5px solid currentColor; display: block;"></div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 10px; font-family: 'Times New Roman', Times, serif; line-height: 1;">LEFT THUMB</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; border: 1.5px solid currentColor; display: block;"></div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 10px; font-family: 'Times New Roman', Times, serif; line-height: 1;">RIGHT THUMB</div>
        </div>
      </div>
      <div style="clear: both; margin-bottom: 20px;"></div>
    `;
    html = html.replace(/\{\{thumbprint_boxes\}\}/g, thumbprintHTML);
    html = html.replace(/\{\{(\w+)\}\}/g, '<span style="border-bottom: 1px dashed currentColor; padding: 0 4px; font-weight: 600;">{{$1}}</span>');
    return html;
  };

  const selectedTemplateContent = templates.find(t => t.id === formData.template_id)?.template_content || '';

  return (
    <>
      <style>{`
        .modal:has(.document-request-form-container) {
          max-width: 1300px !important;
          width: 95vw !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="document-request-form-container" style={{ width: '100%' }}>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'stretch', flexWrap: 'wrap', width: '100%' }}>
          
          {/* ========================================= */}
          {/* LEFT COLUMN: FORM INPUTS & CONTROLS         */}
          {/* ========================================= */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '350px' }}>
            
            {resident ? (
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <User size={20} color="var(--primary-600)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Resident Information</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Name:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Address:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{resident.street}, {resident.barangay}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <User size={20} color="var(--primary-600)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Select Resident</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <select
                    name="resident_id"
                    value={formData.resident_id}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                    required
                  >
                    <option value="">-- Choose a Resident --</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                    ))}
                  </select>
                  {errors.resident_id && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.resident_id}</span>}
                </div>
              </div>
            )}

            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <FileText size={20} color="var(--primary-600)" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Document Request Details</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Document Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    name="template_id"
                    value={formData.template_id}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                    required
                  >
                    <option value="">Select document type...</option>
                    {templates.filter(t => t.is_active).map(template => (
                      <option key={template.id} value={template.id}>{template.template_name}</option>
                    ))}
                  </select>
                  {errors.template_id && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.template_id}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlignLeft size={16} /> Purpose (Optional)
                  </label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- Select Purpose --</option>
                    <option value="Employment / Job Application">Employment / Job Application</option>
                    <option value="School / Scholarship Requirement">School / Scholarship Requirement</option>
                    <option value="Financial / Medical / Burial Assistance">Financial / Medical / Burial Assistance</option>
                    <option value="Bank Account Opening / Loan Application">Bank Account Opening / Loan Application</option>
                    <option value="Proof of Identity / Postal ID">Proof of Identity / Postal ID</option>
                    <option value="Business Permit Application">Business Permit Application</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {hasPendingRequest && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 0.5rem 0' }}>
                  <AlertTriangle size={18} /> Request Already Pending
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#ef4444', margin: 0, lineHeight: '1.5' }}>
                  This resident already has an active, unprocessed request for this exact document. Please process or reject the existing request on the dashboard before creating a new one.
                </p>
              </div>
            )}

            {isDuplicate && !hasPendingRequest && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem 0' }}>
                  <AlertTriangle size={18} /> Early Renewal / Prior Request
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '1rem', lineHeight: '1.5' }}>
                  This resident already holds an active copy valid until <strong>{previousDocInfo?.calculated_expiry?.toLocaleDateString()}</strong>. 
                  To process an early replacement, a supporting document is required.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
                  <label style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.85rem' }}>Reason for Re-request (Optional)</label>
                  <textarea 
                    name="request_reason"
                    value={formData.request_reason}
                    onChange={handleChange}
                    placeholder="e.g., Lost original copy..."
                    rows="2"
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f59e0b', background: 'transparent', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.85rem' }}>Upload Affidavit / Doc *</label>
                  
                  {/* --- UPDATED FILE ATTACHMENT AREA --- */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    
                    <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: '6px', color: '#f59e0b' }}>
                      <Upload size={16} /> Choose File
                      <input type="file" accept=".pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>

                    {/* NEW TAKE PHOTO BUTTON */}
                    <button type="button" onClick={() => setIsCameraOpen(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: '6px', color: '#f59e0b' }}>
                      <Camera size={16} /> Take Photo
                    </button>

                    <span style={{ fontSize: '0.85rem', color: formData.notarizedDocFile ? '#10b981' : '#f59e0b', marginLeft: '0.5rem' }}>
                      {formData.notarizedDocFile ? `✓ ${formData.notarizedDocFile.name}` : 'No file selected'}
                    </span>
                  </div>
                  {errors.notarizedDocFile && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.notarizedDocFile}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ========================================= */}
          {/* RIGHT COLUMN: A4 DOCUMENT PREVIEW           */}
          {/* ========================================= */}
          <div style={{ 
            flex: '2 1 500px', 
            background: 'var(--background)', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            border: '1px solid var(--border)'
          }}>
            <div style={{ width: '100%', marginBottom: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
              <FileText size={18} />
              <span style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Document Layout Preview</span>
            </div>
            
            {formData.template_id ? (
              <div style={{ 
                width: '100%', 
                maxWidth: '210mm', 
                minHeight: '297mm', 
                padding: '20mm', 
                backgroundColor: 'var(--surface)', 
                border: '1px solid var(--border)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)', 
                fontFamily: '"Times New Roman", Times, serif', 
                fontSize: '12pt', 
                lineHeight: '1.6', 
                color: 'var(--text-primary)', 
                position: 'relative'
              }}>
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '3px solid currentColor' }}>
                  <img src={brgyLogo} alt="Barangay Logo" style={{ position: 'absolute', left: '0', top: '0', width: '80px', height: '80px', objectFit: 'contain' }} />
                  <img src={calambaSeal} alt="City Seal" style={{ position: 'absolute', right: '0', top: '0', width: '80px', height: '80px', objectFit: 'contain' }} />
                  <div style={{ paddingTop: '5px' }}>
                    <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Republic of the Philippines</div>
                    <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Province of Laguna</div>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '4px' }}>CITY OF CALAMBA</div>
                    <div style={{ fontSize: '11pt', marginTop: '4px' }}>Barangay Dos, Calamba City</div>
                  </div>
                  <div style={{ fontSize: '16pt', fontWeight: 'bold', marginTop: '30px', letterSpacing: '0.5px' }}>
                    OFFICE OF THE BARANGAY CHAIRMAN
                  </div>
                </div>
                
                <div style={{ textAlign: 'left', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplateContent) }} />
                </div>
                
                <div style={{ marginTop: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', fontSize: '10pt', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                  <div>Not valid without official dry seal.</div>
                  <div style={{ marginTop: '4px' }}>Contact: [Contact Number] | [Email Address]</div>
                </div>

              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: '10px' }}>
                <FileText size={48} opacity={0.3} />
                <p>Select a Document Type on the left to view the preview.</p>
              </div>
            )}
          </div>
        </div>

        {errors.submit && <div style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{errors.submit}</div>}

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            <X size={20} /> Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || hasPendingRequest} >
            {loading ? <><div className="spinner-small"></div>Submitting...</> : <><Save size={20} />Submit Request</>}
          </button>
        </div>
      </form>

      {/* --- CAMERA OVERLAY MODAL --- */}
      {isCameraOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px', width: '100%', background: 'var(--surface)' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Take Photo of Supporting Document</h3>
              <button type="button" className="btn-icon" onClick={() => setIsCameraOpen(false)}><X size={20} /></button>
            </div>
            
            {/* FIXED WEBCAM CONSTRAINTS HERE */}
            <div style={{ width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: "user" 
                }}
                onUserMediaError={(err) => {
                  console.error("Webcam error:", err);
                  alert("Could not access the camera. Please check your browser permissions.");
                }}
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCameraOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={capturePhoto}>
                <Camera size={18} style={{ marginRight: '8px' }} /> Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentRequestForm;