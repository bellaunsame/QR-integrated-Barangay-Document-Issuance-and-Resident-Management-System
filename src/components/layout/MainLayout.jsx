import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './NavBar';
import Sidebar from './Sidebar';
import { Menu, User, Settings, LogOut } from 'lucide-react'; // Imported the hamburger icon
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../auth';
import './MainLayout.css';

/**
 * MainLayout Component
 * * Main application layout with sidebar and navbar
 * Wraps all authenticated pages
 * * @param {ReactNode} children - Page content (or use Outlet for routes)
 */
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileAvatarMenu, setShowMobileAvatarMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close sidebar automatically on mobile when changing pages
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resizing (rotating phone, or scaling browser)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto collapse sidebar when clicking outside on desktop
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth > 1024 && !sidebarCollapsed) {
        if (!event.target.closest('.sidebar') && !event.target.closest('.btn-icon')) {
          setSidebarCollapsed(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarDirectClick = (e) => {
    e.stopPropagation();
    navigate('/profile');
    setShowMobileAvatarMenu(false);
  };

  return (
    <div className="main-layout">
      
      <div className="mobile-topbar">
        <button 
          className="btn-icon" 
          onClick={toggleSidebar}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary-700)', padding: '5px' }}
        >
          <Menu size={28} />
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-700)' }}>Barangay Dos</h2>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMobileAvatarMenu(!showMobileAvatarMenu)}
            style={{ background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', display: 'flex' }}
          >
            <div onClick={handleAvatarDirectClick} title="Go to Profile">
              <UserAvatar user={user} size="sm" />
            </div>
          </button>
          
          {showMobileAvatarMenu && (
            <div className="dropdown-menu user-menu" style={{ position: 'absolute', top: '100%', right: '0', zIndex: 1000, marginTop: '8px' }}>
              <div className="user-menu-header">
                <UserAvatar user={user} size="md" />
                <div>
                  <div className="user-menu-name">{user?.full_name}</div>
                  <div className="user-menu-email">{user?.email}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { navigate('/profile'); setShowMobileAvatarMenu(false); }}>
                <User size={18} /><span>My Profile</span>
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setShowMobileAvatarMenu(false); }}>
                <Settings size={18} /><span>Settings</span>
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={() => { setShowMobileAvatarMenu(false); setShowLogoutConfirm(true); }}>
                <LogOut size={18} /><span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showMobileAvatarMenu && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
          onClick={() => setShowMobileAvatarMenu(false)}
        />
      )}

      {/* 2. EXISTING SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => {
          if (window.innerWidth <= 1024) setSidebarOpen(false);
        }}
        onToggleCollapse={toggleCollapse}
      />
      
      {/* 3. MAIN CONTENT */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar onMenuClick={toggleSidebar} />
        
        <main className="page-content">
          {children || <Outlet />}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '16px',
              padding: '2rem', width: '85%', maxWidth: '360px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <LogOut size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Confirm Logout</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to logout from your account?</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SMOOTH MOBILE OVERLAY */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      
    </div>
  );
};

export default MainLayout;