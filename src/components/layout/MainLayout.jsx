import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './NavBar';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react'; // Imported the hamburger icon
import './MainLayout.css';

/**
 * MainLayout Component
 * * Main application layout with sidebar and navbar
 * Wraps all authenticated pages
 * * @param {ReactNode} children - Page content (or use Outlet for routes)
 */
const MainLayout = ({ children }) => {
  // Smart state: Open by default on desktop, closed by default on mobile
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Close sidebar automatically on mobile when changing pages
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resizing (rotating phone, or scaling browser)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="main-layout">
      
      {/* 1. THE NEW MOBILE TOPBAR (Hidden on Desktop) */}
      <div className="mobile-topbar">
        <button 
          className="btn-icon" 
          onClick={toggleSidebar}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary-700)', padding: '5px' }}
        >
          <Menu size={28} />
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Barangay Dos</h2>
        <div style={{ width: 38 }}></div> {/* Invisible spacer to perfectly center title */}
      </div>

      {/* 2. EXISTING SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => {
          if (window.innerWidth <= 768) setSidebarOpen(false);
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

      {/* 4. SMOOTH MOBILE OVERLAY (Darkens screen when sidebar is open) */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      
    </div>
  );
};

export default MainLayout;