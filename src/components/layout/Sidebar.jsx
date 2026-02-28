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
  Archive
} from 'lucide-react';
import logo from "../../assets/brgy.2-icon.png";
import './Sidebar.css';

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [counts, setCounts] = useState({
    residents: 0,
    pending: 0,
    completed: 0,
    released: 0
  });

  // --- INTEGRATED REALTIME LOGIC ---
  useEffect(() => {
    fetchCounts();

    // Force update when DocumentRequestsPage tells us to
    window.addEventListener('docs_updated', fetchCounts);

    const residentChannel = supabase.channel('sidebar-residents-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'residents' 
      }, () => {
        fetchCounts();
      }).subscribe();

    const docsChannel = supabase.channel('sidebar-docs-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'document_requests' 
      }, () => {
        setTimeout(() => {
            fetchCounts(); 
        }, 500); 
      }).subscribe();

    return () => {
      window.removeEventListener('docs_updated', fetchCounts);
      supabase.removeChannel(residentChannel);
      supabase.removeChannel(docsChannel);
    };
  }, []);

  const fetchCounts = async () => {
    try {
      const [resCount, pendingCount, completedCount, releasedCount] = await Promise.all([
        supabase.from('residents').select('*', { count: 'exact', head: true }),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'released')
      ]);

      setCounts({
        residents: resCount.count || 0,
        pending: pendingCount.count || 0,
        completed: completedCount.count || 0,
        released: releasedCount.count || 0
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

  const menuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      path: '/dashboard',
      roles: ['admin', 'clerk', 'record_keeper', 'view_only'] 
    },
    {
      icon: <Users size={20} />,
      label: 'Residents',
      path: '/residents',
      roles: ['admin', 'record_keeper', 'view_only', 'clerk'],
      badge: counts.residents > 0 ? { text: counts.residents, color: '#dbeafe', textColor: '#1d4ed8' } : null
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

  const visibleMenuItems = menuItems.filter(item => 
    !item.roles || hasRole(item.roles)
  );

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
      `}</style>

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon"><img src={logo} alt="Barangay Logo" /></div>
            {!isCollapsed && (
              <div className="logo-text">
                <h1>Barangay Dos</h1>
                <p>Document Issuance System</p>
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
                      <span className="nav-badge" style={{ backgroundColor: item.badge.color, color: item.badge.textColor }}>
                        {item.badge.text > 99 ? '99+' : item.badge.text}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {hasRole(['admin', 'clerk', 'record_keeper', 'view_only']) && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div onClick={() => { if (isCollapsed) onToggleCollapse(); setIsDocsOpen(!isDocsOpen); navigate('/documents'); }}
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
                    {!isCollapsed && (
                      <>
                        <span className="nav-label">Documents</span>
                        {!isDocsOpen && counts.pending > 0 && <span className="nav-badge badge-pulse">{counts.pending}</span>}
                      </>
                    )}
                  </div>
                  {!isCollapsed && <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>{isDocsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>}
                </div>

                {!isCollapsed && isDocsOpen && (
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

            {visibleMenuItems.slice(2).map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="nav-icon"><User size={20} /></span>
            {!isCollapsed && <span className="nav-label">My Profile</span>}
          </NavLink>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><LogOut size={20} /></span>
            {!isCollapsed && <span className="nav-label">Logout</span>}
          </button>
          {!isCollapsed && user && (
            <div className="sidebar-user">
              <div className="user-avatar-small">{user.full_name?.charAt(0) || 'U'}</div>
              <div className="user-details">
                <div className="user-name-small">{user.full_name}</div>
                <div className="user-role-small">{user.role?.replace('_', ' ')}</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;