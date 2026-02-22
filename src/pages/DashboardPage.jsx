import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db } from '../services/supabaseClient';
import { Link } from 'react-router-dom';
import { DocumentRequestCard } from '../components/documents';

import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  AlertCircle,
  BarChart3
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load statistics
      const [residents, allRequests] = await Promise.all([
        db.residents.getAll(),
        db.requests.getAll()
      ]);

      // strictly get "Today" in Philippine Time
      const todayManilaStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });

      const completedToday = allRequests.filter(req => {
        const isCompleted = req.status?.toLowerCase() === 'completed';
        
        const timestamp = req.processed_at || req.updated_at || req.created_at;
        if (!timestamp) return false;

        // Force UTC 'Z' if missing, then format to Philippine Time
        const safeDateString = (!timestamp.includes('+') && !timestamp.endsWith('Z')) ? `${timestamp}Z` : timestamp;
        const reqDateManilaStr = new Date(safeDateString).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
        
        return isCompleted && reqDateManilaStr === todayManilaStr;
      }).length;

      const pendingRequests = allRequests.filter(req => 
        req.status?.toLowerCase() === 'pending'
      ).length;

      setStats({
        totalResidents: residents.length,
        pendingRequests,
        completedToday,
        totalRequests: allRequests.length
      });

      // Get recent requests (last 10)
      setRecentRequests(allRequests.slice(0, 10));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
          {/* Dashboard Header Date forced to Philippine Time */}
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

        {/* Quick Actions */}
        {user?.role !== 'clerk' && (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-cards">
            {user?.role === 'admin' || user?.role === 'record_keeper' ? (
              <Link to="/residents" className="action-card">
                <Users size={24} />
                <span>Add New Resident</span>
              </Link>
            ) : null}
            
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
      )}
      </div>
    </div>
  );
};

export default DashboardPage;