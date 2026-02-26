import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, supabase } from '../services/supabaseClient';
import { Lock, Save, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

import brgyBackground from '../assets/Brgyhall.jpg'; 

const ForcePasswordChange = () => {
  const { user } = useAuth(); // Gets logged-in user context
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Securing your account...');

    try {
      // 1. Hash the new password for your custom users table
      const { hashPassword } = await import('../services/security/passwordService');
      const hashedNewPassword = await hashPassword(passwords.newPassword);

      // 2. Update your custom database record AND flip the flag to false
      await db.users.update(user.id, { 
        password_hash: hashedNewPassword,
        needs_password_change: false // <--- Lifts the restriction!
      });

      toast.success('Password updated successfully!', { id: loadingToast });
      
      // 3. Let them into the system!
      navigate('/dashboard');

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update password.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${brgyBackground})`,
        backgroundSize: 'cover',        
        backgroundPosition: 'center',   
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '30px', backgroundColor: '#1e293b', borderRadius: '12px', color: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <ShieldAlert size={48} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Action Required</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            You are currently using a temporary password. For security reasons, you must set a new permanent password before accessing the Barangay System.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                placeholder="Enter new password (min 8 chars)"
                required
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input
                type="password"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                placeholder="Re-type new password"
                required
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Securing Account...' : <><Save size={18} /> Save & Continue</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;