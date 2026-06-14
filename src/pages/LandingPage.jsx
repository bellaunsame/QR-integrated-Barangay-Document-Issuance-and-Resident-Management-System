import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  Users, Shield, FileText, ArrowRight, X, Lock, Loader2, AlertCircle,
  QrCode, ClipboardList, Wrench, ChevronDown, MapPin, Phone, Clock,
  Mail, Heart, Scale, BookOpen, Menu
} from 'lucide-react';

// Images
import logo from '../assets/brgy.2-icon.png';
import heroBg from '../assets/Brgyhall.jpg';
import kapitanaImg from '../assets/kapitana.png';
import gallery1 from '../assets/gallery-1.jpg';
import gallery2 from '../assets/gallery-2.jpg';
import gallery3 from '../assets/gallery-3.jpg';
import gallery4 from '../assets/gallery-4.jpg';
import areaImg from '../assets/area.JPG';
import calambaSeal from '../assets/Calamba,_Laguna_Seal.svg.png';
import bagongPilipinas from '../assets/bagong-pilipinas-logo.jpg';

// Styles
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  // ─── EXISTING STAFF GATEWAY STATE (preserved exactly) ───
  const [showGateway, setShowGateway] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [gatewayError, setGatewayError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(
    parseInt(localStorage.getItem('gateway_fails') || '0', 10)
  );
  const [lockoutTime, setLockoutTime] = useState(
    parseInt(localStorage.getItem('gateway_lockout') || '0', 10)
  );

  // ─── NEW STATE ───
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dynamicGallery, setDynamicGallery] = useState([]);

  // ─── FETCH DYNAMIC GALLERY ───
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await supabase
          .from('system_configs')
          .select('value')
          .eq('key', 'gallery_images')
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data && data.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDynamicGallery(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic gallery:', err);
      }
    };
    fetchGallery();
  }, []);

  // ─── SCROLL LISTENER (navbar appearance) ───
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── INTERSECTION OBSERVER (fade-up animations) ───
  useEffect(() => {
    const elements = document.querySelectorAll('.fade-up');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ─── SMOOTH SCROLL TO SECTION ───
  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── EXISTING GATEWAY SUBMIT (preserved exactly) ───
  const handleGatewaySubmit = async (e) => {
    e.preventDefault();

    if (Date.now() < lockoutTime) {
      const minutesLeft = Math.ceil((lockoutTime - Date.now()) / 60000);
      setGatewayError(`Too many attempts. Locked for ${minutesLeft}m.`);
      return;
    }

    setIsChecking(true);
    setGatewayError('');

    try {
      const { data: isValid, error } = await supabase.rpc('verify_gateway_pin', {
        input_pin: accessCode
      });

      if (error) throw error;

      if (isValid) {
        localStorage.removeItem('gateway_fails');
        localStorage.removeItem('gateway_lockout');
        setShowGateway(false);
        navigate('/login');
      } else {
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        localStorage.setItem('gateway_fails', newFails.toString());

        if (newFails >= 3) {
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

  // ─── SERVICES DATA ───
  const services = [
    {
      icon: <FileText size={26} />,
      color: 'blue',
      title: 'Document Requests',
      desc: 'Request barangay clearance, certificate of residency, certificate of indigency, and more — all online.'
    },
    {
      icon: <QrCode size={26} />,
      color: 'purple',
      title: 'QR-Based ID System',
      desc: 'Each resident gets a unique QR-coded ID for fast verification and seamless barangay transactions.'
    },
    {
      icon: <ClipboardList size={26} />,
      color: 'amber',
      title: 'Blotter Reporting',
      desc: 'File incident reports and track blotter cases through a secure, transparent digital system.'
    },
    {
      icon: <Wrench size={26} />,
      color: 'green',
      title: 'Equipment Borrowing',
      desc: 'Browse and request available barangay equipment. Track borrowing status in real-time.'
    }
  ];

  // ─── GALLERY DATA ───
  const defaultGalleryItems = [
    { img: gallery1, label: 'Community Events' },
    { img: gallery2, label: 'Barangay Programs' },
    { img: gallery3, label: 'Youth Development' },
    { img: areaImg, label: 'Barangay Dos Area' },
    { img: gallery4, label: 'Community Outreach' }
  ];

  const galleryItems = dynamicGallery.length > 0 
    ? dynamicGallery.map(g => ({ img: g.url, label: g.label }))
    : defaultGalleryItems;

  return (
    <div className="landing-page">
      {/* ══════════════════════════════════════
          1. NAVBAR
          ══════════════════════════════════════ */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`} id="landing-nav">
        <div className="nav-brand" onClick={() => scrollToSection('hero')}>
          <img src={logo} alt="Barangay Dos Seal" />
          <div className="nav-brand-text">
            <span className="nav-brand-title">Barangay Dos</span>
            <span className="nav-brand-subtitle">Calamba City, Laguna</span>
          </div>
        </div>

        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollToSection('hero')}>Home</button>
          <button className="nav-link" onClick={() => scrollToSection('services')}>Services</button>
          <button className="nav-link" onClick={() => scrollToSection('about')}>About</button>
          <button className="nav-link" onClick={() => scrollToSection('gallery')}>Gallery</button>
        </div>

        <button className="nav-cta desktop-only" onClick={() => navigate('/resident-login')}>
          Resident Portal
        </button>

        {/* Hamburger for mobile */}
        <button
          className={`nav-hamburger ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      <div
        className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="nav-link" onClick={() => scrollToSection('hero')}>Home</button>
        <button className="nav-link" onClick={() => scrollToSection('services')}>Services</button>
        <button className="nav-link" onClick={() => scrollToSection('about')}>About</button>
        <button className="nav-link" onClick={() => scrollToSection('gallery')}>Gallery</button>
        <button className="nav-cta" onClick={() => { setMobileMenuOpen(false); navigate('/resident-login'); }}>
          Resident Portal
        </button>
      </div>

      {/* ══════════════════════════════════════
          2. HERO SECTION
          ══════════════════════════════════════ */}
      <section className="hero-section" id="hero">
        <div className="hero-bg">
          <img src={heroBg} alt="Barangay Dos Hall" />
        </div>
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            E-Governance Portal
          </div>

          <h1 className="hero-title">
            Barangay Dos,{' '}
            <span className="hero-title-accent">Calamba City</span>
          </h1>

          <p className="hero-subtitle">
            Access barangay services anytime, anywhere. Request documents, track
            transactions, and stay connected with your community — all in one place.
          </p>

          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/resident-login')}>
              <Users size={20} />
              Access Services
            </button>
            <button className="hero-btn-secondary" onClick={() => navigate('/register')}>
              <FileText size={20} />
              Register Now
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">24/7</span>
              <span className="hero-stat-label">Online Access</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">QR</span>
              <span className="hero-stat-label">Enabled IDs</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">Fast</span>
              <span className="hero-stat-label">Processing</span>
            </div>
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <span>Scroll to explore</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. SERVICES SECTION
          ══════════════════════════════════════ */}
      <section className="services-section" id="services">
        <div className="section-header fade-up">
          <div className="section-label">
            <Shield size={14} />
            Our Services
          </div>
          <h2 className="section-title">Digital Services at Your Fingertips</h2>
          <p className="section-description">
            Experience fast, secure, and hassle-free barangay transactions through our integrated e-governance platform.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className={`service-card fade-up fade-up-delay-${index + 1}`}>
              <div className={`service-icon-wrap ${service.color}`}>
                {service.icon}
              </div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          4. ABOUT / LEADERSHIP SECTION
          ══════════════════════════════════════ */}
      <section className="about-section" id="about">
        <div className="about-container">
          <div className="about-image-side fade-up">
            <div className="about-photo-frame">
              <img src={kapitanaImg} alt="Barangay Captain" />
              <div className="about-photo-badge">
                <div className="about-photo-badge-name">Kap. Joanne</div>
                <div className="about-photo-badge-title">Barangay Captain</div>
              </div>
            </div>
          </div>

          <div className="about-text-side fade-up fade-up-delay-2">
            <div className="section-label">
              <Heart size={14} />
              About Our Barangay
            </div>
            <h2 className="section-title">Serbisyong Epektibo para sa Barangay Dos</h2>
            <p className="about-message">
              "Ang aming layunin ay magbigay ng mabilis, transparent, at epektibong serbisyo sa bawat residente ng Barangay Dos. Sa pamamagitan ng modernong teknolohiya, mas nagiging accessible ang aming mga serbisyo para sa lahat."
            </p>

            <div className="about-values">
              <div className="about-value-card">
                <div className="about-value-icon">
                  <Heart size={18} />
                </div>
                <div>
                  <h4>Community First</h4>
                  <p>Resident welfare at the heart of every decision</p>
                </div>
              </div>
              <div className="about-value-card">
                <div className="about-value-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <h4>Transparency</h4>
                  <p>Open and accountable governance</p>
                </div>
              </div>
              <div className="about-value-card">
                <div className="about-value-icon">
                  <Scale size={18} />
                </div>
                <div>
                  <h4>Justice & Peace</h4>
                  <p>Fair resolution and safe community</p>
                </div>
              </div>
              <div className="about-value-card">
                <div className="about-value-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h4>Innovation</h4>
                  <p>Embracing digital solutions for better service</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          5. GALLERY SECTION
          ══════════════════════════════════════ */}
      <section className="gallery-section" id="gallery">
        <div className="section-header fade-up">
          <div className="section-label">
            <Users size={14} />
            Community Gallery
          </div>
          <h2 className="section-title">Life in Barangay Dos</h2>
          <p className="section-description">
            A glimpse into the vibrant community, programs, and events of our barangay.
          </p>
        </div>

        <div className="gallery-grid">
          {galleryItems.map((item, index) => (
            <div key={index} className={`gallery-item fade-up fade-up-delay-${Math.min(index + 1, 4)}`}>
              <img src={item.img} alt={item.label} />
              <div className="gallery-item-overlay">
                <span>{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          6. FOOTER
          ══════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="footer-grid">
          {/* Column 1: Brand */}
          <div className="footer-brand">
            <div className="footer-brand-row">
              <img src={logo} alt="Barangay Dos Seal" />
              <span className="footer-brand-name">Barangay Dos</span>
            </div>
            <p className="footer-brand-desc">
              QR-Integrated Barangay Document Issuance and Resident Management System. Empowering our community through digital governance.
            </p>
            <div className="footer-seals">
              <img src={calambaSeal} alt="Calamba City Seal" />
              <img src={bagongPilipinas} alt="Bagong Pilipinas" />
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><button onClick={() => scrollToSection('hero')}>Home</button></li>
              <li><button onClick={() => scrollToSection('services')}>Services</button></li>
              <li><button onClick={() => scrollToSection('about')}>About</button></li>
              <li><button onClick={() => scrollToSection('gallery')}>Gallery</button></li>
              <li><button onClick={() => navigate('/resident-login')}>Resident Login</button></li>
              <li><button onClick={() => navigate('/register')}>Register</button></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="footer-column">
            <h4>Contact Us</h4>
            <div className="footer-contact-item">
              <MapPin size={18} />
              <span>Barangay Dos, Calamba City, Laguna, Philippines</span>
            </div>
            <div className="footer-contact-item">
              <Clock size={18} />
              <span>Monday – Friday, 8:00 AM – 5:00 PM</span>
            </div>
            <div className="footer-contact-item">
              <Mail size={18} />
              <span>barangaydos@calamba.gov.ph</span>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Barangay Dos E-Governance System. City of Calamba.</span>
          <button className="footer-staff-link" onClick={() => setShowGateway(true)}>
            <Lock size={13} />
            Staff Access
          </button>
        </div>
      </footer>

      {/* ══════════════════════════════════════
          7. STAFF GATEWAY MODAL (preserved)
          ══════════════════════════════════════ */}
      {showGateway && (
        <div
          className="gateway-overlay"
          onClick={() => { if (!isChecking) setShowGateway(false); }}
        >
          <div className="gateway-card" onClick={(e) => e.stopPropagation()}>
            {!isChecking && (
              <button className="gateway-close" onClick={() => setShowGateway(false)}>
                <X size={20} />
              </button>
            )}

            <div className="gateway-header">
              <div className={`gateway-icon-wrap ${gatewayError.includes('Locked') ? 'locked' : 'normal'}`}>
                <Lock size={28} color={gatewayError.includes('Locked') ? '#ef4444' : '#475569'} />
              </div>
              <h3>Staff Access Gateway</h3>
              <p>This area is restricted to official personnel. Please enter the verification code.</p>
            </div>

            <form onSubmit={handleGatewaySubmit}>
              <input
                className={`gateway-input ${gatewayError ? 'error' : ''} ${Date.now() < lockoutTime ? 'disabled' : ''}`}
                type="password"
                placeholder="••••"
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); setGatewayError(''); }}
                autoFocus
                disabled={isChecking || Date.now() < lockoutTime}
              />

              {gatewayError && (
                <div className="gateway-error">
                  <AlertCircle size={14} />
                  <span>{gatewayError}</span>
                </div>
              )}

              <button
                className="gateway-submit"
                type="submit"
                disabled={isChecking || !accessCode || Date.now() < lockoutTime}
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