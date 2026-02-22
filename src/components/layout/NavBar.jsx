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
  // Removed showNotifications state

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
            <UserAvatar user={user} size="sm" />
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

              <button className="dropdown-item danger" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay - Updated to only handle User Menu */}
      {showUserMenu && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;