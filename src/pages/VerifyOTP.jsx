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

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter a 6-digit code');

    setLoading(true);
    try {
      // 1. Check if the OTP matches for this email
      const user = await db.users.getByEmail(email);

      if (user && user.otp_code === otp) {
        // 2. Update the user to verified
        await db.users.update(user.id, { 
          is_verified: true,
          otp_code: null // Clear the code after use
        });

        toast.success('Account verified successfully!');
        
        // --- 3. NEW LOGIC: INTERCEPT FOR PASSWORD CHANGE ---
        if (user.needs_password_change === true) {
          // Send them to the forced password reset screen
          navigate('/force-password-change');
        } else {
          // Standard login sends them to the dashboard
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
          <h1 className="login-title">Gmail Verification</h1>
          <p className="login-subtitle">
            A 6-digit code was sent to <strong>{email}</strong>
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
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;