import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Ensure this import exists
import { Users, Shield, FileText, ArrowRight, X, Lock, Loader2 } from 'lucide-react';

// Images and CSS
import logo from '../assets/brgy.2-icon.png';
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const LandingPage = () => {
  const navigate = useNavigate();
  
  // --- STAFF GATEWAY STATE ---
  const [showGateway, setShowGateway] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [gatewayError, setGatewayError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Lockout States (stored in localStorage to persist across refreshes)
  const [failedAttempts, setFailedAttempts] = useState(
    parseInt(localStorage.getItem('gateway_fails') || '0', 10)
  );
  const [lockoutTime, setLockoutTime] = useState(
    parseInt(localStorage.getItem('gateway_lockout') || '0', 10)
  );

  const handleGatewaySubmit = async (e) => {
    e.preventDefault();
    
    // 1. Check if user is currently locked out
    if (Date.now() < lockoutTime) {
      const minutesLeft = Math.ceil((lockoutTime - Date.now()) / 60000);
      setGatewayError(`Too many attempts. Locked for ${minutesLeft}m.`);
      return;
    }

    setIsChecking(true);
    setGatewayError('');

    try {
      // 2. SECURE CHECK: Call Supabase RPC (The code is stored on the server, not here)
      const { data: isValid, error } = await supabase.rpc('verify_gateway_pin', {
        input_pin: accessCode
      });

      if (error) throw error;

      if (isValid) {
        // SUCCESS
        localStorage.removeItem('gateway_fails');
        localStorage.removeItem('gateway_lockout');
        setShowGateway(false);
        navigate('/login'); 
      } else {
        // FAIL: Increment attempts
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        localStorage.setItem('gateway_fails', newFails.toString());

        if (newFails >= 3) {
          // LOCKOUT for 5 minutes
          const unlockAt = Date.now() + 5 * 60 * 1000;
          setLockoutTime(unlockAt);
          localStorage.setItem('gateway_lockout', unlockAt.toString());
          setGatewayError('Locked out for 5 minutes due to multiple failures.');
        } else {
          setGatewayError(`Incorrect code. ${3 - newFails} attempts remaining.`);
        }
        setAccessCode('');
      }
    } catch (err) {
      console.error(err);
      setGatewayError('Connection error. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="login-page">
      {/* SCROLLING BACKGROUND */}
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

      <div className="login-card" style={{ maxWidth: '900px', width: '100%', margin: '20px', position: 'relative', padding: '3rem 2rem' }}>
        
        {/* DISCRETE STAFF LOGIN BUTTON */}
        <button 
          onClick={() => setShowGateway(true)}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(241, 245, 249, 0.8)', border: '1px solid #e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.2s', zIndex: 5 }}
        >
          <Shield size={14} /> Official Staff
        </button>

        {/* HERO HEADER */}
        <div className="login-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '1rem', margin: '0 auto' }}>
            <img src={logo} alt="Barangay Logo" className="logo-icon" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
          </div>
          <div style={{ background: '#e0f2fe', padding: '0.4rem 1rem', borderRadius: '999px', color: '#0369a1', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '1rem', display: 'inline-block', border: '1px solid #bae6fd' }}>
            Welcome to the E-Governance Portal
          </div>
          <h1 className="login-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>Barangay Dos Portal</h1>
          <p className="login-subtitle" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5', color: '#64748b' }}>
            Accessible services for all residents. Request documents and stay updated directly from your phone.
          </p>
        </div>

        {/* ACTION CARDS */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div 
            onClick={() => navigate('/resident-login')}
            style={{ flex: '1 1 300px', background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #e2e8f0', textAlign: 'left', cursor: 'pointer', borderTop: '4px solid var(--primary-600)', transition: 'all 0.3s' }}
          >
            <div style={{ background: '#eff6ff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Users size={24} color="var(--primary-600)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Resident Portal</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>Log in to request documents, track your requests, and view your profile.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-600)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Access Portal <ArrowRight size={16} />
            </div>
          </div>

          <div 
            onClick={() => navigate('/register')}
            style={{ flex: '1 1 300px', background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #e2e8f0', textAlign: 'left', cursor: 'pointer', borderTop: '4px solid #10b981', transition: 'all 0.3s' }}
          >
            <div style={{ background: '#ecfdf5', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <FileText size={24} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>New Resident?</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>Register your account today to get access to online barangay services.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Register Now <ArrowRight size={16} />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} Barangay Dos E-Governance System. City of Calamba.
        </div>
      </div>

      {/* --- SECURE STAFF ACCESS GATEWAY --- */}
      {showGateway && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => { if(!isChecking) setShowGateway(false); }}>
          <div style={{ background: '#fff', padding: '2.5rem 2rem', borderRadius: '12px', width: '100%', maxWidth: '380px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }} onClick={e => e.stopPropagation()}>
            
            {!isChecking && (
              <button onClick={() => setShowGateway(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            )}
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: gatewayError.includes('Locked') ? '#fee2e2' : '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', transition: 'background 0.3s' }}>
                <Lock size={28} color={gatewayError.includes('Locked') ? '#ef4444' : '#475569'} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem' }}>Staff Access Gateway</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                This area is restricted to official personnel. Please enter the verification code.
              </p>
            </div>

            <form onSubmit={handleGatewaySubmit}>
              <input 
                type="password" 
                placeholder="••••" 
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); setGatewayError(''); }}
                autoFocus
                disabled={isChecking || Date.now() < lockoutTime}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: gatewayError ? '2px solid #ef4444' : '2px solid #cbd5e1', outline: 'none', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', marginBottom: '12px', background: Date.now() < lockoutTime ? '#f8fafc' : '#fff' }}
              />
              
              {gatewayError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#ef4444', marginBottom: '15px' }}>
                  <AlertCircle size={14} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{gatewayError}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isChecking || !accessCode || Date.now() < lockoutTime}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', fontWeight: 'bold', border: 'none', cursor: (isChecking || !accessCode) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (isChecking || !accessCode) ? 0.7 : 1 }}
              >
                {isChecking ? <><Loader2 size={18} className="spinner" /> Verifying...</> : 'Verify Access'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;