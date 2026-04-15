import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { User, Lock, Save, Shield, MapPin, Users, CheckCircle, Upload, FileCheck, ShieldAlert, ShieldCheck, AlertCircle, Image as ImageIcon, FileText, Camera, UserCheck } from 'lucide-react';
import imageCompression from 'browser-image-compression';

// Helper for age calculation
const calculateAge = (dob) => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const ResidentProfileTab = ({ user, setUser }) => {
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Profile State Expanded
  const [profileData, setProfileData] = useState({
    photo_url: user?.photo_url || '',
    first_name: user?.first_name || '',
    middle_name: user?.middle_name || '',
    last_name: user?.last_name || '',
    suffix: user?.suffix || '',
    date_of_birth: user?.date_of_birth || '',
    place_of_birth: user?.place_of_birth || '',
    gender: user?.gender || '',
    civil_status: user?.civil_status || '',
    full_address: user?.full_address || '',
    purok: user?.purok || 'Purok 1',
    residency_type: user?.residency_type || 'Permanent',
    mobile_number: user?.mobile_number || '',
    
    // Family
    father_first_name: user?.father_first_name || '',
    father_phone_number: user?.father_phone_number || '',
    mother_first_name: user?.mother_first_name || '',
    mother_phone_number: user?.mother_phone_number || '',
    
    // Verifications (Read-only for resident)
    voter_status: user?.voter_status || false,
    pwd_status: user?.pwd_status || false,
    senior_citizen: user?.senior_citizen || false,
    
    // Identity Documents
    id_type: user?.id_type || '', 
    id_image_url: user?.id_image_url || '', 
    id_image_back_url: user?.id_image_back_url || '', 
    proof_of_residency_url: user?.proof_of_residency_url || '',
    liveness_image_url: user?.liveness_image_url || ''
  });

  const isUnderage = calculateAge(profileData.date_of_birth) < 16;

  // Password State
  const [passwords, setPasswords] = useState({
    new_password: '',
    confirm_password: ''
  });

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  // --- CHECKLIST LOGIC ---
  const hasPhoto = !!profileData.photo_url;
  const hasID = !!profileData.id_type && !!profileData.id_image_url && !!profileData.id_image_back_url;
  const hasProof = !!profileData.proof_of_residency_url;
  const hasLiveness = !!profileData.liveness_image_url; 
  const isVerified = user?.is_verified;
  
  const docsComplete = hasPhoto && hasID && hasProof && hasLiveness;

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    const capitalizeFields = ['first_name', 'middle_name', 'last_name', 'place_of_birth', 'full_address', 'father_first_name', 'mother_first_name'];
    if (capitalizeFields.includes(name) && typeof newValue === 'string') {
      newValue = newValue.replace(/\b\w/g, char => char.toUpperCase());
    }

    setProfileData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'date_of_birth') {
        const age = calculateAge(newValue);
        if (age < 16) updated.civil_status = 'Single';
      }
      return updated;
    });
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) { 
      return toast.error("File is too large! Please upload a file under 15MB.");
    }

    const toastId = toast.loading('Optimizing and attaching document...');

    try {
      const options = {
        maxSizeMB: fieldName === 'photo_url' ? 0.2 : 0.5, 
        maxWidthOrHeight: 1200,
        useWebWorker: true
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, [fieldName]: reader.result }));
        toast.success("Document attached! Remember to save your profile.", { id: toastId });
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to optimize document.", { id: toastId });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      return toast.error("Passwords do not match!");
    }
    if (passwords.new_password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }

    setPassLoading(true);
    const toastId = toast.loading("Updating password...");

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new_password
      });

      if (error) throw error;

      toast.success("Password updated successfully!", { id: toastId });
      setPasswords({ new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setPassLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (profileData.mobile_number && profileData.mobile_number.trim().length < 11) {
      return toast.error("Mobile Number must be at least 11 digits.");
    }

    setLoading(true);
    const toastId = toast.loading("Saving profile to Barangay Records...");

    try {
      const updatePayload = { ...profileData };
      
      // Prevent residents from bypassing admin verification for special statuses
      delete updatePayload.voter_status;
      delete updatePayload.pwd_status;
      delete updatePayload.senior_citizen;

      let justSubmittedForReview = false;

      if (docsComplete && !isVerified && user.account_status !== 'Pending') {
        updatePayload.account_status = 'Pending'; 
        justSubmittedForReview = true;
      }

      const { data, error } = await supabase
        .from('residents')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedUser = { ...user, ...data };
      localStorage.setItem('resident_session', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Dynamic Success Prompt
      if (justSubmittedForReview || (docsComplete && !isVerified)) {
        toast.success(
          "Profile updated! Your verification documents are now under review by the official staff.", 
          { id: toastId, duration: 6000, icon: '⏳' }
        );
      } else {
        toast.success("Profile updated successfully!", { id: toastId });
      }
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.95rem', transition: 'border-color 0.2s', outline: 'none' };
  const labelStyle = { display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', color: '#475569' };
  const cardStyle = { background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  const sectionHeaderStyle = { marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.1rem' };

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {profileData.photo_url ? (
            <img src={profileData.photo_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              {user?.first_name?.charAt(0) || 'R'}
            </div>
          )}
          <div>
            <h1 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '1.8rem' }}>My Profile</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage your personal records and account verification.</p>
          </div>
        </div>
      </div>

      {/* VERIFICATION TRACKER BANNER */}
      <div style={{ ...cardStyle, background: isVerified ? '#ecfdf5' : '#f8fafc', borderColor: isVerified ? '#a7f3d0' : '#e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
          <div style={{ marginTop: '5px' }}>
            {isVerified ? <ShieldCheck size={32} color="#10b981" /> : <ShieldAlert size={32} color="#f59e0b" />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: isVerified ? '#065f46' : '#1e293b', fontSize: '1.2rem' }}>
              {isVerified ? 'Account is Fully Verified' : 'Account Verification Required'}
            </h3>
            <p style={{ margin: '0 0 15px 0', color: isVerified ? '#047857' : '#64748b', fontSize: '0.95rem' }}>
              {isVerified 
                ? 'Your identity has been confirmed by the Barangay. You have full access to Document Requests, Equipment Borrowing, and Reporting.' 
                : 'To access restricted features, you must complete your profile and upload the 4 required documents below for Admin review.'}
            </p>
            
            {/* Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasPhoto ? '#10b981' : '#94a3b8', fontWeight: hasPhoto ? '600' : 'normal' }}>
                {hasPhoto ? <CheckCircle size={18} /> : <div style={{width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #cbd5e1'}} />}
                Clean Profile Photo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasID ? '#10b981' : '#94a3b8', fontWeight: hasID ? '600' : 'normal' }}>
                {hasID ? <CheckCircle size={18} /> : <div style={{width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #cbd5e1'}} />}
                Valid ID (Front & Back)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasProof ? '#10b981' : '#94a3b8', fontWeight: hasProof ? '600' : 'normal' }}>
                {hasProof ? <CheckCircle size={18} /> : <div style={{width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #cbd5e1'}} />}
                Proof of Residency
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLiveness ? '#10b981' : '#94a3b8', fontWeight: hasLiveness ? '600' : 'normal' }}>
                {hasLiveness ? <CheckCircle size={18} /> : <div style={{width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #cbd5e1'}} />}
                Liveness Check (Selfie + ID)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isVerified ? '#10b981' : (docsComplete ? '#f59e0b' : '#94a3b8'), fontWeight: isVerified ? '600' : 'normal' }}>
                {isVerified ? <CheckCircle size={18} /> : (docsComplete ? <AlertCircle size={18} /> : <div style={{width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #cbd5e1'}} />)}
                {isVerified ? 'Approved by Admin' : (docsComplete ? 'Pending Admin Review' : 'Awaiting Uploads')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: MAIN FORM */}
        <div style={{ flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* PERSONAL INFO CARD */}
            <div style={cardStyle}>
              <h3 style={sectionHeaderStyle}><User size={20} color="var(--primary-600)" /> Personal Information</h3>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <div style={{ flex: 2, minWidth: '120px' }}><label style={labelStyle}>First Name *</label><input type="text" name="first_name" value={profileData.first_name} onChange={handleProfileChange} required style={inputStyle} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={labelStyle}>Middle Name</label><input type="text" name="middle_name" value={profileData.middle_name} onChange={handleProfileChange} style={inputStyle} /></div>
                <div style={{ flex: 2, minWidth: '120px' }}><label style={labelStyle}>Last Name *</label><input type="text" name="last_name" value={profileData.last_name} onChange={handleProfileChange} required style={inputStyle} /></div>
                <div style={{ flex: 1, minWidth: '70px' }}><label style={labelStyle}>Suffix</label><input type="text" name="suffix" value={profileData.suffix} onChange={handleProfileChange} placeholder="e.g. Jr." style={inputStyle} /></div>
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={labelStyle}>Date of Birth *</label>
                  <input type="date" name="date_of_birth" value={profileData.date_of_birth} onChange={handleProfileChange} max={new Date().toISOString().split("T")[0]} required style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={labelStyle}>Place of Birth</label>
                  <input type="text" name="place_of_birth" value={profileData.place_of_birth} onChange={handleProfileChange} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={labelStyle}>Gender *</label>
                  <select name="gender" value={profileData.gender} onChange={handleProfileChange} required style={inputStyle}>
                    <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={labelStyle}>Civil Status *</label>
                  <select name="civil_status" value={profileData.civil_status} onChange={handleProfileChange} disabled={isUnderage} required={!isUnderage} style={inputStyle}>
                    <option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option><option value="Separated">Separated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ADDRESS & CONTACT CARD */}
            <div style={cardStyle}>
              <h3 style={sectionHeaderStyle}><MapPin size={20} color="var(--primary-600)" /> Address & Contact</h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <div style={{ flex: 3, minWidth: '200px' }}>
                  <label style={labelStyle}>Full Address *</label>
                  <input type="text" name="full_address" value={profileData.full_address} onChange={handleProfileChange} placeholder="House/Block/Lot No., Street" required style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={labelStyle}>Purok/Zone *</label>
                  <select name="purok" value={profileData.purok} onChange={handleProfileChange} required style={inputStyle}>
                    <option value="Purok 1">Purok 1</option><option value="Purok 2">Purok 2</option><option value="Purok 3">Purok 3</option><option value="Purok 4">Purok 4</option><option value="Purok 5">Purok 5</option><option value="Purok 6">Purok 6</option><option value="Purok 7">Purok 7</option><option value="Pabahay Phase 1">Pabahay Phase 1</option><option value="Pabahay Phase 2">Pabahay Phase 2</option><option value="Pabahay Phase 3">Pabahay Phase 3</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={labelStyle}>Residency Type *</label>
                  <select name="residency_type" value={profileData.residency_type} onChange={handleProfileChange} required style={inputStyle}>
                    <option value="Permanent">Permanent</option><option value="Tenant">Tenant</option><option value="Boarder">Boarder</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={labelStyle}>Mobile Number *</label>
                  <input type="tel" name="mobile_number" value={profileData.mobile_number} onChange={handleProfileChange} placeholder="09xxxxxxxxx" required style={inputStyle} />
                </div>
              </div>
            </div>

            {/* FAMILY INFO CARD */}
            <div style={cardStyle}>
              <h3 style={sectionHeaderStyle}><Users size={20} color="var(--primary-600)" /> Family Information</h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={labelStyle}>Father's Full Name</label>
                  <input type="text" name="father_first_name" value={profileData.father_first_name} onChange={handleProfileChange} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={labelStyle}>Father's Contact</label>
                  <input type="tel" name="father_phone_number" value={profileData.father_phone_number} onChange={handleProfileChange} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={labelStyle}>Mother's Maiden Name</label>
                  <input type="text" name="mother_first_name" value={profileData.mother_first_name} onChange={handleProfileChange} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={labelStyle}>Mother's Contact</label>
                  <input type="tel" name="mother_phone_number" value={profileData.mother_phone_number} onChange={handleProfileChange} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '14px 24px', fontSize: '1.05rem', minWidth: '200px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Save size={20} /> {loading ? "Saving Records..." : "Save Profile Updates"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: DOCUMENTS & SECURITY */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* VERIFICATION DOCUMENTS CARD */}
          <div style={{ ...cardStyle, border: '2px solid var(--primary-100)' }}>
            <h3 style={sectionHeaderStyle}><FileCheck size={20} color="var(--primary-600)" /> Verification Documents</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Please upload clear images of your documents to get your account verified.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Profile Photo (Headshot) */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16}/> 1. Profile Photo</label>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>A clean headshot for your Digital ID.</span>
                  </div>
                  {hasPhoto && <CheckCircle size={18} color="#10b981" />}
                </div>
                <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px', cursor: 'pointer', background: '#fff' }}>
                  <Upload size={16} /> {hasPhoto ? 'Replace Photo' : 'Upload Headshot'}
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Valid ID Section */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}><ImageIcon size={16}/> 2. Valid ID</label>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Select ID type and upload both sides.</span>
                  </div>
                  {hasID && <CheckCircle size={18} color="#10b981" />}
                </div>
                
                <select name="id_type" value={profileData.id_type} onChange={handleProfileChange} style={{ ...inputStyle, marginBottom: '10px' }}>
                  <option value="">-- Select ID Type --</option>
                  <option value="National ID (Philsys)">National ID (Philsys)</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="UMID">UMID</option>
                  <option value="SSS ID">SSS ID</option>
                  <option value="Postal ID">Postal ID</option>
                  <option value="Voter's ID">Voter's ID</option>
                  <option value="PRC ID">PRC ID</option>
                  <option value="PhilHealth ID">PhilHealth ID</option>
                  <option value="School ID">School ID (if minor)</option>
                  <option value="Other">Other</option>
                </select>

                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', cursor: 'pointer', background: '#fff', fontSize: '0.8rem' }}>
                      <Upload size={14} /> {profileData.id_image_url ? 'Replace Front' : 'Front of ID'}
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_image_url')} style={{ display: 'none' }} />
                    </label>
                    <label className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', cursor: 'pointer', background: '#fff', fontSize: '0.8rem' }}>
                      <Upload size={14} /> {profileData.id_image_back_url ? 'Replace Back' : 'Back of ID'}
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_image_back_url')} style={{ display: 'none' }} />
                    </label>
                  </div>
                  
                  {/* --- NEW: Image Previews for Valid ID --- */}
                  {(profileData.id_image_url || profileData.id_image_back_url) && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                      {profileData.id_image_url && (
                        <img src={profileData.id_image_url} alt="ID Front" style={{ height: '70px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      )}
                      {profileData.id_image_back_url && (
                        <img src={profileData.id_image_back_url} alt="ID Back" style={{ height: '70px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Proof of Residency */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={16}/> 3. Proof of Residency</label>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Utility bill, lease agreement, etc.</span>
                  </div>
                  {hasProof && <CheckCircle size={18} color="#10b981" />}
                </div>
                <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px', cursor: 'pointer', background: '#fff' }}>
                  <Upload size={16} /> {hasProof ? 'Replace Document' : 'Upload Proof'}
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'proof_of_residency_url')} style={{ display: 'none' }} />
                </label>

                {/* --- NEW: Image Preview for Proof of Residency --- */}
                {profileData.proof_of_residency_url && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    {profileData.proof_of_residency_url.includes('.pdf') ? (
                      <a href={profileData.proof_of_residency_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'underline' }}>📄 View Attached PDF</a>
                    ) : (
                      <img src={profileData.proof_of_residency_url} alt="Proof of Residency" style={{ maxHeight: '90px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    )}
                  </div>
                )}
              </div>

              {/* Liveness Check (Selfie holding ID) */}
              <div style={{ background: '#fff7ed', padding: '15px', borderRadius: '8px', border: '1px dashed #fdba74' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '2px', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={16}/> 4. Liveness Check</label>
                    <span style={{ fontSize: '0.75rem', color: '#ea580c' }}>Take a selfie of you holding your Valid ID.</span>
                  </div>
                  {hasLiveness && <CheckCircle size={18} color="#10b981" />}
                </div>
                <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px', cursor: 'pointer', background: '#fff', borderColor: '#fdba74', color: '#c2410c' }}>
                  <Camera size={16} /> {hasLiveness ? 'Retake Selfie' : 'Upload Selfie with ID'}
                  <input type="file" accept="image/*" capture="user" onChange={(e) => handleFileUpload(e, 'liveness_image_url')} style={{ display: 'none' }} />
                </label>

                {/* --- NEW: Image Preview for Liveness Check --- */}
                {profileData.liveness_image_url && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img src={profileData.liveness_image_url} alt="Liveness Selfie" style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid #fdba74' }} />
                  </div>
                )}
              </div>

            </div>

            {/* Special Status Checks (DISABLED FOR RESIDENT) */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <label style={{ ...labelStyle, marginBottom: '5px' }}>Special Classifications</label>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '15px' }}>These statuses are verified and applied strictly by the Barangay Admin.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: profileData.voter_status ? '#1e293b' : '#94a3b8', opacity: 0.8 }}>
                  <input type="checkbox" checked={profileData.voter_status} readOnly disabled style={{ width: '18px', height: '18px' }} />
                  Registered Voter in this Barangay
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: profileData.pwd_status ? '#1e293b' : '#94a3b8', opacity: 0.8 }}>
                  <input type="checkbox" checked={profileData.pwd_status} readOnly disabled style={{ width: '18px', height: '18px' }} />
                  Person with Disability (PWD)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: profileData.senior_citizen ? '#1e293b' : '#94a3b8', opacity: 0.8 }}>
                  <input type="checkbox" checked={profileData.senior_citizen} readOnly disabled style={{ width: '18px', height: '18px' }} />
                  Senior Citizen
                </label>
              </div>
            </div>

          </div>

          {/* SECURITY SETTINGS CARD */}
          <div style={cardStyle}>
            <h3 style={sectionHeaderStyle}>
              <Shield size={20} color="#ef4444" /> Security Settings
            </h3>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Email Address (Read-Only)</label>
                <input type="email" value={user?.email || ''} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', border: '1px solid #e2e8f0' }} />
              </div>

              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" name="new_password" value={passwords.new_password} onChange={handlePasswordChange} required placeholder="Enter new password" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" name="confirm_password" value={passwords.confirm_password} onChange={handlePasswordChange} required placeholder="Confirm new password" style={inputStyle} />
              </div>

              <button type="submit" disabled={passLoading} className="btn" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Lock size={18} /> {passLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ResidentProfileTab;