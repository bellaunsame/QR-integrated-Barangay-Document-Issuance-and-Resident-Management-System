import { useState, useEffect, useRef, useCallback } from 'react';
import { validateField } from '../../services/security/inputSanitizer';
import { Save, X, FileText, User, AlignLeft, AlertTriangle, Upload, Camera, Search, ChevronDown, CheckCircle } from 'lucide-react';
import Webcam from 'react-webcam';

// 1. Import your official logos
import calambaSeal from '../../assets/Calamba,_Laguna_Seal.svg.png';
import brgyLogo from '../../assets/brgy.2-icon.png';

// ==============================================================
// CUSTOM SEARCHABLE DROPDOWN COMPONENT
// ==============================================================
const SearchableDropdown = ({ options, value, onChange, name, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search input
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          borderRadius: '6px',
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: 'var(--background)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-tertiary)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '42px'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '6px', marginTop: '4px', zIndex: 50,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxHeight: '300px', 
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--background)' }}>
            <Search size={16} color="var(--text-tertiary)" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  // Simulate standard event object for the onChange handler
                  onChange({ target: { name, value: opt.value } });
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '10px 12px', cursor: 'pointer', color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {opt.label}
              </div>
            )) : (
              <div style={{ padding: '12px', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '0.9rem' }}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================
// MAIN FORM COMPONENT
// ==============================================================
const DocumentRequestForm = ({ 
  residentData = null, // <--- NEW: Accepts logged-in Resident Data!
  resident = null,     // Existing Admin pre-selected resident
  residents = [],
  templates = [],
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    resident_id: residentData?.id || resident?.id || '', // Auto-set ID if Resident
    template_id: '',
    request_type: '',
    purpose: '',
    custom_purpose: '', 
    request_reason: '',
    notarizedDocFile: null,
    isAgreed: false // <--- NEW: Agreement State
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [previousDocInfo, setPreviousDocInfo] = useState(null);

  // --- CAMERA STATES & REFS ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef(null);

  // Automatically lock resident_id if ResidentData is provided (Resident Mode)
  useEffect(() => {
    if (residentData?.id) {
      setFormData(prev => ({ ...prev, resident_id: residentData.id }));
    }
  }, [residentData]);

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
    // If residentData is used (Resident Portal), we don't have the full Admin residents array.
    // The backend will handle exact duplicate validations, but we do a quick check if data is available.
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
    const { name, value, type, checked } = e.target;
    
    if (name === 'template_id') {
      const selectedTemp = templates.find(t => t.id === value);
      setFormData(prev => ({
        ...prev,
        template_id: value,
        request_type: selectedTemp ? selectedTemp.template_name : ''
      }));
    } else if (type === 'checkbox') {
      // Handle the Agreement Checkbox
      setFormData(prev => ({ ...prev, [name]: checked }));
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

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `captured_document_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFormData(prev => ({ ...prev, notarizedDocFile: file }));
          
          if (errors.notarizedDocFile) {
            setErrors(prev => ({ ...prev, notarizedDocFile: '' }));
          }
          setIsCameraOpen(false); 
        });
    }
  }, [webcamRef, errors]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.resident_id) newErrors.resident_id = 'Please select a resident';
    if (!formData.template_id) newErrors.template_id = 'Please select a document type';

    // Validation for Custom Purpose
    if (formData.purpose === 'Other' && !formData.custom_purpose.trim()) {
      newErrors.custom_purpose = 'Please specify your custom purpose';
    }

    if (isDuplicate) {
      if (!formData.notarizedDocFile) {
        newErrors.notarizedDocFile = 'A notarized affidavit or supporting document is required.';
      }
    }

    // Validation for Agreement Checkbox (Only if user is a Resident)
    if (residentData && !formData.isAgreed) {
      newErrors.isAgreed = 'You must agree to the terms before submitting.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || hasPendingRequest) return; 

    setLoading(true);
    try {
      // Determine final purpose string
      const finalPurpose = formData.purpose === 'Other' ? formData.custom_purpose : formData.purpose;
      
      const payloadToSubmit = { 
        ...formData, 
        purpose: finalPurpose,
        is_duplicate_request: isDuplicate 
      };
      
      // Clean up temporary UI fields so we don't send them to the database
      delete payloadToSubmit.custom_purpose;
      delete payloadToSubmit.isAgreed; 

      await onSubmit(payloadToSubmit);
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

  // --- DROPDOWN OPTIONS MAPPING ---
  const residentOptions = residents.map(r => ({
    label: `${r.first_name} ${r.last_name}`,
    value: r.id
  }));

  const templateOptions = templates.filter(t => t.is_active).map(t => ({
    label: t.template_name,
    value: t.id
  }));

  const purposeOptions = [
    { label: "Employment / Job Application", value: "Employment / Job Application" },
    { label: "School / Scholarship Requirement", value: "School / Scholarship Requirement" },
    { label: "Financial / Medical / Burial Assistance", value: "Financial / Medical / Burial Assistance" },
    { label: "Bank Account Opening / Loan Application", value: "Bank Account Opening / Loan Application" },
    { label: "Proof of Identity / Postal ID", value: "Proof of Identity / Postal ID" },
    { label: "Business Permit Application", value: "Business Permit Application" },
    { label: "Other (Please specify)", value: "Other" }
  ];

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
            
            {/* --- SMART RESIDENT DISPLAY --- */}
            {residentData ? (
              // RESIDENT MODE: Show Verified Banner, hide Search
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0 }}>
                  {residentData.first_name?.charAt(0) || 'R'}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#166534', fontSize: '1.1rem' }}>
                    {residentData.first_name} {residentData.middle_name ? residentData.middle_name.charAt(0) + '.' : ''} {residentData.last_name} {residentData.suffix}
                  </h3>
                  <p style={{ margin: 0, color: '#15803d', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <CheckCircle size={14} /> Verified Resident Profile
                  </p>
                </div>
              </div>
            ) : resident ? (
              // ADMIN MODE (Pre-Selected Resident): Show Resident details block
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
              // ADMIN MODE (New Request): Show Search Dropdown
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <User size={20} color="var(--primary-600)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Select Resident</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <SearchableDropdown 
                    name="resident_id"
                    value={formData.resident_id}
                    onChange={handleChange}
                    options={residentOptions}
                    placeholder="-- Search & Choose a Resident --"
                    error={errors.resident_id}
                  />
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
                  <SearchableDropdown 
                    name="template_id"
                    value={formData.template_id}
                    onChange={handleChange}
                    options={templateOptions}
                    placeholder="-- Search Document Type --"
                    error={errors.template_id}
                  />
                  {errors.template_id && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.template_id}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlignLeft size={16} /> Purpose (Optional)
                  </label>
                  <SearchableDropdown 
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    options={purposeOptions}
                    placeholder="-- Search or Select Purpose --"
                  />
                </div>

                {/* --- CUSTOM PURPOSE TEXTBOX (Only appears if "Other" is selected) --- */}
                {formData.purpose === 'Other' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-4px', animation: 'fadeIn 0.3s ease-in-out' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--primary-600)' }}>Please specify your custom purpose: <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      name="custom_purpose"
                      value={formData.custom_purpose}
                      onChange={handleChange}
                      placeholder="e.g. For Travel Abroad"
                      style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${errors.custom_purpose ? '#ef4444' : 'var(--primary-500)'}`, background: 'var(--background)', color: 'var(--text-primary)' }}
                    />
                    {errors.custom_purpose && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.custom_purpose}</span>}
                  </div>
                )}
              </div>
            </div>

            {hasPendingRequest && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 0.5rem 0' }}>
                  <AlertTriangle size={18} /> Request Already Pending
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#ef4444', margin: 0, lineHeight: '1.5' }}>
                  There is already an active, unprocessed request for this exact document. Please wait for it to be processed before requesting another copy.
                </p>
              </div>
            )}

            {isDuplicate && !hasPendingRequest && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem 0' }}>
                  <AlertTriangle size={18} /> Early Renewal / Prior Request
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '1rem', lineHeight: '1.5' }}>
                  There is already an active copy of this document valid until <strong>{previousDocInfo?.calculated_expiry?.toLocaleDateString()}</strong>. 
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
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    
                    <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: '6px', color: '#f59e0b' }}>
                      <Upload size={16} /> Choose File
                      <input type="file" accept=".pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>

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

        {/* --- ERROR DISPLAY --- */}
        {errors.submit && <div style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{errors.submit}</div>}

        {/* --- ACTIONS & RESIDENT AGREEMENT CHECKBOX --- */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          
          {/* ONLY SHOW CHECKBOX IF IT IS A RESIDENT LOGGED IN */}
          {residentData && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '600px', padding: '10px 15px', background: 'var(--surface)', border: `1px solid ${errors.isAgreed ? '#ef4444' : 'var(--border)'}`, borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                id="isAgreed" 
                name="isAgreed" 
                checked={formData.isAgreed} 
                onChange={handleChange} 
                style={{ marginTop: '3px', transform: 'scale(1.2)', cursor: 'pointer', accentColor: 'var(--primary-600)' }} 
              />
              <label htmlFor="isAgreed" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.4', margin: 0 }}>
                I hereby declare that all information provided in this request is true, correct, and complete to the best of my knowledge. I understand that submitting false or misleading information may result in the rejection of this request.
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
              <X size={20} /> Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              // Disable if loading, pending, or if Resident mode and not agreed
              disabled={loading || hasPendingRequest || (residentData && !formData.isAgreed)} 
            >
              {loading ? <><div className="spinner-small"></div>Submitting...</> : <><Save size={20} />Submit Request</>}
            </button>
          </div>
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