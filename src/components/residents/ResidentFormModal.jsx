import React, { useState } from 'react';
import { X, Save, User, Upload, Camera, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const InputHint = ({ text }) => (
  <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
    {text}
  </small>
);

const ResidentFormModal = ({
  editingResident,
  formData,
  errors,
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
  closeModal
}) => {
  // --- SENIOR FRIENDLY: MULTI-STEP WIZARD STATE ---
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{editingResident ? 'Edit Resident Profile' : 'Add New Resident'}</h2>
            <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
          </div>
          
          {/* STEPPER PROGRESS BAR */}
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '20px' }}>
            
            {/* ================= STEP 1: PERSONAL INFO ================= */}
            {currentStep === 1 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Photo & Personal Information</h3>
                  
                  {/* Photo Upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '20px', background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px' }}>
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
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
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('photo')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Camera size={16} /> Take Photo
                        </button>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>Max size: 2MB. JPG, PNG accepted.</p>
                    </div>
                  </div>

                  {/* Personal Inputs */}
                  <div className="form-grid">
                    <div className={`form-group ${errors.first_name ? 'has-error' : ''}`}>
                      <label>First Name *</label>
                      <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required maxLength="50" placeholder="e.g. Juan" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                      {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Santos" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                    </div>
                    <div className={`form-group ${errors.last_name ? 'has-error' : ''}`}>
                      <label>Last Name *</label>
                      <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required maxLength="50" placeholder="e.g. Dela Cruz" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                      {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                    </div>
                    <div className="form-group">
                      <label>Suffix</label>
                      <input type="text" name="suffix" value={formData.suffix} onChange={handleInputChange} maxLength="10" placeholder="e.g. Jr., Sr., III" />
                    </div>
                    <div className={`form-group ${errors.date_of_birth ? 'has-error' : ''}`}>
                      <label>Date of Birth *</label>
                      <input type="date" name="date_of_birth" max={maxDate} min={minDate} value={formData.date_of_birth} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label>Place of Birth</label>
                      <input type="text" name="place_of_birth" value={formData.place_of_birth} onChange={handleInputChange} maxLength="100" placeholder="e.g. Calamba City" />
                    </div>
                    <div className="form-group">
                      <label>Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Civil Status *</label>
                      <select name="civil_status" value={formData.civil_status} onChange={handleInputChange} required disabled={isUnderage}>
                        <option value="">Select status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Blood Type</label>
                      <select name="blood_type" value={formData.blood_type} onChange={handleInputChange}>
                        <option value="">Select Type</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Religion</label>
                      <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} maxLength="50" placeholder="e.g. Roman Catholic" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: ADDRESS & CONTACT ================= */}
            {currentStep === 2 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Address & Contact Details</h3>
                  
                  <div className="form-grid">
                    <div className={`form-group ${errors.full_address ? 'has-error' : ''}`} style={{ gridColumn: '1 / -1' }}>
                      <label>Full Address (House No., Street, Subdivision/Village) *</label>
                      <input type="text" name="full_address" value={formData.full_address} onChange={handleInputChange} required maxLength="150" placeholder="e.g. Blk 1 Lot 2, San Jose St., Phase 3" />
                      <InputHint text="Exclude Barangay, City, Province." />
                    </div>
                    <div className="form-group">
                      <label>Purok/Zone</label>
                      <input type="text" name="purok" value={formData.purok} onChange={handleInputChange} maxLength="20" placeholder="e.g. Purok 1" />
                    </div>
                    <div className="form-group">
                      <label>Zip Code</label>
                      <input type="text" name="zip_code" value={formData.zip_code} onChange={handleInputChange} maxLength="4" pattern="[0-9]{4}" placeholder="e.g. 4027" title="Must be a 4-digit number" />
                    </div>
                    <div className="form-group">
                      <label>Date Started Residing</label>
                      <input type="date" name="residency_start_date" max={maxDate} min={minDate} value={formData.residency_start_date} onChange={handleInputChange} />
                    </div>
                    
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px' }}>
                      <label style={{ fontWeight: 'bold' }}>Proof of Residency (Utility Bill, Lease)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '10px' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                          <Upload size={16} /> Attach File
                          <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleProofUpload} />
                        </label>
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('proof')} style={{ margin: 0 }}>
                          <Camera size={16} /> Take Photo
                        </button>
                        {formData.proof_of_residency_url ? (
                          <span className="badge badge-success"><CheckCircle size={14} /> Attached</span>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No file chosen (Max 5MB)</span>
                        )}
                      </div>
                    </div>

                    <div className={`form-group ${errors.mobile_number ? 'has-error' : ''}`}>
                      <label>Mobile Number *</label>
                      <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} required maxLength="11" pattern="09[0-9]{9}" placeholder="e.g. 09123456789" title="Must be an 11-digit number starting with 09" />
                    </div>
                    <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                      <label>Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} maxLength="100" placeholder="e.g. juan@example.com" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3: PARENTS & FAMILY ================= */}
            {currentStep === 3 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Parents & Family Information</h3>
                  
                  {/* FATHER */}
                  <div style={{ background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Father's Info</h4>
                    <label className="checkbox-label" style={{ marginBottom: '10px' }}>
                      <input type="checkbox" name="father_deceased" checked={formData.father_deceased} onChange={handleInputChange} />
                      <span>Check if Deceased (Disables contact details)</span>
                    </label>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group"><label>First Name</label><input type="text" name="father_first_name" value={formData.father_first_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Middle Name</label><input type="text" name="father_middle_name" value={formData.father_middle_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Last Name</label><input type="text" name="father_last_name" value={formData.father_last_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Suffix</label><input type="text" name="father_suffix" value={formData.father_suffix} onChange={handleInputChange} maxLength="10" /></div>
                    </div>
                    <div className="form-grid">
                      <div className="form-group"><label>Occupation</label><input type="text" name="father_occupation" value={formData.father_occupation} onChange={handleInputChange} disabled={formData.father_deceased} /></div>
                      <div className="form-group"><label>Contact Number</label><input type="tel" name="father_phone_number" value={formData.father_phone_number} onChange={handleInputChange} disabled={formData.father_deceased} /></div>
                      <div className="form-group"><label>Birthdate</label><input type="date" name="father_birthdate" max={maxDate16} min={minDate} value={formData.father_birthdate} onChange={handleInputChange} disabled={formData.father_deceased} /></div>
                      <div className="form-group"><label>Age</label><input type="number" name="father_age" value={formData.father_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" /></div>
                      <div className="form-group"><label>Religion</label><input type="text" name="father_religion" value={formData.father_religion} onChange={handleInputChange} /></div>
                      <div className="form-group"><label>Nationality</label><input type="text" name="father_nationality" value={formData.father_nationality} onChange={handleInputChange} /></div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Current Address</label><input type="text" name="father_address" value={formData.father_address} onChange={handleInputChange} disabled={formData.father_deceased} /></div>
                    </div>
                  </div>

                  {/* MOTHER */}
                  <div style={{ background: 'var(--neutral-50)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Mother's Info</h4>
                    <label className="checkbox-label" style={{ marginBottom: '10px' }}>
                      <input type="checkbox" name="mother_deceased" checked={formData.mother_deceased} onChange={handleInputChange} />
                      <span>Check if Deceased (Disables contact details)</span>
                    </label>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group"><label>Maiden First Name</label><input type="text" name="mother_first_name" value={formData.mother_first_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Middle Name</label><input type="text" name="mother_middle_name" value={formData.mother_middle_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Maiden Last Name</label><input type="text" name="mother_last_name" value={formData.mother_last_name} onChange={handleInputChange} maxLength="50" /></div>
                      <div className="form-group"><label>Suffix</label><input type="text" name="mother_suffix" value={formData.mother_suffix} onChange={handleInputChange} maxLength="10" /></div>
                    </div>
                    <div className="form-grid">
                      <div className="form-group"><label>Occupation</label><input type="text" name="mother_occupation" value={formData.mother_occupation} onChange={handleInputChange} disabled={formData.mother_deceased} /></div>
                      <div className="form-group"><label>Contact Number</label><input type="tel" name="mother_phone_number" value={formData.mother_phone_number} onChange={handleInputChange} disabled={formData.mother_deceased} /></div>
                      <div className="form-group"><label>Birthdate</label><input type="date" name="mother_birthdate" max={maxDate16} min={minDate} value={formData.mother_birthdate} onChange={handleInputChange} disabled={formData.mother_deceased} /></div>
                      <div className="form-group"><label>Age</label><input type="number" name="mother_age" value={formData.mother_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" /></div>
                      <div className="form-group"><label>Religion</label><input type="text" name="mother_religion" value={formData.mother_religion} onChange={handleInputChange} /></div>
                      <div className="form-group"><label>Nationality</label><input type="text" name="mother_nationality" value={formData.mother_nationality} onChange={handleInputChange} /></div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Current Address</label><input type="text" name="mother_address" value={formData.mother_address} onChange={handleInputChange} disabled={formData.mother_deceased} /></div>
                    </div>
                  </div>

                  {/* SPOUSE & EMERGENCY */}
                  <div className="form-grid">
                    <div className="form-group"><label>Spouse's Name</label><input type="text" name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} disabled={isUnderage} /></div>
                    <div className="form-group"><label>Spouse's Occupation</label><input type="text" name="spouse_occupation" value={formData.spouse_occupation} onChange={handleInputChange} disabled={isUnderage} /></div>
                    <div className="form-group"><label>Spouse's Birthdate</label><input type="date" name="spouse_birthdate" max={maxDate16} min={minDate} value={formData.spouse_birthdate || ''} onChange={handleInputChange} disabled={isUnderage} /></div>
                    <div className="form-group"><label>Spouse's Age</label><input type="number" name="spouse_age" value={formData.spouse_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" /></div>
                    
                    <div className="form-group"><label>No. of Children</label><input type="number" name="number_of_children" value={formData.number_of_children ?? ''} onChange={handleInputChange} min="0" /></div>
                    <div className="form-group">
                      <label>Educational Attainment</label>
                      <select name="educational_attainment" value={formData.educational_attainment} onChange={handleInputChange}>
                        <option value="">Select Attainment</option>
                        <option value="Elementary Level">Elementary Level</option>
                        <option value="Elementary Graduate">Elementary Graduate</option>
                        <option value="High School Level">High School Level</option>
                        <option value="High School Graduate">High School Graduate</option>
                        <option value="College Level">College Level</option>
                        <option value="College Graduate">College Graduate</option>
                        <option value="Post-Graduate">Post-Graduate</option>
                        <option value="Vocational">Vocational</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Emergency Contact Name</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} /></div>
                    <div className="form-group"><label>Emergency Contact No.</label><input type="tel" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleInputChange} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 4: IDs & STATUS ================= */}
            {currentStep === 4 && (
              <div className="wizard-step animation-fade-in">
                <div className="form-section" style={{ border: 'none', padding: 0 }}>
                  <h3 style={{ color: 'var(--primary-700)', marginBottom: '15px' }}>Identifications & Verifications</h3>
                  
                  <div className="form-group" style={{ background: 'var(--neutral-50)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '1rem' }}>Attach Valid ID (National ID, Passport, etc.)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '10px' }}>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={16} /> Attach Valid ID
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleValidIdUpload} />
                      </label>
                      <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('valid_id')} style={{ margin: 0 }}>
                        <Camera size={16} /> Take Photo
                      </button>
                      {formData.valid_id_url ? (
                        <span className="badge badge-success" style={{ fontSize: '14px' }}><CheckCircle size={16} /> ID Attached</span>
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No file chosen (Max 5MB)</span>
                      )}
                    </div>
                  </div>

                  <label style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px' }}>Special Status Checkboxes</label>
                  <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label className="checkbox-label" style={{ fontSize: '1rem', padding: '10px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" name="voter_status" checked={formData.voter_status} onChange={handleInputChange} />
                      <span>Registered Voter</span>
                    </label>
                    <label className="checkbox-label" style={{ fontSize: '1rem', padding: '10px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" name="pwd_status" checked={formData.pwd_status} onChange={handleInputChange} />
                      <span>Person with Disability (PWD)</span>
                    </label>
                    <label className="checkbox-label" style={{ fontSize: '1rem', padding: '10px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" name="senior_citizen" checked={formData.senior_citizen} onChange={handleInputChange} />
                      <span>Senior Citizen</span>
                    </label>
                    <label className="checkbox-label" style={{ fontSize: '1rem', padding: '10px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" name="other_id_status" checked={formData.other_id_status} onChange={handleInputChange} />
                      <span>Other ID (Barangay ID, Postal, etc.)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= FOOTER CONTROLS ================= */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* Back Button */}
            {currentStep > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={prevStep}>
                <ChevronLeft size={20} /> Back
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            )}

            {/* Next / Submit Button */}
            {currentStep < totalSteps ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                Next Step <ChevronRight size={20} />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#10b981', borderColor: '#10b981' }}>
                {loading ? (
                  <><div className="spinner-small"></div>Saving...</>
                ) : (
                  <><Save size={20} />{editingResident ? 'Update Resident' : 'Save Resident'}</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResidentFormModal;