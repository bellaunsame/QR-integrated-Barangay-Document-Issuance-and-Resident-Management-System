import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, supabase } from '../services/supabaseClient'; 
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Card, Table, Badge, Input, Button, LoadingSpinner, EmptyState, Pagination } from '../components/common';
import toast from 'react-hot-toast'; 
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  User,
  FileText,
  Settings,
  Trash2,
  Edit,
  Plus,
  Eye,
  Calendar,
  Clock,
  Wifi,
  WifiOff,
  X // <-- ADDED X ICON FOR MODAL
} from 'lucide-react';
import { usePagination } from '../hooks';
import './ActivityLogPage.css';

/**
 * ActivityLogPage Component
 * View and filter system activity logs (audit trail)
 * Track all user actions in the system with Live Monitoring
 */
const ActivityLogPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track the real-time connection status
  const [connectionStatus, setConnectionStatus] = useState('connecting'); 

  // NEW: State for the View Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    action: '',
    table_name: '',
    user_id: '',
    date_from: '',
    date_to: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // FIXED: UTC-Safe Date Formatter
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Normalize format to standard ISO (replaces SQL space with T)
    let parsedString = dateString.replace(' ', 'T');
    
    // If the database string lacks a timezone indicator, force it to UTC by adding 'Z'
    if (!/(Z|[+-]\d{2}(:\d{2})?)$/.test(parsedString)) {
      parsedString += 'Z';
    }

    return new Date(parsedString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const {
    currentPage,
    totalPages,
    currentData,
    goToPage,
    itemsPerPage
  } = usePagination(filteredLogs(), 20);

  useEffect(() => {
    // 1. Initial Load
    loadLogs();

    // 2. Set up Supabase Realtime Subscription
    const activitySubscription = supabase
      .channel('realtime-activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs' // Make sure this matches your actual table name!
        },
        async (payload) => {
          const newLog = payload.new;

          // Fetch the user's details so the table displays their name
          if (newLog.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, full_name, email, role')
              .eq('id', newLog.user_id)
              .maybeSingle();
              
            if (userData) {
              newLog.user = userData;
            }
          }

          // Instantly add the new log to the top of the state array
          setLogs((currentLogs) => [newLog, ...currentLogs]);
          
          // Notify the admin that someone just did something
          toast.success(`New activity: ${newLog.action} on ${newLog.table_name}`, {
            icon: '⚡',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          });
        }
      )
      .subscribe((status) => {
        // Monitor the WebSocket connection status
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    // 3. Cleanup subscription when leaving the page
    return () => {
      supabase.removeChannel(activitySubscription);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Directly query the audit_logs table and join the users table
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users (
            id,
            full_name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false }); // Get newest logs first

      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  function filteredLogs() {
    return logs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        log.action?.toLowerCase().includes(searchLower) ||
        log.table_name?.toLowerCase().includes(searchLower) ||
        log.user?.full_name?.toLowerCase().includes(searchLower);

      if (searchTerm && !matchesSearch) return false;
      if (filters.action && log.action !== filters.action) return false;
      if (filters.table_name && log.table_name !== filters.table_name) return false;
      if (filters.user_id && log.user_id !== filters.user_id) return false;

      if (filters.date_from) {
        const logDate = new Date(log.created_at);
        const fromDate = new Date(filters.date_from);
        if (logDate < fromDate) return false;
      }

      if (filters.date_to) {
        const logDate = new Date(log.created_at);
        const toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }

  const handleExport = () => {
    const csv = generateCSV(filteredLogs());
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const generateCSV = (data) => {
    const headers = ['Date/Time', 'User', 'Action', 'Table', 'Record ID', 'IP Address'];
    const rows = data.map(log => [
      formatDateTime(log.created_at),
      log.user?.full_name || 'System',
      log.action,
      log.table_name || 'N/A',
      log.record_id || 'N/A',
      log.ip_address || 'N/A'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  };

  const getActionIcon = (action) => {
    if (!action) return <Activity size={16} />;
    const icons = {
      'created': <Plus size={16} />,
      'updated': <Edit size={16} />,
      'deleted': <Trash2 size={16} />,
      'viewed': <Eye size={16} />,
      'login': <User size={16} />,
      'logout': <User size={16} />,
      'settings_changed': <Settings size={16} />
    };
    return icons[action.toLowerCase()] || <Activity size={16} />;
  };

  const getActionBadgeVariant = (action) => {
    if (!action) return 'gray';
    const variants = {
      'created': 'success',
      'updated': 'primary',
      'deleted': 'danger',
      'viewed': 'gray',
      'login': 'success',
      'logout': 'gray',
      'settings_changed': 'warning'
    };
    return variants[action.toLowerCase()] || 'gray';
  };

  const columns = [
    {
      key: 'created_at',
      title: 'Date & Time',
      width: '15%',
      render: (value) => (
        <div className="date-cell">
          <Calendar size={14} />
          <span>{formatDateTime(value)}</span>
        </div>
      )
    },
    {
      key: 'user',
      title: 'User',
      width: '15%',
      render: (value) => (
        <div className="user-cell">
          <User size={14} />
          <span>{value?.full_name || 'System'}</span>
        </div>
      )
    },
    {
      key: 'action',
      title: 'Action',
      width: '15%',
      render: (value) => (
        <Badge variant={getActionBadgeVariant(value)} icon={getActionIcon(value)}>
          {value || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'table_name',
      title: 'Table',
      width: '12%',
      render: (value) => value || 'N/A'
    },
    {
      key: 'record_id',
      title: 'Record ID',
      width: '15%',
      render: (value) => (
        <code className="record-id">{value ? value.substring(0, 8) + '...' : 'N/A'}</code>
      )
    },
    {
      key: 'ip_address',
      title: 'IP Address',
      width: '12%',
      render: (value) => value || 'N/A'
    },
    {
      key: 'actions',
      title: 'Details',
      width: '8%',
      align: 'center',
      render: (_, row) => (
        <button className="btn-icon" onClick={() => viewLogDetails(row)} title="View details">
          <Eye size={16} />
        </button>
      )
    }
  ];

  const viewLogDetails = (log) => {
    setSelectedLog(log); 
  };

  const clearFilters = () => {
    setFilters({ action: '', table_name: '', user_id: '', date_from: '', date_to: '' });
    setSearchTerm('');
  };

  const uniqueActions = [...new Set(logs.map(log => log.action).filter(Boolean))];
  const uniqueTables = [...new Set(logs.map(log => log.table_name).filter(Boolean))];
  const uniqueUsers = [...new Set(logs.map(log => log.user_id).filter(Boolean))];

  if (loading) {
    return (
      <div className="activity-log-page">
        <PageHeader title="Activity Logs" description="System audit trail and user activity tracking" breadcrumbs={<Breadcrumbs items={[{ label: 'Activity Logs' }]} />} />
        <LoadingSpinner size="lg" text="Loading activity logs..." />
      </div>
    );
  }

  return (
    <div className="activity-log-page">
      <PageHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Activity Logs
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: connectionStatus === 'live' ? '#d1fae5' : '#fee2e2',
              color: connectionStatus === 'live' ? '#059669' : '#b91c1c',
              border: `1px solid ${connectionStatus === 'live' ? '#a7f3d0' : '#fecaca'}`
            }}>
              {connectionStatus === 'live' ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connectionStatus === 'live' ? 'Live Monitoring' : 'Offline'}
              {connectionStatus === 'live' && (
                <span className="pulse-dot" style={{ width: '8px', height: '8px', backgroundColor: '#059669', borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
              )}
            </span>
          </div>
        }
        description="System audit trail and user activity tracking"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Activity Logs' }]} />}
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={20} />} onClick={loadLogs}>Refresh</Button>
            <Button variant="primary" icon={<Download size={20} />} onClick={handleExport}>Export CSV</Button>
          </>
        }
      />

      <Card>
        <div className="search-filter-section">
          <div className="search-bar">
            <Input icon={<Search size={20} />} placeholder="Search by action, table, or user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="secondary" icon={<Filter size={20} />} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-item">
                <label>Action</label>
                <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="form-control">
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => <option key={action} value={action}>{action}</option>)}
                </select>
              </div>

              <div className="filter-item">
                <label>Table</label>
                <select value={filters.table_name} onChange={(e) => setFilters({ ...filters, table_name: e.target.value })} className="form-control">
                  <option value="">All Tables</option>
                  {uniqueTables.map(table => <option key={table} value={table}>{table}</option>)}
                </select>
              </div>

              <div className="filter-item">
                <label>Date From</label>
                <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="form-control" />
              </div>

              <div className="filter-item">
                <label>Date To</label>
                <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="form-control" />
              </div>
            </div>

            <div className="filters-actions">
              <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
            </div>
          </div>
        )}

        <div className="stats-row">
          <div className="stat-card">
            <Activity size={20} />
            <div>
              <span className="stat-value">{filteredLogs().length}</span>
              <span className="stat-label">Total Logs</span>
            </div>
          </div>

          <div className="stat-card">
            <User size={20} />
            <div>
              <span className="stat-value">{uniqueUsers.length}</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>

          <div className="stat-card">
            <Clock size={20} />
            <div>
              {/* FIXED: Uses the new UTC-safe formatter to show the proper local time of the latest log */}
              <span className="stat-value" style={{ fontSize: '1.25rem' }}>{logs[0] ? formatDateTime(logs[0].created_at) : 'N/A'}</span>
              <span className="stat-label">Latest Activity</span>
            </div>
          </div>
        </div>

        {filteredLogs().length === 0 ? (
          <EmptyState icon={<Activity size={48} />} title="No activity logs found" description="No logs match your search criteria" />
        ) : (
          <>
            <Table columns={columns} data={currentData} striped hoverable />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </>
        )}
      </Card>

      {/* --- NEW: VIEW LOG DETAILS MODAL --- */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Badge variant={getActionBadgeVariant(selectedLog.action)} icon={getActionIcon(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Activity Details</h2>
              </div>
              <button className="btn-icon" onClick={() => setSelectedLog(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.25rem' }}>Performed By</p>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--text-secondary)" />
                    {selectedLog.user?.full_name || 'System Administrator'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.25rem' }}>Date & Time</p>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color="var(--text-secondary)" />
                    {formatDateTime(selectedLog.created_at)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.25rem' }}>Table Affected</p>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{selectedLog.table_name || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.25rem' }}>IP Address</p>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.25rem' }}>Record ID</p>
                  <code style={{ background: 'var(--neutral-100)', padding: '0.5rem', borderRadius: '4px', display: 'block', fontSize: '0.875rem' }}>
                    {selectedLog.record_id || 'N/A'}
                  </code>
                </div>
              </div>

              {/* Data Changes Block */}
              {(selectedLog.old_data || selectedLog.new_data) && (
                <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Data Changes</p>
                  <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', color: 'var(--text-primary)' }}>
                    {JSON.stringify(selectedLog.new_data || selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;