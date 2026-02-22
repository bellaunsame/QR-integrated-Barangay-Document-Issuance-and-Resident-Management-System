import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './NavBar';
import Sidebar from './Sidebar';
import './MainLayout.css';

/**
 * MainLayout Component
 * 
 * Main application layout with sidebar and navbar
 * Wraps all authenticated pages
 * 
 * @param {ReactNode} children - Page content (or use Outlet for routes)
 */
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="main-layout">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar onMenuClick={toggleSidebar} />
        
        <main className="page-content">
          {children || <Outlet />}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;