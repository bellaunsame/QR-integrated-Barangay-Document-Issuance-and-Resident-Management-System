import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, supabase } from '../services/supabaseClient'; 
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Card, Table, Badge, Input, Button, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import toast from 'react-hot-toast'; 
import { 
  Activity, Search, Filter, Download, RefreshCw, User,
  Trash2, Edit, Plus, Eye, Calendar, Wifi, WifiOff, X, Shield, 
  AlertTriangle, XCircle, Smartphone 
} from 'lucide-react';
import { usePagination } from '../hooks';
import { getSecuritySummary, queryAuditLogs, SEVERITY } from '../services/security/auditLogger';

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
  
  // States for Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ severity: '', action: '' });

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    const summaryData = await getSecuritySummary(7);
    
    const { data: logs } = await supabase
      .from('audit_logs')
      .select(`*, user:users(full_name)`)
      .order('created_at', { ascending: false })
      .limit(200);

    setSummary(summaryData);
    setRecentLogs(logs || []);
  };

  const filteredLogs = useMemo(() => {
    return recentLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = 
        log.action?.toLowerCase().includes(searchLower) || 
        log.user?.full_name?.toLowerCase().includes(searchLower) ||
        log.ip_address?.toLowerCase().includes(searchLower);
        
      if (searchTerm && !matchesSearch) return false;
      
      if (filters.severity) {
        let logSeverity = 'info';
        if (log.details) {
           const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
           logSeverity = parsedDetails.severity || 'info';
        }
        if (logSeverity !== filters.severity) return false;
      }
      
      // FIX: Made the Action filter case-insensitive so it matches the database properly
      if (filters.action && log.action?.toLowerCase() !== filters.action.toLowerCase()) return false;
      
      return true;
    });
  }, [recentLogs, searchTerm, filters]);

  // FIX: Changed pagination to 6 items per page
  const { currentPage, totalPages, currentData, goToPage } = usePagination(filteredLogs, 6);

  const handleExport = () => {
    const headers = ['Date/Time', 'Action', 'Severity', 'User', 'IP Address'];
    const rows = filteredLogs.map(log => {
      let logSeverity = 'info';
      if (log.details) {
         const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
         logSeverity = parsedDetails.severity || 'info';
      }
      return [
        formatDateTime(log.created_at), 
        log.action, 
        logSeverity.toUpperCase(),
        log.user?.full_name || log.user_id || 'System', 
        log.ip_address || 'Unknown IP'
      ];
    });

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getEventBadge = (action, severity) => {
    if (action === 'NEW_DEVICE_VERIFIED') {
      return <Badge variant="warning" icon={<Smartphone size={14}/>}>New Device Authorized</Badge>;
    }
    if (action?.toLowerCase() === 'login_failed' || action?.toLowerCase() === 'rate_limit_exceeded') {
      return <Badge variant="danger" icon={<AlertTriangle size={14}/>}>{action}</Badge>;
    }
    return <Badge variant={severity === 'critical' ? 'danger' : 'gray'}>{action}</Badge>;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Security Event Logs</h3>
        </div>

        <div className="search-filter-section" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <Input 
            icon={<Search size={20} />} 
            placeholder="Search events, users, or IPs..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ flex: 1 }} 
          />
          <Button 
            variant={showFilters ? 'primary' : 'secondary'} 
            icon={<Filter size={20} />} 
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Severity</label>
              <select 
                value={filters.severity} 
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Action Type</label>
              {/* FIX: Updated values to lowercase to match DB standard */}
              <select 
                value={filters.action} 
                onChange={(e) => setFilters({...filters, action: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
              >
                <option value="">All Actions</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
                <option value="new_device_verified">New Device</option>
                <option value="password_changed">Password Changed</option>
                <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button 
                variant="secondary" 
                onClick={() => { setSearchTerm(''); setFilters({ severity: '', action: '' }); }}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          {filteredLogs.length === 0 ? (
             <EmptyState icon={<Shield size={48} />} title="No security events found matching criteria" />
          ) : (
            <>
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
                  {currentData.map(log => {
                    let logSeverity = 'info';
                    if (log.details) {
                       const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                       logSeverity = parsedDetails.severity || 'info';
                    }

                    return (
                      <tr key={log.id} style={{ 
                        backgroundColor: log.action === 'NEW_DEVICE_VERIFIED' ? '#fefce8' : 'transparent' 
                      }}>
                        <td>{formatDateTime(log.created_at)}</td>
                        <td>
                          {getEventBadge(log.action, logSeverity)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} color="var(--text-tertiary)" />
                            {log.user?.full_name || log.user_id || 'System'}
                          </div>
                        </td>
                        <td>{log.ip_address || 'Unknown IP'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: '1rem' }}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            </>
          )}
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

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = log.action?.toLowerCase().includes(searchLower) || log.table_name?.toLowerCase().includes(searchLower) || log.user?.full_name?.toLowerCase().includes(searchLower);
      if (searchTerm && !matchesSearch) return false;
      
      // FIX: Made case-insensitive check
      if (filters.action && log.action?.toLowerCase() !== filters.action.toLowerCase()) return false;
      if (filters.table_name && log.table_name !== filters.table_name) return false;
      if (filters.date_from && new Date(log.created_at) < new Date(filters.date_from)) return false;
      if (filters.date_to) {
        let toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59);
        if (new Date(log.created_at) > toDate) return false;
      }
      return true;
    });
  }, [logs, searchTerm, filters]);

  // FIX: Changed pagination to 6 items per page
  const { currentPage, totalPages, currentData, goToPage } = usePagination(filteredLogs, 6);

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

  const handleExport = () => {
    const headers = ['Date/Time', 'User', 'Action', 'Table', 'Record ID', 'IP Address'];
    const rows = filteredLogs.map(log => [
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
    const icons = { 'created': <Plus size={16}/>, 'updated': <Edit size={16}/>, 'deleted': <Trash2 size={16}/>, 'viewed': <Eye size={16}/>, 'login_success': <User size={16}/> };
    return icons[action?.toLowerCase()] || <Activity size={16} />;
  };

  const getActionBadgeVariant = (action) => {
    const variants = { 'created': 'success', 'updated': 'primary', 'deleted': 'danger', 'viewed': 'gray', 'login_success': 'success' };
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
          {/* Note: I can add the advanced filter button here if you want to filter Activity Logs by Action too! */}
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState icon={<Activity size={48} />} title="No activity logs found" />
        ) : (
          <>
            <Table columns={columns} data={currentData} striped hoverable />
            <div style={{ marginTop: '1rem' }}>
               <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
            </div>
          </>
        )}
      </Card>

      {selectedLog && (
        <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Activity Details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p><strong>Action:</strong> {selectedLog.action}</p>
            <p><strong>User:</strong> {selectedLog.user?.full_name}</p>
            <p><strong>Table:</strong> {selectedLog.table_name}</p>
            <p><strong>IP Address:</strong> {selectedLog.ip_address}</p>
            <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
              {JSON.stringify(selectedLog.new_data || selectedLog.old_data || selectedLog.details, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ==========================================
// MASTER DASHBOARD
// ==========================================
const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('audit'); 

  return (
    <div className="security-dashboard-page">
      <PageHeader 
        title="Security Dashboard" 
        description="Monitor system integrity, user activity, and access controls in real-time."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Security' }]} />} 
      />

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
      </div>

      <div className="tab-content mt-md">
        {activeTab === 'audit' && <SecurityAuditTab />}
        {activeTab === 'activity' && <ActivityLogTab />}
      </div>
    </div>
  );
};

export default SecurityDashboard;