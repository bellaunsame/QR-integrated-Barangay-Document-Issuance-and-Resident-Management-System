import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  QrCode,
  LogOut,
  ShieldCheck,
  Clock,
  CheckCircle,
  Send,
  Archive,
  Scale,
  Package,
  Megaphone
} from 'lucide-react';
import logo from "../../assets/brgy.2-icon.png";
import './Sidebar.css';

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [counts, setCounts] = useState({
    residents: 0,
    pending: 0,
    completed: 0,
    released: 0,
    new_devices: 0,
    new_blotters: 0,
    new_equipment: 0,
    nudges: 0 
  });

  // --- REALTIME SYNC ---
  useEffect(() => {
    fetchCounts();

    window.addEventListener('docs_updated', fetchCounts);

    const nudgeChannel = supabase.channel('sidebar-nudges-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: "type=eq.system" }, () => {
        fetchCounts();
      }).subscribe();

    const residentChannel = supabase.channel('sidebar-residents-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => {
        fetchCounts();
      }).subscribe();

    const docsChannel = supabase.channel('sidebar-docs-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        setTimeout(() => fetchCounts(), 500); 
      }).subscribe();

    return () => {
      window.removeEventListener('docs_updated', fetchCounts);
      supabase.removeChannel(residentChannel);
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(nudgeChannel);
    };
  }, []);

  const fetchCounts = async () => {
    try {
      const [resCount, pendingCount, completedCount, releasedCount, nudgeCount] = await Promise.all([
        supabase.from('residents').select('*', { count: 'exact', head: true }),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'released'),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .eq('type', 'system')
          .ilike('title', '%Nudge%')
      ]);

      setCounts(prev => ({
        ...prev,
        residents: resCount.count || 0,
        pending: pendingCount.count || 0,
        completed: completedCount.count || 0,
        released: releasedCount.count || 0,
        nudges: nudgeCount.count || 0
      }));
    } catch (error) {
      console.error("Error fetching sidebar counts:", error);
    }
  };

  const menuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      path: '/dashboard',
      roles: ['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_investigator', 'barangay_captain', 'view_only'] 
    },
    {
      icon: <Users size={20} />,
      label: 'Residents',
      path: '/residents',
      roles: ['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_captain', 'view_only'], 
      badge: counts.nudges > 0 
        ? { text: counts.nudges, className: 'badge-pulse-red' } 
        : (counts.residents > 0 ? { text: counts.residents, color: '#dbeafe', textColor: '#1d4ed8' } : null)
    },
    {
      icon: <Scale size={20} />,
      label: 'Incident & Blotter Reports',
      path: '/blotter',
      roles: ['admin', 'secretary', 'barangay_investigator', 'barangay_captain', 'view_only'],
      badge: counts.new_blotters > 0 ? { text: counts.new_blotters, color: '#fee2e2', textColor: '#b91c1c' } : null 
    },
    {
      icon: <Package size={20} />,
      label: 'Equipment',
      path: '/equipment',
      roles: ['admin', 'secretary', 'clerk', 'barangay_captain', 'view_only'],
      badge: counts.new_equipment > 0 ? { text: counts.new_equipment, color: '#fef3c7', textColor: '#b45309' } : null 
    },
    {
      icon: <Megaphone size={20} />,
      label: 'Announcements',
      path: '/announcements',
      roles: ['admin', 'secretary', 'clerk', 'barangay_captain', 'view_only']
    },
    {
      icon: <FileCheck size={20} />,
      label: 'Templates',
      path: '/templates',
      roles: ['admin', 'record_keeper'] 
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
      roles: ['admin', 'secretary', 'clerk']
    },
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

  const visibleMenuItems = menuItems.filter(item => {
    return item.roles?.includes(user?.role);
  });

  const canViewDocuments = ['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_captain', 'view_only'].includes(user?.role);
  const hasHighPriority = counts.nudges > 0;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
          <div className="logo-icon"><img src={logo} alt="Barangay Logo" /></div>
          {!isCollapsed && (
            <div className="logo-text">
              <h1 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>Barangay Dos</h1>
              <p style={{ fontSize: '0.65rem', lineHeight: '1.2' }}>Management System</p>
            </div>
          )}
        </div>
        <button className="sidebar-collapse-btn desktop-only" onClick={onToggleCollapse}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!isCollapsed && <div className="nav-section-title">Main Menu</div>}
          
          {visibleMenuItems.slice(0, 2).map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span 
                      className={`nav-badge ${item.badge.className || ''}`} 
                      style={{ backgroundColor: item.badge.color, color: item.badge.textColor }}
                    >
                      {item.badge.text}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* DOCUMENTS DROPDOWN */}
          {canViewDocuments && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div 
                onClick={() => { 
                  if (isCollapsed) onToggleCollapse(); 
                  setIsDocsOpen(!isDocsOpen); 
                  // Ensure clicking the parent navigates to the documents page
                  if (!location.pathname.includes('/documents')) {
                    navigate('/documents');
                  }
                }}
                className={`nav-item ${location.pathname.includes('/documents') ? 'active' : ''}`}
              >
                <span className="nav-icon"><FileText size={20} /></span>
                {!isCollapsed && (
                  <>
                    <span className="nav-label">Documents</span>
                    {!isDocsOpen && counts.pending > 0 && (
                      <span className={`nav-badge ${hasHighPriority ? 'badge-pulse-red' : 'badge-pulse-orange'}`}>
                        {counts.pending}
                      </span>
                    )}
                    <span className="dropdown-arrow" style={{ transform: isDocsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ChevronDown size={16} />
                    </span>
                  </>
                )}
              </div>

              {/* The Dropdown Menu (No longer conditionally unmounted) */}
              <div className={`dropdown-menu ${isDocsOpen && !isCollapsed ? 'open' : ''}`}>
                <NavLink to="/documents?filter=pending" className={({ isActive }) => `dropdown-item ${location.search === '?filter=pending' ? 'active' : ''}`} onClick={onClose}>
                  <Clock size={16} color="#f59e0b" /> Pending
                  {counts.pending > 0 && <span className={`nav-badge ${hasHighPriority ? 'badge-pulse-red' : ''}`}>{counts.pending}</span>}
                </NavLink>
                <NavLink to="/documents?filter=completed" className={({ isActive }) => `dropdown-item ${location.search === '?filter=completed' ? 'active' : ''}`} onClick={onClose}>
                  <CheckCircle size={16} color="#10b981" /> Completed
                </NavLink>
                <NavLink to="/documents?filter=released" className={({ isActive }) => `dropdown-item ${location.search === '?filter=released' ? 'active' : ''}`} onClick={onClose}>
                  <Send size={16} color="#3b82f6" /> Released
                </NavLink>
                <NavLink to="/documents?filter=archived" className={({ isActive }) => `dropdown-item ${location.search === '?filter=archived' ? 'active' : ''}`} onClick={onClose}>
                  <Archive size={16} color="#64748b" /> Archive
                </NavLink>
              </div>
            </div>
          )}

          {visibleMenuItems.slice(2).map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && <span className="nav-badge" style={{ backgroundColor: item.badge.color, color: item.badge.textColor }}>{item.badge.text}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon"><LogOut size={20} /></span>
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;