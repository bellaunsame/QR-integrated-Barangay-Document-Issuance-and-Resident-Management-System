import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

// --- IMPORT SAME AS LOGIN ---
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css'; 

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const hasNumber = /\d/;
const hasSymbol = /[!@#$%^&*(),.?":{}|<>_+\-=\\[\]\\]/;

const ResidentSetupPassword = () => {
  const navigate = useNavigate();
  const [resident, setResident] = useState(null);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem('resident_session');
    if (!sessionStr) {
      navigate('/resident-login');
      return;
    }
    
    const sessionData = JSON.parse(sessionStr);
    setResident(sessionData);

    if (!sessionData.needs_password_change) {
      navigate('/resident-home');
    }
  }, [navigate]);

  const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!hasNumber.test(password)) return "Password must contain at least one number.";
    if (!hasSymbol.test(password)) return "Password must contain at least one symbol (e.g., !@#$%^&*).";
    return null; 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(passwords.newPassword);
    if (passwordError) return toast.error(passwordError);
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match!');

    setLoading(true);
    const loadingToast = toast.loading('Securing your account...');

    try {
      const { error } = await supabase
        .from('residents')
        .update({ password: passwords.newPassword, needs_password_change: false })
        .eq('id', resident.id);

      if (error) throw error;

      const updatedSession = { ...resident, needs_password_change: false, password: passwords.newPassword };
      localStorage.setItem('resident_session', JSON.stringify(updatedSession));

      toast.success('Password updated successfully!', { id: loadingToast, icon: '✅' });
      navigate('/resident-home');

    } catch (err) {
      console.error(err);
      toast.error('Failed to update password.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!resident) return null; 

  return (
    <div className="login-page">
      {/* --- ADDED BACKGROUND SLIDER TO MATCH LOGIN/REGISTER --- */}
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
        
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '50%', color: '#16a34a' }}>
              <ShieldCheck size={40} />
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', color: '#1e293b', margin: '0 0 5px 0', fontWeight: '700' }}>Secure Your Account</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
            Hi {resident.first_name}, please change your temporary password to something secure before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>Must contain 8+ characters, 1 number, and 1 symbol.</small>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} color="var(--primary-600)" /> Confirm Password
            </label>
            <input 
              type={showPassword ? "text" : "password"} 
              name="confirmPassword" 
              value={passwords.confirmPassword} 
              onChange={handleChange} 
              required 
              placeholder="Type it again to confirm" 
              style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              marginTop: '10px', 
              padding: '12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', 
              color: 'white', 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? 'Securing...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResidentSetupPassword;