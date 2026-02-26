import { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseClient'; 
import { Lock, Mail, LogIn, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast'; 
import emailjs from '@emailjs/browser';

import brgyLogo from '../assets/brgy.2-icon.png';
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';

import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- Lockout Timer State ---
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // --- Live Countdown Effect ---
  useEffect(() => {
    let interval;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setError(''); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (lockoutTimer === 0) {
      setError('');
    }
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // --- STEP 1: FORGOT PASSWORD LOGIC (SENDS ONLY TEMP PASS) ---
  const handleForgotPassword = async () => {
    if (lockoutTimer > 0) {
      toast.error(`Please wait ${formatTime(lockoutTimer)} before trying again.`);
      return;
    }

    if (!formData.email) {
      toast.error("Please enter your email address first.");
      return;
    }

    const emailVal = formData.email.toLowerCase();
    if (!emailVal.endsWith('@gmail.com')) {
      toast.error("Only @gmail.com accounts can recover passwords.");
      return;
    }

    const loadingToast = toast.loading("Processing request...");

    try {
      const userData = await db.users.getByEmail(emailVal);
      
      if (!userData || userData.is_active === false) {
        toast.error("Account not found or deactivated.", { id: loadingToast });
        return;
      }

      // Generate ONLY the Temporary Password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const { hashPassword } = await import('../services/security/passwordService');
      const hashedTemp = await hashPassword(tempPassword);

      // Update DB, flag them for password change, and clear any old OTP
      await db.users.update(userData.id, { 
        password_hash: hashedTemp,
        is_verified: false,
        needs_password_change: true,
        otp_code: null 
      });

      // Send Email 1: Temporary Password Only
      await emailjs.send(
        'service_178ko1n', 
        'template_qzkqkvf', 
        {
          to_email: emailVal,
          to_name: userData.full_name,
          otp_code: tempPassword, // Send only the password
          email_subject_message: "You requested a password reset. Please use this temporary password to log in. You will receive an OTP for verification after logging in:",
          barangay_name: "Dos Tibag"
        },
        'pfTdQReY0nVV3CjnY'
      );

      toast.success("Temporary password sent to your Gmail!", { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error("Error resetting password.", { id: loadingToast });
    }
  };

  // --- STEP 2: LOGIN LOGIC (SENDS OTP IF NEEDED) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return; 

    setLoading(true);
    setError('');

    const emailVal = formData.email.toLowerCase();
    if (!emailVal.endsWith('@gmail.com')) {
      setError('Access Denied: Only @gmail.com accounts are permitted.');
      setLoading(false);
      return; 
    }

    try {
      const userData = await db.users.getByEmail(formData.email);

      if (userData && userData.is_active === false) {
        setError('This account has been deactivated. Please contact the Super Admin.');
        setLoading(false);
        return;
      }

      // Attempt to log in with the password provided
      await login(formData.email, formData.password);

      // --- IF LOGIN SUCCEEDS BUT UNVERIFIED (They used the Temp Pass) ---
      if (userData && userData.is_verified === false) {
        
        toast.loading("Sending verification code to email...", { id: 'otp-toast' });
        
        // Generate the 6-digit OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save the new OTP to the database
        await db.users.update(userData.id, { 
          otp_code: newOtp 
        });

        // Send Email 2: OTP Only
        await emailjs.send(
          'service_178ko1n', 
          'template_qzkqkvf', 
          {
            to_email: formData.email,
            to_name: userData.full_name,
            otp_code: newOtp, // Send only the OTP
            email_subject_message: "Here is your 6-digit verification code to securely access your account:",
            barangay_name: "Dos Tibag"
          },
          'pfTdQReY0nVV3CjnY'
        );

        toast.success("OTP sent! Please check your Gmail.", { id: 'otp-toast' });
        navigate('/verify-otp', { state: { email: formData.email } });
      } else {
        // Normal verified user login
        navigate('/dashboard');
      }

    } catch (err) {
      const errorMsg = err.message || 'Invalid credentials';
      
      const timeMatch = errorMsg.match(/(\d+)\s*(s|sec|second)/i);
      
      if (timeMatch && timeMatch[1]) {
        const seconds = parseInt(timeMatch[1], 10);
        setLockoutTimer(seconds);
        setError('Too many login attempts.'); 
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="overlay-gradient"></div>
      </div>

      <div className="login-card" style={{ maxWidth: '450px', width: '100%', margin: '0 20px' }}>
        <div className="login-header">
          <div className="logo-container">
            <img 
              src={brgyLogo} 
              alt="Barangay Logo" 
              className="logo-icon" 
              style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
            />
          </div>
          <h1 className="login-title">QR-Integrated BDIS</h1>
          <h2 className="login-title-2">Barangay Dos in City of Calamba</h2>
          <p className="login-subtitle">Sign in to your account to access into the system</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div 
              className="error-message" 
              style={{ 
                marginBottom: '15px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: lockoutTimer > 0 ? '#fef2f2' : undefined,
                color: lockoutTimer > 0 ? '#ef4444' : undefined,
                border: lockoutTimer > 0 ? '1px solid #fca5a5' : undefined
              }}
            >
              {lockoutTimer > 0 && <AlertTriangle size={18} />}
              <span>
                {error} 
                {lockoutTimer > 0 && <strong> Try again in {formatTime(lockoutTimer)}.</strong>}
              </span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={lockoutTimer > 0} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={lockoutTimer > 0} 
            />
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={lockoutTimer > 0}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: lockoutTimer > 0 ? '#cbd5e1' : '#94a3b8', 
                  fontSize: '12px', 
                  cursor: lockoutTimer > 0 ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading || lockoutTimer > 0} 
            style={{ 
              opacity: lockoutTimer > 0 ? 0.7 : 1,
              cursor: lockoutTimer > 0 ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Signing in...
              </>
            ) : lockoutTimer > 0 ? (
              <>Locked for {formatTime(lockoutTimer)}</>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
        </div>
      </div>
    </div>
  );
};

export default LoginPage;