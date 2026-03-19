import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { User, Lock, Save, Shield, MapPin, Users, CheckCircle, Upload, FileCheck } from 'lucide-react';
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

  // Profile State Expanded (Matches Admin Form)
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
    
    // Verifications
    voter_status: user?.voter_status || false,
    pwd_status: user?.pwd_status || false,
    senior_citizen: user?.senior_citizen || false,
    id_image_url: user?.id_image_url || ''
  });

  const isUnderage = calculateAge(profileData.date_of_birth) < 16;

  // Password State
  const [passwords, setPasswords] = useState({
    new_password: '',
    confirm_password: ''
  });

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // Auto-capitalize specific fields
    const capitalizeFields = ['first_name', 'middle_name', 'last_name', 'place_of_birth', 'full_address', 'father_first_name', 'mother_first_name'];
    if (capitalizeFields.includes(name) && typeof newValue === 'string') {
      newValue = newValue.replace(/\b\w/g, char => char.toUpperCase());
    }

    setProfileData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // Auto-set civil status to Single if underage
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

    const toastId = toast.loading('Optimizing and attaching image...');

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
        toast.success("Image attached successfully!", { id: toastId });
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to optimize image.", { id: toastId });
    }
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (profileData.mobile_number && profileData.mobile_number.trim().length < 11) {
      return toast.error("Mobile Number must be at least 11 digits.");
    }

    setLoading(true);
    const toastId = toast.loading("Saving profile to Barangay Records...");

    try {
      const { data, error } = await supabase
        .from('residents')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local storage session
      const updatedUser = { ...user, ...data };
      localStorage.setItem('resident_session', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success("Profile updated successfully!", { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
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

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff' };
  const labelStyle = { display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px', color: '#475569' };
  const sectionHeaderStyle = { marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' };

  return (
    <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', minHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
        {profileData.photo_url ? (
          <img src={profileData.photo_url} alt="Profile" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-200)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} />
        ) : (
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            {user?.first_name?.charAt(0) || 'R'}
          </div>
        )}
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>My Profile</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Manage your personal information and verifications. Changes reflect instantly in the Barangay records.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Main Details Form */}
        <div style={{ flex: 2, minWidth: '320px', background: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* PROFILE PHOTO UPLOAD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Profile Photo</label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 5px 0' }}>Used for your Digital Barangay ID.</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <Upload size={16} /> Update Photo
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} style={{ display: 'none' }} />
              </label>
            </div>

            <h3 style={{ ...sectionHeaderStyle, marginTop: 0 }}><User size={20} color="var(--primary-600)" /> Personal Information</h3>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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

            <h3 style={sectionHeaderStyle}><MapPin size={20} color="var(--primary-600)" /> Address & Contact</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: 3, minWidth: '200px' }}>
                <label style={labelStyle}>Full Address *</label>
                <input type="text" name="full_address" value={profileData.full_address} onChange={handleProfileChange} required style={inputStyle} />
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

            <h3 style={sectionHeaderStyle}><Users size={20} color="var(--primary-600)" /> Family Information</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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

            <h3 style={sectionHeaderStyle}><FileCheck size={20} color="var(--primary-600)" /> Identifications & Verifications</h3>
            
            {/* VALID ID UPLOAD */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: '0' }}>Valid ID (National ID, Passport, etc.)</label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Required for processing sensitive documents.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {profileData.id_image_url && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14}/> Attached</span>}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-200)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  <Upload size={16} /> Upload ID
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_image_url')} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* STATUS CHECKBOXES */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
                <input type="checkbox" name="voter_status" checked={profileData.voter_status} onChange={handleProfileChange} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }} />
                Registered Voter
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
                <input type="checkbox" name="pwd_status" checked={profileData.pwd_status} onChange={handleProfileChange} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }} />
                PWD
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
                <input type="checkbox" name="senior_citizen" checked={profileData.senior_citizen} onChange={handleProfileChange} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }} />
                Senior Citizen
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1rem' }}>
              <Save size={20} /> {loading ? "Saving to Records..." : "Save Profile Updates"}
            </button>
          </form>
        </div>

        {/* Security & Password Form */}
        <div style={{ flex: 1, minWidth: '300px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', alignSelf: 'flex-start' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
            <Shield size={20} color="#ef4444" /> Security Settings
          </h3>
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Email Address (Read-Only)</label>
              <input type="email" value={user?.email || ''} readOnly style={{ ...inputStyle, background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }} />
            </div>

            <div>
              <label style={labelStyle}>New Password</label>
              <input type="password" name="new_password" value={passwords.new_password} onChange={handlePasswordChange} required placeholder="Enter new password" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" name="confirm_password" value={passwords.confirm_password} onChange={handlePasswordChange} required placeholder="Confirm new password" style={inputStyle} />
            </div>

            <button type="submit" disabled={passLoading} className="btn btn-secondary" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px', background: '#ef4444', color: 'white', border: 'none', padding: '12px' }}>
              <Lock size={18} /> {passLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ResidentProfileTab;