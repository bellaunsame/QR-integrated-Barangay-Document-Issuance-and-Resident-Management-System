import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Activity,
  LogOut,
  ShieldCheck // Grouped the imports for cleanliness
} from 'lucide-react';
import logo from "../../assets/brgy.2-icon.png";
import './Sidebar.css';

/**
 * Sidebar Component
 * * Navigation sidebar with menu items
 * Supports collapsed mode and role-based menu items
 */
const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  // --- MENU ITEMS CONFIGURATION ---
  const menuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      path: '/dashboard',
      // ADDED view_only
      roles: ['admin', 'clerk', 'record_keeper', 'view_only'] 
    },
    {
      icon: <Users size={20} />,
      label: 'Residents',
      path: '/residents',
      // ADDED view_only
      roles: ['admin', 'record_keeper', 'view_only'] 
    },
    {
      icon: <FileText size={20} />,
      label: 'Documents',
      path: '/documents',
      // ADDED view_only
      roles: ['admin', 'clerk', 'record_keeper', 'view_only'] 
    },
    {
      icon: <FileCheck size={20} />,
      label: 'Templates',
      path: '/templates',
      roles: ['admin']
    },
    {
      icon: <User size={20} />,
      label: 'Users',
      path: '/users',
      roles: ['admin']
    },
    {
      icon: <QrCode size={20} />,
      label: 'QR Scanner',
      path: '/scan',
      roles: ['admin', 'clerk'] 
    },
    /* {
      icon: <Activity size={20} />,
      label: 'Activity Logs',
      path: '/activity-logs',
      roles: ['admin']
    }, */
    {
      icon: <ShieldCheck size={20} />,
      label: 'Security Dashboard',
      path: '/security',
      roles: ['admin']
    },
    {
      icon: <Settings size={20} />,
      label: 'Settings',
      path: '/settings',
      roles: ['admin']
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    !item.roles || hasRole(item.roles)
  );

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <img src={logo} alt="Barangay Logo" />
            </div>
            {!isCollapsed && (
              <div className="logo-text">
                <h1>Barangay</h1>
                <p>Document System</p>
              </div>
            )}
          </div>

          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!isCollapsed && <div className="nav-section-title">Main Menu</div>}
            {visibleMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
            onClick={onClose}
            title={isCollapsed ? 'My Profile' : ''}
          >
            <span className="nav-icon"><User size={20} /></span>
            {!isCollapsed && <span className="nav-label">My Profile</span>}
          </NavLink>

          <button
            className="nav-item logout-btn"
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : ''}
          >
            <span className="nav-icon"><LogOut size={20} /></span>
            {!isCollapsed && <span className="nav-label">Logout</span>}
          </button>

          {!isCollapsed && user && (
            <div className="sidebar-user">
              <div className="user-avatar-small">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name-small">{user.full_name}</div>
                {/* Cleaned up role display so it looks like "View Only" instead of "view_only" */}
                <div className="user-role-small">
                  {user.role === 'view_only' ? 'View Only' : user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;