import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext'; // Added for session start
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser'; // Added for resending email
import { ShieldCheck, RefreshCw } from 'lucide-react';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60); // 60-second cooldown timer
  
  const location = useLocation();
  const navigate = useNavigate();
  const { startUserSession } = useAuth(); // Import the session starter
  
  // Get the email passed from the Login page
  const email = location.state?.email;

  // Protect the route if accessed directly without an email
  if (!email) {
    navigate('/login');
    return null;
  }

  // --- COUNTDOWN TIMER EFFECT FOR RESEND BUTTON ---
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // --- 1. HANDLE VERIFICATION ---
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter a 6-digit code');

    setLoading(true);
    try {
      const user = await db.users.getByEmail(email);

      if (!user) {
        toast.error("User not found.");
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiry = new Date(user.otp_expiry);

      if (user.current_otp === otp) {
        if (now > expiry) {
          toast.error("This code has expired. Please click Resend Code to get a new one.");
          setLoading(false);
          return;
        }

        // --- DEVICE VERIFICATION SUCCESSFUL ---
        const newDeviceId = crypto.randomUUID();
        localStorage.setItem('trusted_device_id', newDeviceId);

        const updatedDevices = [...(user.known_devices || []), newDeviceId];

        await db.users.update(user.id, { 
          is_verified: true, 
          current_otp: null, 
          otp_expiry: null,  
          known_devices: updatedDevices 
        });

        // Officially log the user in to the application
        await startUserSession(user);

        toast.success('Device verified successfully!');
        
        if (user.needs_password_change === true) {
          navigate('/force-password-change');
        } else {
          navigate('/dashboard');
        }

      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. HANDLE RESEND OTP ---
  const handleResendOTP = async () => {
    if (resendTimer > 0) return; // Prevent clicking if timer is active

    const loadingToast = toast.loading("Generating new code...");
    setLoading(true);

    try {
      const user = await db.users.getByEmail(email);
      if (!user) throw new Error("User not found.");

      // Generate new 6-digit OTP and new 10-minute expiry
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10);

      // Update Database
      await db.users.update(user.id, {
        current_otp: newOtp,
        otp_expiry: expiryTime.toISOString()
      });

      // Send via EmailJS (Make sure this matches the template ID in LoginPage)
      const EMAILJS_TEMPLATE_ID = 'template_qzkqkvf'; 
      
      await emailjs.send(
        'service_178ko1n', 
        EMAILJS_TEMPLATE_ID, 
        {
          to_email: email,
          to_name: user.full_name,
          name: user.full_name,
          user_name: user.full_name,
          otp_code: newOtp, 
          code: newOtp,
          message: newOtp,
          header_text: "System Security: New Verification Code",
          time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          qr_code_html: "" 
        },
        'pfTdQReY0nVV3CjnY'
      );

      toast.success("A new code has been sent to your email!", { id: loadingToast });
      setOtp(''); // Clear the input field
      setResendTimer(60); // Restart the 60-second cooldown

    } catch (error) {
      console.error("Resend Error:", error);
      toast.error("Failed to resend code. Please try again later.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <ShieldCheck size={48} color="#3b82f6" />
          <h1 className="login-title">Device Verification</h1>
          <p className="login-subtitle">
            A 6-digit security code was sent to <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
               <><div className="spinner-small"></div> Verifying...</>
            ) : 'Verify Device'}
          </button>
        </form>

        {/* --- NEW: RESEND OTP CONTROLS --- */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          Didn't receive the code? <br />
          <button 
            type="button" 
            onClick={handleResendOTP}
            disabled={resendTimer > 0 || loading}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: resendTimer > 0 ? '#94a3b8' : '#3b82f6', 
              fontWeight: 'bold',
              cursor: resendTimer > 0 || loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading && resendTimer === 0 ? "spin-animation" : ""} />
            {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend Code'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VerifyOTP;