import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, FileText, ArrowRight } from 'lucide-react';

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

      {/* MAIN GLASS CARD */}
      <div className="login-card" style={{ maxWidth: '900px', width: '100%', margin: '20px', position: 'relative', padding: '3rem 2rem' }}>
        
        {/* DISCRETE STAFF LOGIN BUTTON */}
        <button 
          onClick={() => navigate('/login')}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(241, 245, 249, 0.8)', border: '1px solid #e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)'; e.currentTarget.style.color = '#64748b'; }}
        >
          <Shield size={14} /> Official Staff
        </button>

        {/* HERO HEADER */}
        <div className="login-header" style={{ marginBottom: '3rem' }}>
          <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '1rem' }}>
            <img src={logo} alt="Barangay Logo" className="logo-icon" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
          </div>
          <div style={{ background: '#e0f2fe', padding: '0.4rem 1rem', borderRadius: '999px', color: '#0369a1', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '1rem', display: 'inline-block', border: '1px solid #bae6fd' }}>
            Welcome to the E-Governance Portal
          </div>
          <h1 className="login-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Barangay Dos Portal</h1>
          <p className="login-subtitle" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' }}>
            Accessible services for all residents. Request documents and stay updated directly from your phone.
          </p>
        </div>

        {/* ACTION CARDS (SIDE BY SIDE) */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* RESIDENT PORTAL CARD */}
          <div 
            onClick={() => navigate('/resident-login')}
            style={{ flex: '1 1 300px', background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #e2e8f0', textAlign: 'left', cursor: 'pointer', borderTop: '4px solid var(--primary-600)', transition: 'all 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.15)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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

          {/* NEW RESIDENT REGISTRATION CARD */}
          <div 
            onClick={() => navigate('/register')}
            style={{ flex: '1 1 300px', background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #e2e8f0', textAlign: 'left', cursor: 'pointer', borderTop: '4px solid #10b981', transition: 'all 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.15)'; e.currentTarget.style.borderColor = '#a7f3d0'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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

        {/* FOOTER TEXT */}
        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} Barangay Dos E-Governance System. City of Calamba.
        </div>
      </div>
    </div>
  );
};

export default LandingPage;