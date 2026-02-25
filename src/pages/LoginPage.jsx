import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseClient'; 
import { Lock, Mail, LogIn } from 'lucide-react';
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  // --- FORGOT PASSWORD LOGIC ---
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Please enter your email address first.");
      return;
    }

    const emailVal = formData.email.toLowerCase();
    if (!emailVal.endsWith('@gmail.com')) {
      toast.error("Only @gmail.com accounts can recover passwords.");
      return;
    }

    const loadingToast = toast.loading("Verifying account...");

    try {
      // 1. Check if user exists and is active
      const userData = await db.users.getByEmail(emailVal);
      
      if (!userData || userData.is_active === false) {
        toast.error("Account not found or deactivated.", { id: loadingToast });
        return;
      }

      // 2. Generate a random 8-character temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // 3. Import hash service and update DB
      const { hashPassword } = await import('../services/security/passwordService');
      const hashedTemp = await hashPassword(tempPassword);

      await db.users.update(userData.id, { 
        password_hash: hashedTemp,
        is_verified: false // Forces them to go through OTP verification again
      });

      // 4. Send Email via EmailJS using the DYNAMIC HTML Template
      await emailjs.send(
        'service_178ko1n', 
        'template_qzkqkvf', 
        {
          to_email: emailVal,
          to_name: userData.full_name,
          otp_code: tempPassword, 
          // UPDATED: This matches your new HTML template variable
          email_subject_message: "You have requested to reset your password. Please use the temporary password below to log in and update your credentials immediately:",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const emailVal = formData.email.toLowerCase();
    if (!emailVal.endsWith('@gmail.com')) {
      setError('Access Denied: Only @gmail.com accounts are permitted.');
      setLoading(false);
      return; 
    }

    try {
      // 1. Fetch user to check deactivation
      const userData = await db.users.getByEmail(formData.email);

      if (userData && userData.is_active === false) {
        setError('This account has been deactivated. Please contact the Super Admin.');
        setLoading(false);
        return;
      }

      // 2. Login attempt
      await login(formData.email, formData.password);

      // 3. Redirect logic
      if (userData && userData.is_verified === false) {
        navigate('/verify-otp', { state: { email: formData.email } });
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message || 'Invalid credentials');
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
            <div className="error-message" style={{ marginBottom: '15px' }}>
              <span>{error}</span>
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
            />
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#94a3b8', 
                  fontSize: '12px', 
                  cursor: 'pointer',
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
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Signing in...
              </>
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