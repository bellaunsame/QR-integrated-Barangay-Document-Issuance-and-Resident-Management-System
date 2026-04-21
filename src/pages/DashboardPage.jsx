import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, db } from '../services/supabaseClient';
import { Link } from 'react-router-dom';
import EquipmentCalendar from '../components/equipment/EquipmentCalendar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
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
  Filter,
  Scale,
  Package,
  FileCheck,
  AlertTriangle,
  Megaphone, 
  Pin,       
  Bell       
} from 'lucide-react';

import './DashboardPage.css';

const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  
  const [stats, setStats] = useState({
    totalResidents: 0,
    pendingRequests: 0,
    completedToday: 0,
    totalRequests: 0
  });
  
  const [loading, setLoading] = useState(true);
  
  // --- RAW DATA STATES ---
  const [allRawRequests, setAllRawRequests] = useState([]); 
  const [allRawBlotters, setAllRawBlotters] = useState([]);
  const [allRawBorrows, setAllRawBorrows] = useState([]); 
  const [announcements, setAnnouncements] = useState([]); 
  
  // --- CHART & CARD DATA STATES ---
  const [docChartData, setDocChartData] = useState([]);
  const [blotterChartData, setBlotterChartData] = useState([]);
  const [incidentChartData, setIncidentChartData] = useState([]);

  const [activeBorrows, setActiveBorrows] = useState([]); 
  
  const [timeFilter, setTimeFilter] = useState('month'); 

  // ============================================================================
  // SMART DASHBOARD VISIBILITY RULES (STRICT ENFORCEMENT)
  // ============================================================================
  const isBoss = user?.role === 'admin' || user?.role === 'barangay_captain';
  const isInvestigator = user?.role === 'barangay_investigator';
  
  const showGeneralStats = !isInvestigator; 
  const showDocs = isBoss || hasPermission('process_documents');
  const showBlotter = isBoss || hasPermission('manage_blotter');
  const showEquipment = isBoss || hasPermission('manage_equipment');
  const showNews = isBoss || hasPermission('manage_news'); 
  const showManageResidentsLink = isBoss || (!isInvestigator && hasPermission('manage_residents'));

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (allRawRequests.length > 0 || allRawBlotters.length > 0 || allRawBorrows.length > 0) {
      processAllChartData(timeFilter);
    }
  }, [timeFilter, allRawRequests, allRawBlotters, allRawBorrows]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [residents, allRequests, blotterRes, borrowRes, newsRes] = await Promise.all([
        db.residents.getAll(),
        db.requests.getAll(),
        supabase.from('blotter_records').select('*'),
        supabase.from('borrowing_records').select('*, equipment_inventory(item_name)').order('borrow_date', { ascending: false }),
        supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4) 
      ]);

      setAllRawRequests(allRequests);
      setAllRawBlotters(blotterRes.data || []);
      setAllRawBorrows(borrowRes.data || []);
      setAnnouncements(newsRes.data || []); 

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

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAllChartData = (filterOption) => {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (filterOption) {
      case 'today': cutoffDate.setHours(0, 0, 0, 0); break;
      case 'week': cutoffDate.setDate(now.getDate() - 7); break;
      case 'month': cutoffDate.setMonth(now.getMonth() - 1); break;
      case '6months': cutoffDate.setMonth(now.getMonth() - 6); break;
      case 'year': cutoffDate.setFullYear(now.getFullYear() - 1); break;
      case 'all': cutoffDate = new Date(0); break;
      default: cutoffDate.setMonth(now.getMonth() - 1);
    }

    const filterByDate = (items, dateField) => {
      return items.filter(item => {
        const dateString = item[dateField] || item.created_at;
        if (!dateString) return false;
        const safeDate = (!dateString.includes('+') && !dateString.endsWith('Z')) ? `${dateString}Z` : dateString;
        return new Date(safeDate) >= cutoffDate;
      });
    };

    const filteredDocs = filterByDate(allRawRequests, 'created_at');
    const docCounts = {};
    filteredDocs.forEach(req => {
      const docType = req.template?.template_name || req.request_type || 'Unknown Document';
      docCounts[docType] = (docCounts[docType] || 0) + 1;
    });
    setDocChartData(Object.keys(docCounts).map(key => ({ name: key, count: docCounts[key] })).sort((a, b) => b.count - a.count));

    const filteredAllBlotters = filterByDate(allRawBlotters, 'incident_date');
    
    const filteredIncidents = filteredAllBlotters.filter(b => b.report_type === 'Incident' || !b.report_type);
    const filteredOnlyBlotters = filteredAllBlotters.filter(b => b.report_type === 'Blotter');

    const incidentCounts = { 'Pending': 0, 'Active': 0, 'Settled': 0, 'Escalated': 0, 'Dismissed': 0 };
    filteredIncidents.forEach(b => {
      const status = b.status || 'Active';
      incidentCounts[status] = (incidentCounts[status] || 0) + 1;
    });
    setIncidentChartData(Object.keys(incidentCounts).filter(k => incidentCounts[k] > 0).map(key => ({ name: key, count: incidentCounts[key] })));

    const blotterCounts = { 'Pending': 0, 'Active': 0, 'Settled': 0, 'Escalated': 0, 'Dismissed': 0 };
    filteredOnlyBlotters.forEach(b => {
      const status = b.status || 'Active';
      blotterCounts[status] = (blotterCounts[status] || 0) + 1;
    });
    setBlotterChartData(Object.keys(blotterCounts).filter(k => blotterCounts[k] > 0).map(key => ({ name: key, count: blotterCounts[key] })));

    const filteredBorrows = filterByDate(allRawBorrows, 'borrow_date');
    const activeItems = filteredBorrows
      .filter(record => record.status === 'Released')
      .map(record => {
        const isOverdue = new Date(record.expected_return) < now;
        return { ...record, display_status: isOverdue ? 'Overdue' : 'Released' };
      });
      
    setActiveBorrows(activeItems);
  };

  const CustomTooltip = ({ active, payload, label, color }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--surface)', padding: '10px 15px', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>{label}</p>
          <p style={{ margin: 0, color: color || 'var(--primary-600)', fontWeight: '600' }}>
            Total: {payload[0].value}
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
        <p>Loading analytics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* HEADER WITH GLOBAL FILTER */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart3 size={28} color="var(--primary-600)" /> Quick Access Dashboard</h1>
          <p>Welcome back, {user?.full_name}! Here is your personalized overview.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-info" style={{ margin: 0 }}>
            <Calendar size={18} />
            <span>{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem' }}
            >
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="6months">Past 6 Months</option>
              <option value="year">Past 1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* DYNAMIC STATISTICS CARDS */}
      {showGeneralStats && (
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon"><Users size={32} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalResidents}</div>
              <div className="stat-label">Total Residents</div>
            </div>
            <div className="stat-trend"><TrendingUp size={16} /><span>Active records</span></div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon"><Clock size={32} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingRequests}</div>
              <div className="stat-label">Pending Requests</div>
            </div>
            <div className="stat-trend"><AlertCircle size={16} /><span>Awaiting action</span></div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon"><CheckCircle size={32} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.completedToday}</div>
              <div className="stat-label">Completed Today</div>
            </div>
            <div className="stat-trend"><Calendar size={16} /><span>Today's progress</span></div>
          </div>

          <div className="stat-card stat-info">
            <div className="stat-icon"><FileText size={32} /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalRequests}</div>
              <div className="stat-label">Total Documents</div>
            </div>
            <div className="stat-trend"><BarChart3 size={16} /><span>All time</span></div>
          </div>
        </div>
      )}

      {/* DYNAMIC CHART SECTION 1: DOCUMENTS */}
      {showDocs && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <FileText size={22} color="var(--primary-600)" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Document Request Analytics</h2>
          </div>

          {docChartData.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <FileText size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
              <p>No document requests found for this period.</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: '350px' }}>
              {/* THE FIX: width="99%" and strict height */}
              <ResponsiveContainer width="99%" height={350}>
                <BarChart data={docChartData} margin={{ top: 35, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={false} label={{ value: 'Total Requests', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontWeight: 'bold', fontSize: 14 }} />
                  <Tooltip content={<CustomTooltip color="var(--primary-600)" />} cursor={{ fill: 'var(--background)', opacity: 0.4 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {docChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill="var(--primary-500)" />))}
                    <LabelList dataKey="count" position="top" style={{ fill: '#1e293b', fontSize: 16, fontWeight: 'bold' }} formatter={(val) => `${val} docs`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC CHART SECTION 2: BLOTTER & EQUIPMENT */}
      {(showBlotter || showEquipment) && (
        <div className="responsive-inline-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: showBlotter && showEquipment ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', 
          gap: '24px', 
          marginBottom: '24px' 
        }}>
          
          {/* INCIDENT CHART */}
          {showBlotter && (
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', height: '400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <AlertCircle size={22} color="#f59e0b" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Incident Reports by Status</h2>
              </div>

              {incidentChartData.length === 0 ? (
                <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <AlertCircle size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
                  <p>No incident reports found for this period.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="99%" height={300}>
                    <BarChart data={incidentChartData} margin={{ top: 35, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={false} label={{ value: 'Total Incidents', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontWeight: 'bold', fontSize: 14 }} />
                      <Tooltip content={<CustomTooltip color="#f59e0b" />} cursor={{ fill: 'var(--background)', opacity: 0.4 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {incidentChartData.map((entry, index) => {
                          let color = '#3b82f6'; // Active
                          if (entry.name === 'Pending') color = '#f59e0b';
                          if (entry.name.includes('Settled')) color = '#10b981'; 
                          if (entry.name.includes('Escalated')) color = '#ef4444'; 
                          if (entry.name.includes('Dismissed')) color = '#64748b'; 
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                        <LabelList dataKey="count" position="top" style={{ fill: '#1e293b', fontSize: 16, fontWeight: 'bold' }} formatter={(val) => `${val} cases`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* BLOTTER CHART */}
          {showBlotter && (
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', height: '400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Scale size={22} color="#ef4444" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Blotter Cases by Status</h2>
              </div>

              {blotterChartData.length === 0 ? (
                <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <Scale size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
                  <p>No blotter records found for this period.</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: '300px' }}>
                  {/* THE FIX: width="99%" and strict height */}
                  <ResponsiveContainer width="99%" height={300}>
                    <BarChart data={blotterChartData} margin={{ top: 35, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 14, fontWeight: 600 }} tickLine={false} axisLine={false} label={{ value: 'Total Cases', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontWeight: 'bold', fontSize: 14 }} />
                      <Tooltip content={<CustomTooltip color="#ef4444" />} cursor={{ fill: 'var(--background)', opacity: 0.4 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {blotterChartData.map((entry, index) => {
                          let color = '#f59e0b'; 
                          if (entry.name.includes('Settled')) color = '#10b981'; 
                          if (entry.name.includes('Escalated')) color = '#ef4444'; 
                          if (entry.name.includes('Dismissed')) color = '#64748b'; 
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                        <LabelList dataKey="count" position="top" style={{ fill: '#1e293b', fontSize: 16, fontWeight: 'bold' }} formatter={(val) => `${val} cases`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* EQUIPMENT CARD */}
          {showEquipment && (
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', height: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={22} color="#f59e0b" />
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Active Borrows</h2>
                </div>
                <Link to="/equipment" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 'bold' }}>View All</Link>
              </div>

              {activeBorrows.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <CheckCircle size={48} opacity={0.2} style={{ marginBottom: '10px', color: '#10b981' }} />
                  <p>All items are currently returned!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '5px' }}>
                  {activeBorrows.map(borrow => (
                    <div key={borrow.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {borrow.borrower_name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {borrow.quantity}x {borrow.equipment_inventory?.item_name || 'Equipment'}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                        background: borrow.display_status === 'Overdue' ? '#fef2f2' : '#fffbeb',
                        color: borrow.display_status === 'Overdue' ? '#dc2626' : '#d97706',
                        border: `1px solid ${borrow.display_status === 'Overdue' ? '#fca5a5' : '#fde68a'}`
                      }}>
                        {borrow.display_status === 'Overdue' && <AlertTriangle size={12} />}
                        {borrow.display_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* DYNAMIC CALENDAR WIDGET: EQUIPMENT */}
      {showEquipment && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} color="var(--primary-600)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Equipment Borrowing Schedule</h2>
            </div>
            <Link to="/equipment" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 'bold' }}>Manage Calendar</Link>
          </div>
          
          <EquipmentCalendar records={allRawBorrows.map(record => {
            let displayStatus = record.status;
            if (record.status === 'Released' && record.expected_return && new Date(record.expected_return) < new Date()) {
              displayStatus = 'Overdue';
            }
            return { ...record, display_status: displayStatus };
          })} />
        </div>
      )}

      {/* DYNAMIC ANNOUNCEMENTS CARD */}
      {showNews && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Megaphone size={22} color="var(--primary-600)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Recent Announcements</h2>
            </div>
            {isBoss && (
              <Link to="/announcements" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 'bold' }}>Manage News</Link>
            )}
          </div>

          {announcements.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Megaphone size={48} opacity={0.2} style={{ margin: '0 auto 10px auto' }} />
              <p>No active announcements from the Barangay.</p>
            </div>
          ) : (
            <div className="responsive-inline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {announcements.map(news => (
                <div key={news.id} style={{ 
                  display: 'flex', flexDirection: 'column', padding: '16px', 
                  background: news.is_pinned ? '#fefce8' : 'var(--background)', 
                  border: news.is_pinned ? '1px solid #fde047' : '1px solid var(--border)', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {news.is_pinned ? <Pin size={16} color="#f59e0b" fill="#f59e0b" /> : <Bell size={16} color="#64748b" />}
                      <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {news.title}
                      </h3>
                    </div>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                      background: news.type === 'Warning' ? '#fef2f2' : news.type === 'Event' ? '#ecfdf5' : '#eff6ff', 
                      color: news.type === 'Warning' ? '#dc2626' : news.type === 'Event' ? '#059669' : '#2563eb' 
                    }}>
                      {news.type || 'General'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                    {news.content}
                  </p>
                  <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: '600' }}>
                    {new Date(news.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • Target: {news.target_purok}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC QUICK ACTIONS ROW */}
      <div className="quick-actions">
        <h3 style={{ marginBottom: '15px' }}>Quick Actions</h3>
        <div className="action-cards">
          
          {showManageResidentsLink && (
            <Link to="/residents" className="action-card">
              <Users size={24} />
              <span>Manage Residents</span>
            </Link>
          )}
          
          {showDocs && (
            <Link to="/documents" className="action-card">
              <FileText size={24} />
              <span>Manage Requests</span>
            </Link>
          )}

          {showBlotter && (
            <Link to="/blotter" className="action-card">
              <Scale size={24} />
              <span>Manage Blotter</span>
            </Link>
          )}

          {showEquipment && (
            <Link to="/equipment" className="action-card">
              <Package size={24} />
              <span>Manage Equipment</span>
            </Link>
          )}
          
          {user?.role === 'admin' && (
            <Link to="/templates" className="action-card">
              <FileCheck size={24} />
              <span>Manage Templates</span>
            </Link>
          )}

        </div>
      </div>

    </div>
  );
};

export default DashboardPage;