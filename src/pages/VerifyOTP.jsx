import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext'; 
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser'; 
import { ShieldCheck, RefreshCw } from 'lucide-react';

// --- ADDED THIS IMPORT FOR THE SECURITY DASHBOARD ---
import { logAuth, ACTIONS } from '../services/security/auditLogger'; 

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60); 
  
  const location = useLocation();
  const navigate = useNavigate();
  const { startUserSession } = useAuth(); 
  
  const email = location.state?.email;

  if (!email) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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
        
        // 1. Check if this browser ALREADY has an ID. If not, make one.
        let deviceId = localStorage.getItem('trusted_device_id');
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem('trusted_device_id', deviceId);
        }

        // 2. Add the device to the user's known_devices array (preventing duplicates)
        const updatedDevices = [...(user.known_devices || [])];
        if (!updatedDevices.includes(deviceId)) {
          updatedDevices.push(deviceId);
        }

        // 3. Update the user in Supabase
        await db.users.update(user.id, { 
          is_verified: true, 
          current_otp: null, 
          otp_expiry: null,  
          known_devices: updatedDevices 
        });

        // 4. LOG THIS EVENT SO IT SHOWS UP ON THE DASHBOARD!
        await logAuth(ACTIONS.NEW_DEVICE_VERIFIED, user.id, { 
          email: user.email, 
          device_id: deviceId 
        });

        // 5. Start the session
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

  const handleResendOTP = async () => {
    if (resendTimer > 0) return; 

    const loadingToast = toast.loading("Generating new code...");
    setLoading(true);

    try {
      const user = await db.users.getByEmail(email);
      if (!user) throw new Error("User not found.");

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10);

      await db.users.update(user.id, {
        current_otp: newOtp,
        otp_expiry: expiryTime.toISOString()
      });

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
      setOtp(''); 
      setResendTimer(60); 

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