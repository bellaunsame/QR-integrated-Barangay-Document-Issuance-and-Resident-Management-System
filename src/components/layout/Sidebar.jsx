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
  ChevronUp,
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [counts, setCounts] = useState({
    residents: 0,
    pending: 0,
    completed: 0,
    released: 0,
    new_devices: 0,
    new_blotters: 0,
    new_equipment: 0
  });

  // --- INTEGRATED REALTIME LOGIC ---
  useEffect(() => {
    fetchCounts();

    window.addEventListener('docs_updated', fetchCounts);

    const residentChannel = supabase.channel('sidebar-residents-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => {
        fetchCounts();
      }).subscribe();

    const docsChannel = supabase.channel('sidebar-docs-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        setTimeout(() => fetchCounts(), 500); 
      }).subscribe();

    const auditChannel = supabase.channel('sidebar-audit-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        setTimeout(() => fetchCounts(), 500);
      }).subscribe();

    const blotterChannel = supabase.channel('sidebar-blotter-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blotter_records' }, () => {
        setTimeout(() => fetchCounts(), 500);
      }).subscribe();

    const equipmentChannel = supabase.channel('sidebar-equipment-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'borrowing_records' }, () => {
        setTimeout(() => fetchCounts(), 500);
      }).subscribe();

    return () => {
      window.removeEventListener('docs_updated', fetchCounts);
      supabase.removeChannel(residentChannel);
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(blotterChannel);
      supabase.removeChannel(equipmentChannel);
    };
  }, []);

  const getSinceTime = (storageKey) => {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const lastViewedStr = localStorage.getItem(storageKey);
    
    if (lastViewedStr) {
      const lastViewed = new Date(lastViewedStr);
      if (lastViewed > yesterday) return lastViewed.toISOString();
    }
    return yesterday.toISOString();
  };

  const fetchCounts = async () => {
    try {
      const sinceSecurity = getSinceTime('last_viewed_security');
      const sinceBlotter = getSinceTime('last_viewed_blotter');
      const sinceEquipment = getSinceTime('last_viewed_equipment');

      const [resCount, pendingCount, completedCount, releasedCount, newDevicesCount, newBlottersCount, newEquipmentCount] = await Promise.all([
        supabase.from('residents').select('*', { count: 'exact', head: true }),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'released'),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'NEW_DEVICE_VERIFIED').gte('created_at', sinceSecurity),
        supabase.from('blotter_records').select('*', { count: 'exact', head: true }).gte('created_at', sinceBlotter),
        supabase.from('borrowing_records').select('*', { count: 'exact', head: true }).gte('created_at', sinceEquipment)
      ]);

      setCounts({
        residents: resCount.count || 0,
        pending: pendingCount.count || 0,
        completed: completedCount.count || 0,
        released: releasedCount.count || 0,
        new_devices: newDevicesCount.count || 0,
        new_blotters: newBlottersCount.count || 0,
        new_equipment: newEquipmentCount.count || 0
      });
    } catch (error) {
      console.error("Error fetching sidebar counts:", error);
    }
  };

  useEffect(() => {
    if (location.pathname.includes('/documents')) {
      setIsDocsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/security') {
      localStorage.setItem('last_viewed_security', new Date().toISOString());
      setCounts(prev => ({ ...prev, new_devices: 0 }));
    }
    if (location.pathname === '/blotter') {
      localStorage.setItem('last_viewed_blotter', new Date().toISOString());
      setCounts(prev => ({ ...prev, new_blotters: 0 }));
    }
    if (location.pathname === '/equipment') {
      localStorage.setItem('last_viewed_equipment', new Date().toISOString());
      setCounts(prev => ({ ...prev, new_equipment: 0 }));
    }
  }, [location.pathname]);

  // ==========================================
  // EXPLICIT ROLE-BASED MENU ITEMS
  // ==========================================
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
      badge: counts.residents > 0 ? { text: counts.residents, color: '#dbeafe', textColor: '#1d4ed8' } : null
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
      roles: ['admin', 'secretary', 'clerk'] // Hide from view-only since scanning implies processing
    },
    {
      icon: <ShieldCheck size={20} />,
      label: 'Security Dashboard',
      path: '/security',
      roles: ['admin'],
      badge: counts.new_devices > 0 ? { text: counts.new_devices, color: '#fef3c7', textColor: '#b45309' } : null 
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

  // Safe manual check for roles
  const visibleMenuItems = menuItems.filter(item => {
    if (item.roles && user?.role) {
      return item.roles.includes(user.role);
    }
    if (item.permission) {
      return user?.role === 'admin' || hasPermission(item.permission);
    }
    return true; 
  });

  // Safe manual check for Documents Dropdown
  const canViewDocuments = ['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_captain', 'view_only'].includes(user?.role);

  return (
    <>
      <style>{`
        .nav-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .badge-pulse {
          animation: pulse-orange 2s infinite;
          background-color: #fef3c7;
          color: #b45309;
          box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
        }
        @keyframes pulse-orange {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        /* 👇 FIX: Ensures the sidebar never expands past the screen 👇 */
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden; 
          box-sizing: border-box;
        }
        .sidebar-header {
          flex-shrink: 0; /* Protect header from shrinking */
        }
        .sidebar-nav {
          flex: 1 1 auto;
          overflow-y: auto;
          min-height: 0; /* Crucial for flexbox scrolling */
        }
      `}</style>

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${effectiveCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-wrapper">
            <div className="logo-icon"><img src={logo} alt="Barangay Logo" /></div>
            {!effectiveCollapsed && (
              <div className="logo-text">
                <h1 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>Barangay Dos</h1>
                <p style={{ fontSize: '0.65rem', lineHeight: '1.2', whiteSpace: 'normal', paddingRight: '10px' }}>
                  Online Document Record & Services Management System
                </p>
              </div>
            )}
          </div>
          <button className="sidebar-collapse-btn desktop-only" onClick={onToggleCollapse}>
            {effectiveCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!effectiveCollapsed && <div className="nav-section-title">Main Menu</div>}
            
            {/* FIRST 2 ITEMS (Dashboard & Residents, or Blotter depending on role) */}
            {visibleMenuItems.slice(0, 2).map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">{item.icon}</span>
                {!effectiveCollapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge" style={{ backgroundColor: item.badge.color, color: item.badge.textColor }}>
                        {item.badge.text > 99 ? '99+' : item.badge.text}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* DOCUMENTS DROPDOWN */}
            {canViewDocuments && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div onClick={() => { if (effectiveCollapsed) onToggleCollapse(); setIsDocsOpen(!isDocsOpen); navigate('/documents'); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', cursor: 'pointer',
                    backgroundColor: location.pathname.includes('/documents') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: location.pathname.includes('/documents') ? 'var(--primary-600)' : 'var(--text-secondary)',
                    borderLeft: location.pathname.includes('/documents') ? '3px solid var(--primary-600)' : '3px solid transparent',
                    fontWeight: 500, transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                    <span className="nav-icon" style={{ display: 'flex' }}><FileText size={20} /></span>
                    {!effectiveCollapsed && (
                      <>
                        <span className="nav-label">Documents</span>
                        {!isDocsOpen && counts.pending > 0 && <span className="nav-badge badge-pulse">{counts.pending}</span>}
                      </>
                    )}
                  </div>
                  {!effectiveCollapsed && <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>{isDocsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>}
                </div>

                {!effectiveCollapsed && isDocsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--neutral-50)', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <NavLink to="/documents?filter=pending" onClick={onClose}
                      style={({isActive}) => ({
                        padding: '0.6rem 1.5rem 0.6rem 3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', fontSize: '0.85rem', 
                        color: location.search === '?filter=pending' ? 'var(--primary-700)' : 'var(--text-secondary)', fontWeight: location.search === '?filter=pending' ? '600' : '500',
                        backgroundColor: location.search === '?filter=pending' ? '#e0f2fe' : 'transparent'
                      })}
                    >
                      <Clock size={16} color="#f59e0b" /> Pending
                      {counts.pending > 0 && <span className="nav-badge badge-pulse">{counts.pending}</span>}
                    </NavLink>

                    <NavLink to="/documents?filter=completed" onClick={onClose}
                      style={({isActive}) => ({
                        padding: '0.6rem 1.5rem 0.6rem 3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', fontSize: '0.85rem', 
                        color: location.search === '?filter=completed' ? 'var(--primary-700)' : 'var(--text-secondary)', fontWeight: location.search === '?filter=completed' ? '600' : '500',
                        backgroundColor: location.search === '?filter=completed' ? '#e0f2fe' : 'transparent'
                      })}
                    >
                      <CheckCircle size={16} color="#10b981" /> Completed
                      {counts.completed > 0 && <span className="nav-badge" style={{ backgroundColor: '#d1fae5', color: '#047857' }}>{counts.completed}</span>}
                    </NavLink>

                    <NavLink to="/documents?filter=released" onClick={onClose}
                      style={({isActive}) => ({
                        padding: '0.6rem 1.5rem 0.6rem 3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', fontSize: '0.85rem', 
                        color: location.search === '?filter=released' ? 'var(--primary-700)' : 'var(--text-secondary)', fontWeight: location.search === '?filter=released' ? '600' : '500',
                        backgroundColor: location.search === '?filter=released' ? '#e0f2fe' : 'transparent'
                      })}
                    >
                      <Send size={16} color="#3b82f6" /> Released
                      {counts.released > 0 && <span className="nav-badge" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{counts.released}</span>}
                    </NavLink>

                    <NavLink to="/documents?filter=archived" onClick={onClose}
                      style={({isActive}) => ({
                        padding: '0.6rem 1.5rem 0.6rem 3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', fontSize: '0.85rem', 
                        color: location.search === '?filter=archived' ? 'var(--primary-700)' : 'var(--text-secondary)', fontWeight: location.search === '?filter=archived' ? '600' : '500',
                        backgroundColor: location.search === '?filter=archived' ? '#e0f2fe' : 'transparent'
                      })}
                    >
                      <Archive size={16} color="#64748b" /> Archive
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* THE REST OF THE MENU ITEMS */}
            {visibleMenuItems.slice(2).map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">{item.icon}</span>
                {!effectiveCollapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge" style={{ backgroundColor: item.badge.color, color: item.badge.textColor }}>
                        {item.badge.text > 99 ? '99+' : item.badge.text}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* 👇 FIX: Added flexShrink: 0 so the footer never gets pushed off screen 👇 */}
        <div style={{ marginTop: 'auto', flexShrink: 0, padding: '20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', paddingBottom: '30px' }}>
          
          {/* Profile Nav Link */}
          <NavLink 
            to="/profile" 
            onClick={onClose} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', marginBottom: '10px', borderRadius: '8px', transition: 'all 0.2s', justifyContent: effectiveCollapsed ? 'center' : 'flex-start' }}
          >
            <User size={18} /> {!effectiveCollapsed && 'My Profile'}
          </NavLink>

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px', justifyContent: effectiveCollapsed ? 'center' : 'flex-start' }}
          >
            <LogOut size={18} /> {!effectiveCollapsed && 'Logout'}
          </button>

          {/* User Details block */}
          {!effectiveCollapsed && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Barangay User'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                  {user?.role?.replace('_', ' ') || 'Admin'}
                </span>
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
};

export default Sidebar;