import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: resident, error } = await supabase
        .from('residents')
        .select('*')
        .eq('email', email)
        .eq('password', password) 
        .single();

      if (error || !resident) {
        toast.error('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      if (resident.account_status === 'Pending') {
        toast.error('Your account is still pending approval by the Barangay.');
        setLoading(false);
        return;
      }

      localStorage.setItem('resident_session', JSON.stringify(resident));
      
      if (resident.needs_password_change) {
        toast('Please set up your personal password.', { icon: '🔒' });
        // FIXED: Now safely routing to the Resident setup page instead of the Admin one!
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

      {/* Login Form Container */}
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
        <button onClick={() => navigate('/')} style={{ 
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
          <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: '0 0 5px 0', fontWeight: '700' }}>Resident Portal</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Log in to access barangay services</p>
        </div>

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

      </div>
    </div>
  );
};

export default ResidentLogin;