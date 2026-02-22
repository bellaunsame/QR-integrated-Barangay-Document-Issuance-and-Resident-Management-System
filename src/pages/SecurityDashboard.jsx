import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, supabase } from '../services/supabaseClient'; 
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Card, Table, Badge, Input, Button, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import toast from 'react-hot-toast'; 
import { 
  Activity, Search, Filter, Download, RefreshCw, User, FileText, Settings,
  Trash2, Edit, Plus, Eye, Calendar, Clock, Wifi, WifiOff, X, Shield, 
  AlertTriangle, Monitor, Smartphone, Tablet, MapPin, CheckCircle, XCircle, LogOut
} from 'lucide-react';
import { usePagination } from '../hooks';
import { getRelativeTime } from '../utils/dateUtils';
import { getSecuritySummary, queryAuditLogs, exportAuditLogs, SEVERITY } from '../services/security/auditLogger';

import './SecurityDashboard.css'; 

// ==========================================
// SHARED HELPER FUNCTION
// ==========================================
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  let parsedString = dateString.replace(' ', 'T');
  if (!/(Z|[+-]\d{2}(:\d{2})?)$/.test(parsedString)) {
    parsedString += 'Z';
  }
  return new Date(parsedString).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

// ==========================================
// TAB 1: SECURITY AUDIT
// ==========================================
const SecurityAuditTab = () => {
  const [summary, setSummary] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    const summaryData = await getSecuritySummary(7);
    const logs = await queryAuditLogs({ limit: 10 });
    setSummary(summaryData);
    setRecentLogs(logs);
  };

  const handleExport = async () => {
    const csv = await exportAuditLogs({}, 'csv');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (!summary) return <LoadingSpinner text="Loading audit data..." />;

  return (
    <div className="security-audit-tab fade-in">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>Security Overview</h2>
        <Button onClick={handleExport} icon={<Download size={20} />} variant="secondary">
          Export Logs
        </Button>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card>
          <div className="stat text-center">
            <Shield size={32} color="var(--primary-600)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>Total Events</h3>
            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.totalEvents}</p>
          </div>
        </Card>
        <Card>
          <div className="stat text-center">
            <AlertTriangle size={32} color="var(--warning)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>Failed Logins</h3>
            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.failedLogins}</p>
          </div>
        </Card>
        <Card>
          <div className="stat text-center">
            <XCircle size={32} color="var(--error)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>Critical Events</h3>
            <p className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--error)' }}>{summary.criticalEvents}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ marginBottom: '1rem' }}>Recent Security Events</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>User</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>
                    <Badge variant={log.severity === 'CRITICAL' ? 'danger' : 'gray'}>{log.action}</Badge>
                  </td>
                  <td>{log.user_id || 'System'}</td>
                  <td>{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ==========================================
// TAB 2: ACTIVITY LOGS
// ==========================================
const ActivityLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting'); 
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ action: '', table_name: '', user_id: '', date_from: '', date_to: '' });

  const { currentPage, totalPages, currentData, goToPage } = usePagination(filteredLogs(), 20);

  useEffect(() => {
    loadLogs();
    const activitySubscription = supabase.channel('realtime-activity-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, async (payload) => {
        const newLog = payload.new;
        if (newLog.user_id) {
          const { data: userData } = await supabase.from('users').select('id, full_name, email, role').eq('id', newLog.user_id).maybeSingle();
          if (userData) newLog.user = userData;
        }
        setLogs((currentLogs) => [newLog, ...currentLogs]);
        toast.success(`New activity: ${newLog.action}`, { icon: '⚡' });
      })
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'live' : 'disconnected');
      });

    return () => supabase.removeChannel(activitySubscription);
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*, user:users (id, full_name, email, role)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }

  function filteredLogs() {
    return logs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = log.action?.toLowerCase().includes(searchLower) || log.table_name?.toLowerCase().includes(searchLower) || log.user?.full_name?.toLowerCase().includes(searchLower);
      if (searchTerm && !matchesSearch) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.table_name && log.table_name !== filters.table_name) return false;
      if (filters.date_from && new Date(log.created_at) < new Date(filters.date_from)) return false;
      if (filters.date_to) {
        let toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59);
        if (new Date(log.created_at) > toDate) return false;
      }
      return true;
    });
  }

  const handleExport = () => {
    const headers = ['Date/Time', 'User', 'Action', 'Table', 'Record ID', 'IP Address'];
    const rows = filteredLogs().map(log => [
      formatDateTime(log.created_at), log.user?.full_name || 'System', log.action, log.table_name || 'N/A', log.record_id || 'N/A', log.ip_address || 'N/A'
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionIcon = (action) => {
    const icons = { 'created': <Plus size={16}/>, 'updated': <Edit size={16}/>, 'deleted': <Trash2 size={16}/>, 'viewed': <Eye size={16}/>, 'login': <User size={16}/> };
    return icons[action?.toLowerCase()] || <Activity size={16} />;
  };

  const getActionBadgeVariant = (action) => {
    const variants = { 'created': 'success', 'updated': 'primary', 'deleted': 'danger', 'viewed': 'gray', 'login': 'success' };
    return variants[action?.toLowerCase()] || 'gray';
  };

  const columns = [
    { key: 'created_at', title: 'Date & Time', render: (v) => <div className="flex items-center gap-sm"><Calendar size={14}/> {formatDateTime(v)}</div> },
    { key: 'user', title: 'User', render: (v) => <div className="flex items-center gap-sm"><User size={14}/> {v?.full_name || 'System'}</div> },
    { key: 'action', title: 'Action', render: (v) => <Badge variant={getActionBadgeVariant(v)} icon={getActionIcon(v)}>{v || 'Unknown'}</Badge> },
    { key: 'table_name', title: 'Table', render: (v) => v || 'N/A' },
    { key: 'record_id', title: 'Record ID', render: (v) => <code className="record-id">{v ? v.substring(0, 8) + '...' : 'N/A'}</code> },
    { key: 'actions', title: 'Details', align: 'center', render: (_, row) => <button className="btn-icon" onClick={() => setSelectedLog(row)}><Eye size={16} /></button> }
  ];

  if (loading) return <LoadingSpinner text="Loading activity logs..." />;

  return (
    <div className="activity-log-tab fade-in">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>Live Activity Feed</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', backgroundColor: connectionStatus === 'live' ? '#d1fae5' : '#fee2e2', color: connectionStatus === 'live' ? '#059669' : '#b91c1c' }}>
              {connectionStatus === 'live' ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connectionStatus === 'live' ? 'Live Monitoring' : 'Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={loadLogs}>Refresh</Button>
            <Button variant="primary" icon={<Download size={16} />} onClick={handleExport}>Export</Button>
          </div>
        </div>

        <div className="search-filter-section" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <Input icon={<Search size={20} />} placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
          <Button variant="secondary" icon={<Filter size={20} />} onClick={() => setShowFilters(!showFilters)}>Filters</Button>
        </div>

        {/* Add your existing filters-panel UI here if you want it visible */}

        {filteredLogs().length === 0 ? (
          <EmptyState icon={<Activity size={48} />} title="No activity logs found" />
        ) : (
          <>
            <Table columns={columns} data={currentData} striped hoverable />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Activity Details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p><strong>Action:</strong> {selectedLog.action}</p>
            <p><strong>User:</strong> {selectedLog.user?.full_name}</p>
            <p><strong>Table:</strong> {selectedLog.table_name}</p>
            <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
              {JSON.stringify(selectedLog.new_data || selectedLog.old_data, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ==========================================
// TAB 3: SESSION MANAGEMENT
// ==========================================
const SessionManagementTab = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentSessionId = localStorage.getItem('current_session_id');

  useEffect(() => {
    if (!user) return;
    loadSessions();
    const sessionSub = supabase.channel('realtime-user-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions', filter: `user_id=eq.${user.id}` }, () => loadSessions())
      .subscribe();
    return () => supabase.removeChannel(sessionSub);
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', user.id).order('last_activity', { ascending: false });
      if (error) throw error;
      setSessions(data.map(s => ({ ...s, is_current: s.id === currentSessionId })));
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm("Terminate this session?")) return;
    try {
      const { error, count } = await supabase.from('user_sessions').delete({ count: 'exact' }).eq('id', sessionId);
      if (error || count === 0) throw error || new Error("Session not found");
      toast.success('Session terminated');
      await loadSessions(); 
    } catch (error) {
      toast.error(`Termination failed: ${error.message}`);
    }
  };

  const handleTerminateAllOthers = async () => {
    if (!window.confirm("Log out of all other devices?")) return;
    try {
      await supabase.from('user_sessions').delete().eq('user_id', user.id).neq('id', currentSessionId);
      toast.success('Other sessions terminated');
      await loadSessions();
    } catch (error) {
      toast.error('Failed to terminate sessions');
    }
  };

  if (loading && sessions.length === 0) return <LoadingSpinner text="Loading sessions..." />;

  return (
    <div className="session-management-tab fade-in">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Monitor size={24} /> Active Sessions</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your logins across devices</p>
          </div>
          {sessions.filter(s => !s.is_current).length > 0 && (
            <Button variant="danger" icon={<LogOut size={20} />} onClick={handleTerminateAllOthers}>
              Terminate All Others
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((session) => (
            <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: session.is_current ? 'var(--primary-50)' : 'transparent' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Monitor size={32} color={session.is_current ? 'var(--primary-600)' : 'var(--text-tertiary)'} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0' }}>{session.device_name} {session.is_current && <Badge variant="success">Current</Badge>}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {session.location || 'Unknown'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {getRelativeTime(session.last_activity)}</span>
                  </div>
                </div>
              </div>
              {!session.is_current && (
                <Button variant="danger" size="sm" onClick={() => handleTerminateSession(session.id)}>Terminate</Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ==========================================
// MASTER DASHBOARD (RENDER TABS)
// ==========================================
const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'activity', or 'sessions'

  return (
    <div className="security-dashboard-page">
      <PageHeader 
        title="Security Dashboard" 
        description="Monitor system integrity, user activity, and access controls in real-time."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Security' }]} />} 
      />

      {/* Modern Tab Navigation */}
      <div className="security-tabs">
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Shield size={18} /> Security Audit
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity size={18} /> Activity Logs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Monitor size={18} /> Sessions
        </button>
      </div>

      {/* Render Selected Tab */}
      <div className="tab-content mt-md">
        {activeTab === 'audit' && <SecurityAuditTab />}
        {activeTab === 'activity' && <ActivityLogTab />}
        {activeTab === 'sessions' && <SessionManagementTab />}
      </div>
    </div>
  );
};

export default SecurityDashboard;