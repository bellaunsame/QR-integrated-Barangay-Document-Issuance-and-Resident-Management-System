import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the email passed from the Login page
  const email = location.state?.email;

  // Protect the route if accessed directly without an email
  if (!email) {
    navigate('/login');
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter a 6-digit code');

    setLoading(true);
    try {
      // 1. Fetch the user by email
      const user = await db.users.getByEmail(email);

      if (!user) {
        toast.error("User not found.");
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiry = new Date(user.otp_expiry);

      // 2. Check if OTP matches AND has not expired
      if (user.current_otp === otp) {
        
        if (now > expiry) {
          toast.error("This code has expired. Please log in again to get a new one.");
          setLoading(false);
          return;
        }

        // --- DEVICE VERIFICATION SUCCESSFUL ---
        
        // 3. Generate a unique Device ID for this browser and save it
        const newDeviceId = crypto.randomUUID();
        localStorage.setItem('trusted_device_id', newDeviceId);

        // 4. Add the new device to the user's known_devices array
        const updatedDevices = [...(user.known_devices || []), newDeviceId];

        // 5. Update the user in Supabase
        await db.users.update(user.id, { 
          is_verified: true, // Keep your original verification flag
          current_otp: null, // Clear the OTP so it can't be reused
          otp_expiry: null,  // Clear the expiry
          known_devices: updatedDevices // Save the trusted device
        });

        toast.success('Device verified successfully!');
        
        // 6. ROUTING LOGIC: Intercept for password change or go to dashboard
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
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Device'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;