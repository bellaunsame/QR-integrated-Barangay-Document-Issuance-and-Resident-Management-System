import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, QrCode, Camera, Upload, AlertCircle, XCircle } from 'lucide-react';
import emailjs from '@emailjs/browser'; 
import { hashPassword, verifyPassword } from '../services/security/passwordService'; 

// --- YOUR BULLETPROOF SCANNER IMPORTS ---
import { Html5QrcodeScanner } from 'html5-qrcode'; 
import jsQR from 'jsqr'; 
import { parseQRData } from '../services/qrCodeService';

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

  // --- VIEW TOGGLES ---
  const [loginMode, setLoginMode] = useState('credentials'); // 'credentials' | 'qrcode'
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // --- SCANNER STATES ---
  const scannerRef = useRef(null);
  const isInitializing = useRef(false);
  const [scanning, setScanning] = useState(false);

  // ==========================================
  // AUTO-REDIRECT & CLEANUP
  // ==========================================
  useEffect(() => {
    const existingSession = localStorage.getItem('resident_session');
    if (existingSession) {
      navigate('/resident-home', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // If the user navigates away from the QR mode, ensure the camera shuts off!
    if (loginMode !== 'qrcode') {
      stopScanner();
      setScanning(false);
    }
    return () => { stopScanner(); };
  }, [loginMode]);

  // ==========================================
  // HELPER: PROCESS SUCCESSFUL LOGIN
  // ==========================================
  const processSuccessfulLogin = (resident) => {
    localStorage.setItem('resident_session', JSON.stringify(resident));
      
    if (resident.needs_password_change) {
      toast('Please set up your personal password.', { icon: '🔒' });
      navigate('/resident-setup-password'); 
    } else {
      toast.success(`Welcome back, ${resident.first_name}!`);
      navigate('/resident-home'); 
    }
  };

  // ==========================================
  // NORMAL LOGIN HANDLER (Email & Password)
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      if (resident.account_status === 'Pending') {
        toast.error('Account pending approval. Please wait for the admin to review your registration.', { duration: 6000, icon: '⏳' });
        setLoading(false);
        return;
      }

      processSuccessfulLogin(resident);

    } catch (err) {
      console.error("Login Error:", err);
      toast.error('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // YOUR JSQR & HTML5 QR SCANNER LOGIC
  // ==========================================
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.warn('Scanner cleanup warning:', err);
      }
    }
  };

  const startScanner = () => {
    if (isInitializing.current || scannerRef.current) return;

    setScanning(true);
    isInitializing.current = true;

    setTimeout(() => {
      try {
        const scannerElement = document.getElementById('qr-reader');
        if (!scannerElement) {
          isInitializing.current = false;
          return;
        }

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          { 
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoConstraints: { facingMode: "environment" },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true
          },
          false
        );

        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
      } catch (err) {
        console.error('Scanner initialization error:', err);
        toast.error('Camera is busy or access was denied.');
        setScanning(false);
      } finally {
        isInitializing.current = false;
      }
    }, 400); 
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Analyzing image file...");

    // Stop live camera if running
    if (scannerRef.current) {
      await stopScanner();
      setScanning(false);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        toast.dismiss(toastId);
        onScanSuccess(code.data);
      } else {
        toast.error("Could not find a QR code in this image.", { id: toastId });
      }

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      toast.error("Failed to load image file.", { id: toastId });
      URL.revokeObjectURL(url);
    };

    img.src = url;
    e.target.value = ''; // Reset input
  };

  const onScanSuccess = async (decodedText) => {
    try {
      setLoading(true);
      if (scannerRef.current) {
        await stopScanner();
        setScanning(false);
      }

      // --- BULLETPROOF QR PARSER ---
      let residentId = null;

      // 1. Try parsing with your custom qrCodeService
      try {
        const data = parseQRData(decodedText);
        if (data && data.id) residentId = data.id;
      } catch (e) {}

      // 2. Fallback: Try standard JSON parsing
      if (!residentId) {
        try {
          const parsedJSON = JSON.parse(decodedText);
          if (parsedJSON.id) residentId = parsedJSON.id;
        } catch (e) {}
      }

      // 3. Fallback: If the QR code is literally just the raw ID string
      if (!residentId && typeof decodedText === 'string' && decodedText.trim().length > 15) {
        residentId = decodedText.trim();
      }

      // --- VERIFY THE EXTRACTED ID ---
      if (residentId) {
        // Fetch resident using the parsed QR ID
        const { data: resData, error } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .limit(1);
        
        const resident = resData ? resData[0] : null;

        if (error || !resident) {
          toast.error('Resident not found. Ensure this is a valid Barangay ID.');
          setLoading(false);
          return;
        }

        if (resident.account_status === 'Pending') {
          toast.error('This account is still pending approval.');
          setLoading(false);
          return;
        }

        // Successfully found and active!
        toast.success('QR Code verified!');
        processSuccessfulLogin(resident);

      } else {
        toast.error('Invalid QR Code format. No ID found in the image.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing scan:', err);
      toast.error('Failed to process QR code.');
      setLoading(false);
    }
  };

  const onScanError = (error) => {
    const errStr = typeof error === 'string' ? error : (error?.message || String(error));
    if (!errStr.includes('NotFoundException') && !errStr.includes('No MultiFormat Readers')) {
      console.warn('Camera scan warning:', errStr); 
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
      const { data, error: fetchErr } = await supabase
        .from('residents')
        .select('*')
        .eq('email', resetEmail)
        .limit(1);

      const resident = data ? data[0] : null;

      if (fetchErr || !resident) {
        throw new Error("No resident account found with that email.");
      }

      const tempPass = `TEMP-${Math.floor(100000 + Math.random() * 900000)}`;
      const hashedTempPass = await hashPassword(tempPass);

      const { error: updateErr } = await supabase
        .from('residents')
        .update({ 
          password_hash: hashedTempPass,
          password: null, 
          needs_password_change: true 
        })
        .eq('id', resident.id);

      if (updateErr) throw updateErr;

      await emailjs.send(
        'service_178ko1n',     
        'template_qzkqkvf',    
        {
          to_email: resident.email,
          to_name: resident.first_name,
          barangay_name: "Dos, Calamba",
          email_subject_message: "You requested a password reset. Please use the temporary password below to log in. We highly recommend changing your password immediately in your Profile settings after logging in.",
          otp_code: tempPass 
        },
        'pfTdQReY0nVV3CjnY'    
      );

      toast.success("Temporary password sent to your email!", { id: toastId });
      setShowForgotPass(false); 
      setResetEmail('');        

    } catch (error) {
      console.error("Reset Error:", error);
      toast.error(error.message || "Failed to reset password.", { id: toastId });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page">
      
      {/* Hidden File Input for QR Image Upload */}
      <input type="file" id="custom-qr-upload" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />

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
        <button 
          onClick={() => {
            if (showForgotPass) {
              setShowForgotPass(false);
            } else if (loginMode === 'qrcode') {
              setLoginMode('credentials');
            } else {
              navigate('/');
            }
          }} 
          style={{ 
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
            {showForgotPass ? 'Enter your email to receive a temporary password.' : 
             loginMode === 'qrcode' ? 'Scan your Digital Barangay ID.' : 
             'Log in to access barangay services'}
          </p>
        </div>

        {/* --- DYNAMIC VIEW --- */}
        {showForgotPass ? (
          
          /* 1. FORGOT PASSWORD FORM */
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
              />
            </div>
            <button type="submit" disabled={resetLoading} className="btn-login" style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', border: 'none', background: resetLoading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
              {resetLoading ? 'Sending...' : 'Send Temporary Password'}
            </button>
          </form>

        ) : loginMode === 'qrcode' ? (

          /* 2. QR CODE SCANNER VIEW (Using your exact jsQR & Html5 logic) */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <div className="spinner-small" style={{ borderTopColor: 'var(--primary-600)', width: '30px', height: '30px', margin: '0 auto 10px' }}></div>
                <p>Logging in...</p>
              </div>
            ) : !scanning ? (
              
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={startScanner} 
                  style={{ padding: '14px', background: 'var(--primary-600)', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Camera size={20} /> Scan with Camera
                </button>

                <button 
                  type="button" 
                  onClick={() => document.getElementById('custom-qr-upload').click()} 
                  style={{ padding: '14px', background: '#f1f5f9', color: '#334155', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Upload size={20} /> Upload QR Image File
                </button>

                <button 
                  type="button" 
                  onClick={() => setLoginMode('credentials')} 
                  style={{ padding: '14px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}
                >
                  <Mail size={18} /> Switch to Email Login
                </button>
              </div>

            ) : (
              
              <div style={{ width: '100%' }}>
                <div style={{ marginBottom: '10px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.9rem', background: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                  <AlertCircle size={18} /> Position QR in the frame
                </div>
                
                {/* The Video Element Container */}
                <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary-500)', background: '#000' }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('custom-qr-upload').click()} 
                    style={{ padding: '12px', background: '#f1f5f9', color: '#334155', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <Upload size={18} /> Upload Image Instead
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => { stopScanner(); setScanning(false); }} 
                    style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <XCircle size={18} /> Cancel Camera
                  </button>
                </div>
              </div>

            )}
          </div>

        ) : (

          /* 3. NORMAL LOGIN FORM */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} color="var(--primary-600)" /> Email Address
              </label>
              <input 
                type="email" id="email" value={email} 
                onChange={(e) => setEmail(e.target.value)} required 
                placeholder="juan.delacruz@email.com" 
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} color="var(--primary-600)" /> Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} id="password" value={password} 
                  onChange={(e) => setPassword(e.target.value)} required 
                  placeholder="Enter your password" 
                  style={{ width: '100%', padding: '12px 45px 12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <span onClick={() => setShowForgotPass(true)} style={{ color: 'var(--primary-600)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                  Forgot Password?
                </span>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: '5px', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Verifying...' : 'Login to Portal'}
            </button>

            {/* --- QR CODE LOGIN TOGGLE --- */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
               <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
               <span style={{ padding: '0 10px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>OR</span>
               <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            </div>

            <button 
              type="button" 
              onClick={() => setLoginMode('qrcode')}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px dashed var(--primary-400)', background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              <QrCode size={20} /> Quick Login via QR Code
            </button>
            
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