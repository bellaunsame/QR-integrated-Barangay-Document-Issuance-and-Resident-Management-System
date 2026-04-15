import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { ShieldCheck, UserPlus, Mail, Phone, Calendar, MapPin, ArrowLeft } from 'lucide-react'; 
import emailjs from '@emailjs/browser';

// Images and CSS
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

// Helper to generate temporary password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

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

const ResidentRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    date_of_birth: '',
    gender: '',
    civil_status: '', 
    full_address: '',
    purok: 'Purok 1'
  });

  const isUnderage = calculateAge(formData.date_of_birth) < 16;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    
    // Auto capitalize names and addresses
    if (['first_name', 'last_name', 'full_address'].includes(name)) {
      newValue = newValue.replace(/\b\w/g, char => char.toUpperCase());
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // Auto-set civil status to Single if underage
      if (name === 'date_of_birth') {
        const age = calculateAge(newValue);
        if (age < 16) updated.civil_status = 'Single';
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { first_name, last_name, email, mobile_number, date_of_birth, gender, civil_status, full_address, purok } = formData;

    // --- STRICT VALIDATION CHECKS ---
    
    // 1. Check for blank spaces (whitespace only)
    if (!first_name.trim() || !last_name.trim() || !email.trim() || !mobile_number.trim() || !date_of_birth || !gender || !civil_status || !full_address.trim() || !purok) {
      toast.error("Please fill out all required fields. Blank spaces are not allowed.");
      setLoading(false);
      return;
    }

    // 2. Name Check: No numbers allowed
    const hasNumber = /\d/;
    if (hasNumber.test(first_name) || hasNumber.test(last_name)) {
      toast.error("First Name and Last Name cannot contain numbers.");
      setLoading(false);
      return;
    }

    // 3. Age Restriction: Must be 15 or older
    if (calculateAge(date_of_birth) < 15) {
      toast.error("You must be at least 15 years old to register an account.");
      setLoading(false);
      return;
    }

    // 4. Email Check: Strictly @gmail.com
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      toast.error("Only @gmail.com email addresses are allowed.");
      setLoading(false);
      return;
    }

    // 5. Mobile Number Check: Must be at least 11 characters and only contain digits
    if (mobile_number.trim().length < 11 || !/^\d+$/.test(mobile_number.trim())) {
      toast.error("Mobile Number must be at least 11 valid digits.");
      setLoading(false);
      return;
    }

    try {
      // Check if email already exists
      const { data: existingResident } = await supabase
        .from('residents')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (existingResident) {
        toast.error('An account with this email already exists. Please log in.');
        setLoading(false);
        return;
      }

      // Prepare Data
      const tempPassword = generateTempPassword();
      
      const dbPayload = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        mobile_number: mobile_number.trim(),
        date_of_birth,
        gender,
        civil_status,
        full_address: full_address.trim(),
        purok,
        barangay: 'Dos',                   
        city_municipality: 'Calamba City', 
        province: 'Laguna',                
        residency_type: 'Permanent',
        account_status: 'Approved', 
        is_verified: false, 
        password: tempPassword,
        // 👇 FIXED: This stops the infinite password reset loop
        needs_password_change: false 
      };

      // Save to Database
      const { error: dbError } = await supabase.from('residents').insert([dbPayload]);
      if (dbError) throw dbError;

      // Send Email
      try {
        await emailjs.send(
          'service_178ko1n',     
          'template_qzkqkvf',    
          {
            to_email: dbPayload.email,
            to_name: dbPayload.first_name,
            barangay_name: "Dos, Calamba",
            // 👇 FIXED: Updated the email text so it makes sense now
            email_subject_message: `Your account has been created! Please log in using your email and the temporary password below. We highly recommend changing this password in your Profile settings once logged in. Login here: ${window.location.origin}/resident-login`,
            otp_code: tempPassword 
          },
          'pfTdQReY0nVV3CjnY'    
        );
      } catch (emailError) {
        console.error("Email failed to send, but account was created.", emailError);
      }

      // Trigger Success View
      setIsSuccess(true);
      
    } catch (error) {
      console.error(error); 
      toast.error(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // ==========================================
  // RENDER SUCCESS SCREEN
  // ==========================================
  if (isSuccess) {
    return (
      <div className="login-page">
        <div className="login-background">
          <div className="scrolling-wrapper">
            <div className="scrolling-track">
              {[...Array(4)].map((_, setIndex) => (
                <div key={setIndex} className="image-set">
                  {backgroundImages.map((img, index) => (
                    <img key={`${setIndex}-${index}`} src={img} alt={`background ${index + 1}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="overlay-gradient" style={{ background: 'linear-gradient(135deg, var(--primary-900) 0%, var(--primary-800) 100%)' }}></div>
        </div>

        <div className="login-card" style={{ maxWidth: '450px', width: '100%', margin: '0 20px', position: 'relative', zIndex: 10, textAlign: 'center', padding: '3rem 2.5rem', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#f0fdf4', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '8px solid #dcfce7' }}>
            <ShieldCheck size={40} color="#16a34a" />
          </div>
          
          <h2 style={{ color: '#1e293b', marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '700' }}>Registration Successful!</h2>
          
          <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Magandang araw, <strong>{formData.first_name.trim()}</strong>! Your account for Barangay Dos has been created. 
          </p>
          
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--primary-500)', textAlign: 'left', marginBottom: '2rem' }}>
            <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <strong>Next Step:</strong> We have sent an email to <strong>{formData.email.trim()}</strong> containing your temporary password. Please log in to complete your account verification.
            </p>
          </div>

          <button 
            onClick={() => navigate('/resident-login')} 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', color: 'white', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // NORMAL REGISTRATION FORM
  // ==========================================
  return (
    <div className="login-page">
      
      {/* Background Images */}
      <div className="login-background">
        <div className="scrolling-wrapper">
          <div className="scrolling-track">
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="image-set">
                {backgroundImages.map((img, index) => (
                  <img key={`${setIndex}-${index}`} src={img} alt={`background ${index + 1}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="overlay-gradient"></div>
      </div>

      {/* Registration Card */}
      <div className="login-card" style={{ maxWidth: '600px', width: '100%', margin: '40px 20px', position: 'relative', zIndex: 10, background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'var(--primary-50)', padding: '25px 30px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/resident-login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', padding: '5px' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary-800)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={24} /> Create Account
            </h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Join the Barangay Dos digital portal.</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Name Row */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>First Name *</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required placeholder="Juan" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Last Name *</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required placeholder="Dela Cruz" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>

          {/* Contact Row */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={14}/> Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="juan@gmail.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={14}/> Mobile Number *</label>
              <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} required placeholder="09xxxxxxxxx" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>

          {/* Demographics Row */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={14}/> Date of Birth *</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} max={today} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Civil Status *</label>
              <select name="civil_status" value={formData.civil_status} onChange={handleInputChange} disabled={isUnderage} required={!isUnderage} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}>
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>
          </div>

          {/* Address Row */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={14}/> House No. / Street *</label>
              <input type="text" name="full_address" value={formData.full_address} onChange={handleInputChange} required placeholder="House/Block/Lot No., Street" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Purok/Zone *</label>
              <select name="purok" value={formData.purok} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}>
                <option value="Purok 1">Purok 1</option><option value="Purok 2">Purok 2</option><option value="Purok 3">Purok 3</option><option value="Purok 4">Purok 4</option><option value="Purok 5">Purok 5</option><option value="Purok 6">Purok 6</option><option value="Purok 7">Purok 7</option><option value="Pabahay Phase 1">Pabahay Phase 1</option><option value="Pabahay Phase 2">Pabahay Phase 2</option><option value="Pabahay Phase 3">Pabahay Phase 3</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', color: '#64748b' }}>
            By registering, an email will be sent to you with a temporary password to log in. You will complete your official document verification inside the portal.
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--primary-600)', color: 'white', fontSize: '1.05rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '10px' }}
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResidentRegister;