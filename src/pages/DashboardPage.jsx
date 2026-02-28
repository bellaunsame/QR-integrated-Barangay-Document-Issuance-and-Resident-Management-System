import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db } from '../services/supabaseClient';
import { Link } from 'react-router-dom';
import { DocumentRequestCard } from '../components/documents';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  AlertCircle,
  BarChart3,
  Filter
} from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  
  const [stats, setStats] = useState({
    totalResidents: 0,
    pendingRequests: 0,
    completedToday: 0,
    totalRequests: 0
  });
  
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- CHART STATES ---
  const [allRawRequests, setAllRawRequests] = useState([]); 
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('month'); 

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (allRawRequests.length > 0) {
      processChartData(allRawRequests, timeFilter);
    }
  }, [timeFilter, allRawRequests]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [residents, allRequests] = await Promise.all([
        db.residents.getAll(),
        db.requests.getAll()
      ]);

      setAllRawRequests(allRequests);

      const todayManilaStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });

      const completedToday = allRequests.filter(req => {
        const isCompleted = req.status?.toLowerCase() === 'completed' || req.status?.toLowerCase() === 'released';
        const timestamp = req.processed_at || req.updated_at || req.created_at;
        if (!timestamp) return false;

        const safeDateString = (!timestamp.includes('+') && !timestamp.endsWith('Z')) ? `${timestamp}Z` : timestamp;
        const reqDateManilaStr = new Date(safeDateString).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
        
        return isCompleted && reqDateManilaStr === todayManilaStr;
      }).length;

      const pendingRequests = allRequests.filter(req => 
        req.status?.toLowerCase() === 'pending' || req.status?.toLowerCase() === 'processing'
      ).length;

      setStats({
        totalResidents: residents.length,
        pendingRequests,
        completedToday,
        totalRequests: allRequests.length
      });

      setRecentRequests(allRequests.slice(0, 10));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (requests, filterOption) => {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (filterOption) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0); 
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        cutoffDate = new Date(0); 
        break;
      default:
        cutoffDate.setMonth(now.getMonth() - 1);
    }

    const filteredRequests = requests.filter(req => {
      const dateString = req.created_at || req.request_date;
      if (!dateString) return false;
      const safeDate = (!dateString.includes('+') && !dateString.endsWith('Z')) ? `${dateString}Z` : dateString;
      return new Date(safeDate) >= cutoffDate;
    });

    const typeCounts = {};
    filteredRequests.forEach(req => {
      const docType = req.template?.template_name || req.request_type || 'Unknown Document';
      typeCounts[docType] = (typeCounts[docType] || 0) + 1;
    });

    const formattedData = Object.keys(typeCounts).map(key => ({
      name: key,
      count: typeCounts[key]
    })).sort((a, b) => b.count - a.count); 

    setChartData(formattedData);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--surface)', padding: '10px 15px', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>{label}</p>
          <p style={{ margin: 0, color: 'var(--primary-600)', fontWeight: '600' }}>
            Requested: {payload[0].value} time{payload[0].value > 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.full_name}!</p>
        </div>
        <div className="header-info">
          <Calendar size={20} />
          <span>{new Date().toLocaleDateString('en-US', { 
            timeZone: 'Asia/Manila',
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalResidents}</div>
            <div className="stat-label">Total Residents</div>
          </div>
          <div className="stat-trend">
            <TrendingUp size={16} />
            <span>Active records</span>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">
            <Clock size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingRequests}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
          <div className="stat-trend">
            <AlertCircle size={16} />
            <span>Awaiting action</span>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">
            <CheckCircle size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">Completed Today</div>
          </div>
          <div className="stat-trend">
            <Calendar size={16} />
            <span>Today's progress</span>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">
            <FileText size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalRequests}</div>
            <div className="stat-label">Total Documents</div>
          </div>
          <div className="stat-trend">
            <BarChart3 size={16} />
            <span>All time</span>
          </div>
        </div>
      </div>

      {/* ANALYTICS CHART SECTION */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} color="var(--primary-600)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Document Request Analytics</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--background)', padding: '5px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Filter size={16} color="var(--text-tertiary)" style={{ marginLeft: '5px' }} />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '6px 12px', outline: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
            >
              <option value="today">Today</option>
              <option value="week">Past 1 Week</option>
              <option value="month">Past 1 Month</option>
              <option value="6months">Past 6 Months</option>
              <option value="year">Past 1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <FileText size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
            <p>No document requests found for the selected time period.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }} 
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                {/* FIX: Removed angle={-35} and textAnchor="end", and shortened height */}
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  height={30}
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--background)', opacity: 0.4 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="var(--primary-500)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-content">
        <div>
          <div className="recent-requests-header">
            <h2>Recent Document Requests</h2>
            <Link to="/documents" className="badge badge-primary">View All</Link>
          </div>
          
          <div>
            {recentRequests.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <h3>No requests yet</h3>
                <p>Document requests will appear here</p>
              </div>
            ) : (
              <div className="requests-card-grid">
                {recentRequests.map((request) => (
                  <DocumentRequestCard 
                    key={request.id} 
                    request={request} 
                    showActions={false} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Quick Actions updated for Clerk --- */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-cards">
            {(user?.role === 'admin' || user?.role === 'record_keeper' || user?.role === 'clerk') && (
              <Link to="/residents" className="action-card">
                <Users size={24} />
                <span>Add New Resident</span>
              </Link>
            )}
            
            <Link to="/documents" className="action-card">
              <FileText size={24} />
              <span>View All Requests</span>
            </Link>
            
            {user?.role === 'admin' && (
              <Link to="/templates" className="action-card">
                <FileText size={24} />
                <span>Manage Templates</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;