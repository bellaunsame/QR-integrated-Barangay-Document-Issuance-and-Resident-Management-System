import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, Search, Settings, LogOut, User } from 'lucide-react'; // Removed Bell icon
import { UserAvatar } from '../auth';
import './Navbar.css';

/**
 * Navbar Component
 * * Top navigation bar with user menu - Notifications removed
 */
const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Removed showNotifications state

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    navigate('/profile');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>

      
      </div>

      <div className="navbar-right">
        {/* Notifications Block Removed */}

        {/* User Menu */}
        <div className="navbar-item">
          <button
            className="navbar-user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div onClick={(e) => { e.stopPropagation(); handleAvatarClick(); }} style={{ cursor: 'pointer' }}>
              <UserAvatar user={user} size="sm" />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.full_name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </button>

          {showUserMenu && (
            <div className="dropdown-menu user-menu">
              <div className="user-menu-header">
                <UserAvatar user={user} size="md" />
                <div>
                  <div className="user-menu-name">{user?.full_name}</div>
                  <div className="user-menu-email">{user?.email}</div>
                </div>
              </div>

              <div className="dropdown-divider" />

              <button
                className="dropdown-item"
                onClick={() => {
                  navigate('/profile');
                  setShowUserMenu(false);
                }}
              >
                <User size={18} />
                <span>My Profile</span>
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>

              <div className="dropdown-divider" />

              <button className="dropdown-item danger" onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showUserMenu && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: '16px',
              padding: '2rem', width: '90%', maxWidth: '380px',
              boxShadow: 'var(--shadow-xl)', textAlign: 'center',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <LogOut size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirm Logout</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Are you sure you want to logout from your account?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '0.625rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '0.625rem 1rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;