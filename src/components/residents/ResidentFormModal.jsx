import React, { useState } from 'react';
import { X, Save, User, Upload, Camera, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast'; 

const InputHint = ({ text }) => (
  <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
    {text}
  </small>
);

const ResidentFormModal = ({
  editingResident,
  formData,
  errors = {},
  loading,
  maxDate,
  minDate,
  maxDate16,
  isUnderage,
  handleInputChange,
  handleImageUpload,
  handleProofUpload,
  handleValidIdUpload,
  setActiveCamera,
  handleSubmit,
  closeModal,
  isPublic = false // <--- PROP FOR PUBLIC REGISTRATION
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const validateCurrentStep = () => {
    let missingFields = [];
    let firstMissingName = null;

    if (currentStep === 1) {
      if (!formData.first_name?.trim()) { missingFields.push("First Name"); firstMissingName = "first_name"; }
      if (!formData.last_name?.trim()) { missingFields.push("Last Name"); firstMissingName = firstMissingName || "last_name"; }
      
      if (!formData.date_of_birth) { 
        missingFields.push("Date of Birth"); 
        firstMissingName = firstMissingName || "date_of_birth"; 
      } else {
        const dob = new Date(formData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        
        if (age <= 4) {
          toast.error("Registration blocked: Resident must be older than 4 years old.");
          document.querySelector('[name="date_of_birth"]')?.focus();
          return false;
        }
      }

      if (!formData.gender?.trim()) { missingFields.push("Gender"); firstMissingName = firstMissingName || "gender"; }
      if (!isUnderage && !formData.civil_status?.trim()) { missingFields.push("Civil Status"); firstMissingName = firstMissingName || "civil_status"; }
    } 
    else if (currentStep === 2) {
      if (!formData.full_address?.trim()) { missingFields.push("Full Address"); firstMissingName = "full_address"; }
      if (!formData.residency_type?.trim()) { missingFields.push("Residency Type"); firstMissingName = firstMissingName || "residency_type"; } 
      
      if (!formData.mobile_number?.trim()) { 
        missingFields.push("Mobile Number"); 
        firstMissingName = firstMissingName || "mobile_number"; 
      } else if (formData.mobile_number.trim().length < 11) {
        toast.error("Mobile Number must be exactly 11 digits.");
        document.querySelector('[name="mobile_number"]')?.focus();
        return false;
      }

      if (!formData.email?.trim()) {
        missingFields.push("Email Address");
        firstMissingName = firstMissingName || "email";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          toast.error("Please enter a valid email address.");
          document.querySelector('[name="email"]')?.focus();
          return false;
        }
      }
    }
    else if (currentStep === 3) {
      const residentDOB = new Date(formData.date_of_birth);
      const maxValidParentDOB = new Date(residentDOB);
      maxValidParentDOB.setFullYear(maxValidParentDOB.getFullYear() - 12);

      if (!formData.father_deceased && formData.father_birthdate) {
        const fatherDOB = new Date(formData.father_birthdate);
        if (fatherDOB > maxValidParentDOB) {
          toast.error("Invalid Age: Father must be at least 12 years older than the resident.");
          document.querySelector('[name="father_birthdate"]')?.focus();
          return false;
        }
      }

      if (!formData.mother_deceased && formData.mother_birthdate) {
        const motherDOB = new Date(formData.mother_birthdate);
        if (motherDOB > maxValidParentDOB) {
          toast.error("Invalid Age: Mother must be at least 12 years older than the resident.");
          document.querySelector('[name="mother_birthdate"]')?.focus();
          return false;
        }
      }
    }

    if (missingFields.length > 0) {
      toast.error(`Required: ${missingFields.join(', ')}`);
      if (firstMissingName) {
        const errorElement = document.querySelector(`[name="${firstMissingName}"]`);
        if (errorElement) errorElement.focus();
      }
      return false; 
    }
    return true; 
  };

  const nextStep = () => { if (validateCurrentStep()) setCurrentStep(prev => Math.min(prev + 1, totalSteps)); };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // --- DYNAMIC WRAPPER FOR PUBLIC VS ADMIN ---
  const WrapperClass = isPublic ? 'login-card' : 'modal modal-large';
  const WrapperStyle = isPublic ? { maxWidth: '800px', width: '100%', padding: '2rem', margin: '0 auto', zIndex: 10 } : {};

  return (
    <div className={!isPublic ? "modal-overlay" : ""} onClick={!isPublic ? closeModal : undefined} style={isPublic ? { width: '100%', display: 'flex', justifyContent: 'center'} : {}}>
      <div className={WrapperClass} style={WrapperStyle} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={isPublic ? { fontSize: '1.8rem', color: 'var(--primary-700)' } : {}}>
              {isPublic ? 'Complete Registration Profile' : (editingResident ? 'Edit Resident Profile' : 'Add New Resident')}
            </h2>
            {!isPublic && <button type="button" className="btn-icon" onClick={closeModal}><X size={20} /></button>}
          </div>
          
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neutral-100)', padding: '10px 15px', borderRadius: '8px' }}>
            <span style={{ fontWeight: currentStep >= 1 ? 'bold' : 'normal', color: currentStep >= 1 ? 'var(--primary-700)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>1. Personal Info</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
            <span style={{ fontWeight: currentStep >= 2 ? 'bold' : 'normal', color: currentStep >= 2 ? 'var(--primary-700)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>2. Address</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
            <span style={{ fontWeight: currentStep >= 3 ? 'bold' : 'normal', color: currentStep >= 3 ? 'var(--primary-700)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>3. Family</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
            <span style={{ fontWeight: currentStep >= 4 ? 'bold' : 'normal', color: currentStep >= 4 ? 'var(--primary-700)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>4. Verifications</span>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentStep < totalSteps) nextStep();
          else handleSubmit(e);
        }}>
          <div className="modal-body" style={{ maxHeight: isPublic ? '55vh' : '65vh', overflowY: 'auto', padding: '20px' }}>
            
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Photo & Personal Information</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '20px', background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px' }}>
                    {formData.photo_url || formData.photoPreview ? (
                      <img src={formData.photoPreview || formData.photo_url} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
                        <User size={32} color="var(--neutral-400)"/>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Upload size={16} /> Upload Image
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>Max size: 2MB. JPG, PNG accepted.</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group"><label>First Name *</label><input type="text" name="first_name" value={formData.first_name || ''} onChange={handleInputChange} required /></div>
                    <div className="form-group"><label>Middle Name</label><input type="text" name="middle_name" value={formData.middle_name || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Last Name *</label><input type="text" name="last_name" value={formData.last_name || ''} onChange={handleInputChange} required /></div>
                    <div className="form-group"><label>Suffix</label><input type="text" name="suffix" value={formData.suffix || ''} onChange={handleInputChange} placeholder="e.g. Jr." /></div>
                    <div className="form-group"><label>Date of Birth *</label><input type="date" name="date_of_birth" max={maxDate} min={minDate} value={formData.date_of_birth || ''} onChange={handleInputChange} required /></div>
                    <div className="form-group"><label>Place of Birth</label><input type="text" name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Gender *</label><select name="gender" value={formData.gender || ''} onChange={handleInputChange} required><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    <div className="form-group"><label>Civil Status *</label><select name="civil_status" value={formData.civil_status || ''} onChange={handleInputChange} disabled={isUnderage} required={!isUnderage}><option value="">Select status</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option><option value="Separated">Separated</option></select></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Address & Contact Details</h3>
                  <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Full Address *</label><input type="text" name="full_address" value={formData.full_address || ''} onChange={handleInputChange} required /></div>
                    
                    {/* --- FIXED PUROK LIST HERE --- */}
                    <div className="form-group">
                      <label>Purok/Zone *</label>
                      <select name="purok" value={formData.purok || 'Purok 1'} onChange={handleInputChange} required>
                        <option value="Purok 1">Purok 1</option>
                        <option value="Purok 2">Purok 2</option>
                        <option value="Purok 3">Purok 3</option>
                        <option value="Purok 4">Purok 4</option>
                        <option value="Purok 5">Purok 5</option>
                        <option value="Purok 6">Purok 6</option>
                        <option value="Purok 7">Purok 7</option>
                        <option value="Pabahay Phase 1">Pabahay Phase 1</option>
                        <option value="Pabahay Phase 2">Pabahay Phase 2</option>
                        <option value="Pabahay Phase 3">Pabahay Phase 3</option>
                      </select>
                    </div>

                    <div className="form-group"><label>Residency Type *</label><select name="residency_type" value={formData.residency_type || 'Permanent'} onChange={handleInputChange} required><option value="Permanent">Permanent</option><option value="Tenant">Tenant</option><option value="Boarder">Boarder</option></select></div>
                    <div className="form-group"><label>Mobile Number *</label><input type="tel" name="mobile_number" value={formData.mobile_number || ''} onChange={handleInputChange} required placeholder="09xxxxxxxxx" /></div>
                    <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} required placeholder="juan@gmail.com" /></div>
                  </div>
                  
                  {/* PROOF OF RESIDENCY */}
                  <div className="form-group" style={{ background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>Proof of Residency (Utility Bill, Lease)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '10px' }}>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={16} /> Attach File
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleProofUpload} />
                      </label>
                      {formData.proof_of_residency_url ? (
                        <span className="badge badge-success"><CheckCircle size={14} /> Attached</span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No file chosen (Max 5MB)</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Family Information</h3>
                  <div style={{ background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Father's Info</h4>
                    <div className="form-grid"><div className="form-group"><label>Full Name</label><input type="text" name="father_first_name" value={formData.father_first_name || ''} onChange={handleInputChange} /></div><div className="form-group"><label>Contact</label><input type="tel" name="father_phone_number" value={formData.father_phone_number || ''} onChange={handleInputChange} /></div></div>
                  </div>
                  <div style={{ background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Mother's Info</h4>
                    <div className="form-grid"><div className="form-group"><label>Maiden Name</label><input type="text" name="mother_first_name" value={formData.mother_first_name || ''} onChange={handleInputChange} /></div><div className="form-group"><label>Contact</label><input type="tel" name="mother_phone_number" value={formData.mother_phone_number || ''} onChange={handleInputChange} /></div></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 4 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Identifications & Verifications</h3>
                  
                  <div className="form-group" style={{ background: 'var(--neutral-50)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '1rem' }}>Attach Valid ID (National ID, Passport) *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '10px' }}>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={16} /> Upload ID
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleValidIdUpload} />
                      </label>
                      {(formData.id_image_url || formData.idPreview) ? (
                        <span className="badge badge-success"><CheckCircle size={16} /> ID Attached</span>
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Required for Registration</span>
                      )}
                    </div>
                  </div>

                  <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="checkbox-label"><input type="checkbox" name="voter_status" checked={formData.voter_status || false} onChange={handleInputChange} /><span>Registered Voter</span></label>
                    <label className="checkbox-label"><input type="checkbox" name="pwd_status" checked={formData.pwd_status || false} onChange={handleInputChange} /><span>PWD</span></label>
                    <label className="checkbox-label"><input type="checkbox" name="senior_citizen" checked={formData.senior_citizen || false} onChange={handleInputChange} /><span>Senior Citizen</span></label>
                  </div>

                  {/* DATA PRIVACY CONSENT (ONLY SHOWS FOR PUBLIC REGISTRATION) */}
                  {isPublic && (
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          name="data_privacy_consent"
                          checked={formData.data_privacy_consent || false}
                          onChange={handleInputChange}
                          style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                          <strong>Data Privacy Consent:</strong> I agree to the collection and processing of my personal data by Barangay Dos in accordance with the Data Privacy Act of 2012 (RA 10173). I understand this data will be used strictly for verification purposes.
                        </span>
                      </label>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            {currentStep > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={prevStep}><ChevronLeft size={20} /> Back</button>
            ) : (
              isPublic ? 
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel Registration</button> :
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            )}

            {currentStep < totalSteps ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>Next Step <ChevronRight size={20} /></button>
            ) : (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSubmit} 
                disabled={loading || (isPublic && !formData.data_privacy_consent)} 
                style={{ 
                  background: (isPublic && !formData.data_privacy_consent) ? '#94a3b8' : '#10b981', 
                  borderColor: (isPublic && !formData.data_privacy_consent) ? '#94a3b8' : '#10b981',
                  cursor: (isPublic && !formData.data_privacy_consent) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? <><div className="spinner-small"></div>Submitting...</> : <><Save size={20} /> Submit Registration</>}
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};

export default ResidentFormModal;