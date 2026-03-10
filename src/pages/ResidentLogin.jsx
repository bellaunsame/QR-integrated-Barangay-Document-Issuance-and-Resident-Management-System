import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import emailjs from '@emailjs/browser'; 
import { hashPassword, verifyPassword } from '../services/security/passwordService'; 

import logo from '../assets/brgy.2-icon.png';
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const ResidentLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- FORGOT PASSWORD STATES ---
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ==========================================
  // AUTO-REDIRECT IF ALREADY LOGGED IN
  // ==========================================
  useEffect(() => {
    const existingSession = localStorage.getItem('resident_session');
    if (existingSession) {
      navigate('/resident-home', { replace: true });
    }
  }, [navigate]);

  // ==========================================
  // NORMAL LOGIN HANDLER
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // BULLETPROOF QUERY: Use limit(1) to avoid 406 errors if there are duplicate emails
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('email', email)
        .limit(1);

      const resident = data ? data[0] : null;

      if (error || !resident) {
        toast.error('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // --- Handle Both Plaintext (Legacy) and Hashed Passwords ---
      let isValid = false;
      if (resident.password_hash) {
        isValid = await verifyPassword(password, resident.password_hash);
      } else if (resident.password === password) {
        isValid = true; // Legacy fallback
      }

      if (!isValid) {
        toast.error('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // --- ENHANCED PENDING NOTIFICATION ---
      if (resident.account_status === 'Pending') {
        toast.error(
          (t) => (
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <b style={{ fontSize: '1rem' }}>Account Pending Approval</b>
              <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                We are still verifying your registration. Please wait for an email with your password!
              </span>
            </span>
          ),
          { duration: 6000, icon: '⏳' }
        );
        setLoading(false);
        return;
      }

      localStorage.setItem('resident_session', JSON.stringify(resident));
      
      if (resident.needs_password_change) {
        toast('Please set up your personal password.', { icon: '🔒' });
        navigate('/resident-setup-password'); 
      } else {
        toast.success(`Welcome back, ${resident.first_name}!`);
        navigate('/resident-home'); 
      }

    } catch (err) {
      console.error("Login Error:", err);
      toast.error('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FORGOT PASSWORD HANDLER
  // ==========================================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) return toast.error("Please enter your registered email.");
    
    setResetLoading(true);
    const toastId = toast.loading('Verifying account and sending email...');

    try {
      // BULLETPROOF QUERY: Use limit(1) to avoid 406 errors on duplicates
      const { data, error: fetchErr } = await supabase
        .from('residents')
        .select('*')
        .eq('email', resetEmail)
        .limit(1);

      const resident = data ? data[0] : null;

      if (fetchErr || !resident) {
        throw new Error("No resident account found with that email.");
      }

      // 2. Generate a random 6-digit Temporary Password
      const tempPass = `TEMP-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // 3. Encrypt (Hash) the temporary password
      const hashedTempPass = await hashPassword(tempPass);

      // 4. Update the resident's password in the database
      const { error: updateErr } = await supabase
        .from('residents')
        .update({ 
          password_hash: hashedTempPass,
          password: null, // Clear legacy plaintext password if it exists
          needs_password_change: true 
        })
        .eq('id', resident.id);

      if (updateErr) throw updateErr;

      // 5. Send the Email using the OTP Template Trick!
      await emailjs.send(
        'service_178ko1n',     
        'template_qzkqkvf',    
        {
          to_email: resident.email,
          to_name: resident.first_name,
          barangay_name: "Dos, Calamba",
          email_subject_message: "You requested a password reset. Please use the temporary password below to log in. We highly recommend changing your password immediately in your Profile settings after logging in.",
          otp_code: tempPass   // Puts the TEMP password in the big blue box!
        },
        'pfTdQReY0nVV3CjnY'    
      );

      toast.success("Temporary password sent to your email!", { id: toastId });
      setShowForgotPass(false); // Go back to login screen
      setResetEmail('');        // Clear the input

    } catch (error) {
      console.error("Reset Error:", error);
      toast.error(error.message || "Failed to reset password.", { id: toastId });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background Slider */}
      <div className="login-background">
        <div className="scrolling-wrapper">
          <div className="scrolling-track">
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="image-set">
                {backgroundImages.map((img, index) => <img key={`${setIndex}-${index}`} src={img} alt="bg" />)}
              </div>
            ))}
          </div>
        </div>
        <div className="overlay-gradient"></div>
      </div>

      {/* Login / Reset Form Container */}
      <div className="login-card" style={{ 
        maxWidth: '420px', 
        width: '100%', 
        margin: '0 20px', 
        position: 'relative',
        padding: '2.5rem 2rem',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        zIndex: 10
      }}>
        
        {/* Back Button */}
        <button onClick={() => showForgotPass ? setShowForgotPass(false) : navigate('/')} style={{ 
          position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'none', 
          border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', 
          gap: '5px', cursor: 'pointer', padding: '5px', fontWeight: '600', 
          fontSize: '0.9rem', transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Header */}
        <div className="login-header" style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '2rem' }}>
          <img src={logo} alt="Barangay Logo" style={{ width: '85px', height: '85px', objectFit: 'contain', marginBottom: '10px' }} />
          <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: '0 0 5px 0', fontWeight: '700' }}>
            {showForgotPass ? 'Reset Password' : 'Resident Portal'}
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            {showForgotPass ? 'Enter your email to receive a temporary password.' : 'Log in to access barangay services'}
          </p>
        </div>

        {/* --- DYNAMIC FORM VIEW --- */}
        {showForgotPass ? (
          
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="resetEmail" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} color="var(--primary-600)" /> Registered Email Address
              </label>
              <input 
                type="email" 
                id="resetEmail" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)} 
                required 
                placeholder="juan.delacruz@email.com" 
                style={{ 
                  width: '100%', padding: '12px 15px', borderRadius: '8px', 
                  border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem',
                  transition: 'border-color 0.2s', background: '#f8fafc', color: '#0f172a'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <button 
              type="submit" 
              disabled={resetLoading} 
              style={{ 
                marginTop: '10px', padding: '12px', borderRadius: '8px', border: 'none',
                background: resetLoading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
                color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: resetLoading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                boxShadow: resetLoading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              {resetLoading ? <><div className="spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Sending...</> : 'Send Temporary Password'}
            </button>
          </form>

        ) : (

          /* NORMAL LOGIN FORM */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* EMAIL FIELD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} color="var(--primary-600)" /> Email Address
              </label>
              <input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="juan.delacruz@email.com" 
                style={{ 
                  width: '100%', padding: '12px 15px', borderRadius: '8px', 
                  border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem',
                  transition: 'border-color 0.2s', background: '#f8fafc', color: '#0f172a'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {/* PASSWORD FIELD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} color="var(--primary-600)" /> Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Enter your password" 
                  style={{ 
                    width: '100%', padding: '12px 45px 12px 15px', borderRadius: '8px', 
                    border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem',
                    transition: 'border-color 0.2s', background: '#f8fafc', color: '#0f172a'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ 
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Forgot Password Link */}
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <span 
                  onClick={() => setShowForgotPass(true)} 
                  style={{ color: 'var(--primary-600)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Forgot Password?
                </span>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              disabled={loading} 
              style={{ 
                marginTop: '10px', padding: '12px', borderRadius: '8px', border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
                color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? <><div className="spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Verifying...</> : 'Login to Portal'}
            </button>
            
            {/* REGISTER LINK */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
              Don't have an account? <span onClick={() => navigate('/register')} style={{ color: 'var(--primary-600)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Register here</span>
            </div>
          </form>

        )}

      </div>
    </div>
  );
};

export default ResidentLogin;