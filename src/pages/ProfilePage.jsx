import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Lock, Save, Key } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // In production, validate current password and update
      await updateProfile({ password: passwordData.new_password });
      
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      admin: 'System Administrator',
      clerk: 'Barangay Clerk',
      record_keeper: 'Record Keeper'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      admin: 'badge-danger',
      clerk: 'badge-primary',
      record_keeper: 'badge-info'
    };
    return roleMap[role] || 'badge-secondary';
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Overview */}
        <div className="card profile-overview">
          <div className="profile-avatar">
            <User size={64} />
          </div>
          <h2>{user?.full_name}</h2>
          <p className="profile-email">{user?.email}</p>
          <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
            <Shield size={14} />
            {getRoleLabel(user?.role)}
          </span>
          
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">Member Since</span>
              <span className="stat-value">
                {new Date(user?.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className="stat-value">
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="card">
          <div className="card-header">
            <div className="header-with-icon">
              <User size={24} />
              <h2>Profile Information</h2>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit}>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  value={getRoleLabel(user?.role)}
                  disabled
                />
                <small>Contact an administrator to change your role</small>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="card">
          <div className="card-header">
            <div className="header-with-icon">
              <Lock size={24} />
              <h2>Change Password</h2>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="current_password">Current Password</label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                  placeholder="Enter new password"
                />
                <small>Minimum 8 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="password-requirements">
                <h4>Password Requirements:</h4>
                <ul>
                  <li className={passwordData.new_password.length >= 8 ? 'valid' : ''}>
                    At least 8 characters long
                  </li>
                  <li className={passwordData.new_password === passwordData.confirm_password && passwordData.new_password ? 'valid' : ''}>
                    Passwords match
                  </li>
                </ul>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Changing...
                  </>
                ) : (
                  <>
                    <Key size={20} />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;