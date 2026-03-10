import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

// Import Staff Auth Context and Password Hasher
import { useAuth } from '../context/AuthContext';
import { hashPassword } from '../services/security/passwordService';

// Background Images (Same as LoginPage)
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';

import logo from '../assets/brgy.2-icon.png';
import './LoginPage.css'; 

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

// Password Validation Regex
const hasNumber = /\d/;
const hasSymbol = /[!@#$%^&*(),.?":{}|<>_+\-=\\[\]\\]/;

const ForcePasswordChange = () => {
  const navigate = useNavigate();
  // Use the STAFF auth context
  const { user, updateProfile } = useAuth(); 
  
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Check Session on Load
  useEffect(() => {
    // If no user is logged in, send to staff login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // If they somehow got here but don't need a change, send to dashboard
    if (user && !user.needs_password_change) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!hasNumber.test(password)) return "Password must contain at least one number.";
    if (!hasSymbol.test(password)) return "Password must contain at least one symbol (e.g., !@#$%^&*).";
    return null; 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(passwords.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Securing your staff account...');

    try {
      // 2. Hash the new password before saving it (Critical for Staff!)
      const hashedPassword = await hashPassword(passwords.newPassword);

      // 3. Update the USERS table via the AuthContext
      await updateProfile({ 
        password_hash: hashedPassword, 
        needs_password_change: false 
      });

      toast.success('Password updated successfully!', { id: loadingToast, icon: '✅' });
      
      // 4. Send them to the STAFF dashboard!
      navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error("Update Password Error:", err);
      toast.error('Failed to update password. Please try again.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null; 

  return (
    <div className="login-page">
      {/* Background Slider - SAME AS LOGIN PAGE */}
      <div className="login-background">
        <div className="scrolling-wrapper">
          <div className="scrolling-track">
            {/* Create multiple sets for infinite scroll illusion */}
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="image-set">
                {backgroundImages.map((img, index) => (
                  <img key={`${setIndex}-${index}`} src={img} alt="bg" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="overlay-gradient"></div>
      </div>

      {/* FORM CARD */}
      <div className="login-card" style={{ maxWidth: '420px', width: '100%', margin: '0 20px', position: 'relative', padding: '2.5rem 2rem', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10 }}>
        
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '50%', color: '#16a34a' }}>
              <ShieldCheck size={40} />
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', color: '#1e293b', margin: '0 0 5px 0', fontWeight: '700' }}>Secure Your Account</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
            Hi {user.full_name}, please change your temporary password to a secure one before accessing the system.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* NEW PASSWORD FIELD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} color="var(--primary-600)" /> New Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                name="newPassword"
                value={passwords.newPassword} 
                onChange={handleChange} 
                required 
                placeholder="Enter new password" 
                style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s', background: '#f8fafc', color: '#0f172a' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
              Must contain 8+ characters, 1 number, and 1 symbol.
            </small>
          </div>

          {/* CONFIRM PASSWORD FIELD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} color="var(--primary-600)" /> Confirm Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                name="confirmPassword"
                value={passwords.confirmPassword} 
                onChange={handleChange} 
                required 
                placeholder="Type it again to confirm" 
                style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s', background: '#f8fafc', color: '#0f172a' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s' }}>
            {loading ? <><div className="spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Securing...</> : 'Save & Continue'}
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;