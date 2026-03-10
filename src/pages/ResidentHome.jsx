import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, AlertTriangle, Bell, LogOut, QrCode, Phone, ChevronRight, Pin, MapPin, ChevronLeft, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; 

import brgyHallBg from '../assets/Brgyhall.jpg';
import logo from '../assets/brgy.2-icon.png'; 
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import ResidentBlotterTab from '../components/residents/ResidentBlotterTab'; 

const ResidentHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState('home');
  const [announcements, setAnnouncements] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  
  const [myRequests, setMyRequests] = useState([]);
  const [templates, setTemplates] = useState([]); 
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem('resident_session');
    if (sessionStr) {
      setUser(JSON.parse(sessionStr));
    } else {
      navigate('/resident-login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const userPurok = user?.purok || 'All';

        const { data: newsData, error: newsError } = await supabase
          .from('announcements')
          .select('*')
          .or(`target_purok.eq.All,target_purok.eq.${userPurok}`)
          .or(`expiration_date.is.null,expiration_date.gte.${today}`)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10); 

        if (newsError) throw newsError;
        setAnnouncements(newsData || []);

        const { data: tempDocs, error: tempError } = await supabase
          .from('document_templates')
          .select('*')
          .eq('is_active', true);
        
        if (tempError) throw tempError;
        setTemplates(tempDocs || []);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchData();
  }, [user]); 

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`*, template:document_templates(template_name)`)
        .eq('resident_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();

    const channel = supabase
      .channel('resident-documents')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_requests', filter: `resident_id=eq.${user.id}` },
        (payload) => {
          fetchMyRequests(); 
          toast.success(`Your document status was updated to: ${payload.new.status.toUpperCase()}`, { icon: '🔔' });
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleOpenForm = () => { setActiveTab('documents'); setIsCreatingRequest(true); };
  const handleOpenList = () => { setActiveTab('documents'); setIsCreatingRequest(false); };

  const handleLogout = () => {
    localStorage.removeItem('resident_session');
    toast.success("Logged out successfully");
    navigate('/resident-login', { replace: true });
  };

  if (!user) return null; 

  return (
    <>
      <style>{`
        .resident-layout {
          background-image: linear-gradient(rgba(241, 245, 249, 0.85), rgba(241, 245, 249, 0.95)), url(${brgyHallBg});
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .glass-nav {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 0.5rem 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 65px; width: 100%; }
        .main-content { max-width: 1200px; margin: 2rem auto; width: 100%; padding: 0 2rem; flex: 1; }
        .grid-layout { display: flex; gap: 2rem; }
        .news-column { flex: 2.5; }
        .widgets-column { flex: 1; min-width: 300px; }
        .welcome-title { font-size: 2rem; }

        /* Hide Bottom Nav on Desktop */
        .mobile-bottom-nav { display: none; }

        @media (max-width: 768px) {
          .glass-nav { padding: 0.5rem 1rem; }
          .nav-container { height: 55px; }
          
          /* Hide Desktop Tabs on Mobile */
          .desktop-tabs { display: none !important; } 
          
          .main-content { margin: 1rem auto; padding: 0 1rem; }
          .grid-layout { flex-direction: column; gap: 1.5rem; }
          .widgets-column { min-width: 100%; }
          .welcome-title { font-size: 1.5rem; }

          /* Add bottom padding so content isn't covered by bottom nav */
          .resident-layout { padding-bottom: 80px; }

          /* Show Bottom Nav on Mobile */
          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
            box-shadow: 0 -4px 15px rgba(0,0,0,0.05);
            z-index: 100;
            justify-content: space-around;
            align-items: center;
            padding: 8px 10px;
            padding-bottom: calc(8px + env(safe-area-inset-bottom)); /* Supports iPhones */
          }

          .mobile-tab {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #64748b;
            background: transparent;
            border: none;
            flex: 1;
            padding: 8px 0;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mobile-tab span { margin-top: 2px; }
          
          .mobile-tab.active { color: var(--primary-700); }
          .mobile-tab.active-report { color: #ef4444; }
          .mobile-tab svg { transition: transform 0.2s; }
          .mobile-tab.active svg { transform: translateY(-2px); }
        }
      `}</style>

      <div className="resident-layout">
        
        {/* ========================================= */}
        {/* HEADER / TOP NAV                          */}
        {/* ========================================= */}
        <nav className="glass-nav">
          <div className="nav-container">
            
            {/* BRAND / LOGO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logo} alt="Barangay Logo" style={{ width: '45px', height: '45px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.2' }}>Barangay Dos</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: '600' }}>Resident Portal</span>
              </div>
            </div>

            {/* DESKTOP TABS (HIDDEN ON MOBILE) */}
            <div className="desktop-tabs" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
              <button onClick={() => { setActiveTab('home'); setIsCreatingRequest(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'home' ? '#ffffff' : 'transparent', color: activeTab === 'home' ? 'var(--primary-700)' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'home' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                <Home size={18} /> Home
              </button>
              <button onClick={handleOpenList} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'documents' ? '#ffffff' : 'transparent', color: activeTab === 'documents' ? 'var(--primary-700)' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'documents' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                <FileText size={18} /> Documents
              </button>
              <button onClick={() => { setActiveTab('report'); setIsCreatingRequest(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'report' ? '#ef4444' : 'transparent', color: activeTab === 'report' ? '#ffffff' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'report' ? '0 2px 4px rgba(239,68,68,0.3)' : 'none' }}>
                <AlertTriangle size={18} /> Report
              </button>
            </div>

            {/* PROFILE & LOGOUT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="desktop-tabs" style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{user?.first_name}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}><CheckCircle size={10} /> Verified</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {user?.first_name?.charAt(0) || 'R'}
              </div>
              <button onClick={handleLogout} title="Log Out" style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <LogOut size={20} />
              </button>
            </div>

          </div>
        </nav>

        {/* ========================================= */}
        {/* MOBILE BOTTOM NAV (VISIBLE ONLY ON PHONES) */}
        {/* ========================================= */}
        <div className="mobile-bottom-nav">
          <button className={`mobile-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setIsCreatingRequest(false); }}>
            <Home size={26} color={activeTab === 'home' ? 'var(--primary-700)' : '#94a3b8'} fill={activeTab === 'home' ? 'var(--primary-100)' : 'none'} />
            <span>Home</span>
          </button>
          
          <button className={`mobile-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={handleOpenList}>
            <FileText size={26} color={activeTab === 'documents' ? 'var(--primary-700)' : '#94a3b8'} fill={activeTab === 'documents' ? 'var(--primary-100)' : 'none'} />
            <span>Documents</span>
          </button>
          
          <button className={`mobile-tab ${activeTab === 'report' ? 'active-report' : ''}`} onClick={() => { setActiveTab('report'); setIsCreatingRequest(false); }}>
            <AlertTriangle size={26} color={activeTab === 'report' ? '#ef4444' : '#94a3b8'} fill={activeTab === 'report' ? '#fef2f2' : 'none'} />
            <span>Report</span>
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {activeTab === 'home' && (
            <div className="grid-layout">
              {/* NEWS FEED */}
              <div className="news-column">
                <div style={{ marginBottom: '2rem' }}>
                  <h1 className="welcome-title" style={{ color: '#1e293b', margin: '0 0 5px 0', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Welcome back, {user?.first_name || 'Neighbor'}! 👋</h1>
                  <p style={{ color: '#475569', margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>Here is the latest news and updates from the barangay.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {loadingNews ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', color: '#64748b' }}><div className="spinner-small" style={{ margin: '0 auto 10px auto' }}></div>Loading announcements...</div>
                  ) : announcements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', color: '#64748b' }}><Bell size={40} style={{ opacity: 0.2, marginBottom: '10px' }} /><p>No new announcements at this time.</p></div>
                  ) : (
                    announcements.map(news => (
                      <div key={news.id} className="animation-fade-in" style={{ background: news.is_pinned ? '#fefce8' : '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: news.is_pinned ? '0 10px 15px -3px rgba(245, 158, 11, 0.1), 0 0 0 2px #fde047' : '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: news.is_pinned ? 'none' : `5px solid ${news.type === 'Warning' ? '#ef4444' : news.type === 'Event' ? '#10b981' : 'var(--primary-500)'}` }}>
                        {news.image_url && (
                          // FIXED: Changed objectFit to 'contain' to prevent cropping, and added a subtle background color
                          <div style={{ width: '100%', height: '250px', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={news.image_url} alt="Announcement Poster" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ margin: 0, color: news.is_pinned ? '#92400e' : '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {news.is_pinned && <Pin size={18} fill="#f59e0b" color="#f59e0b" />}
                              {news.title}
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {news.target_purok !== 'All' && (
                                <span style={{ fontSize: '0.75rem', color: '#fff', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}><MapPin size={12}/> {news.target_purok}</span>
                              )}
                              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', background: news.is_pinned ? '#fef9c3' : '#f1f5f9', padding: '4px 8px', borderRadius: '12px' }}>
                                <Bell size={12}/> {new Date(news.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <p style={{ color: '#475569', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{news.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* WIDGETS */}
              <div className="widgets-column">
                <div style={{ background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%)', color: 'white', borderRadius: '16px', padding: '25px 20px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1.1rem' }}><QrCode size={22}/> Digital Barangay ID</h4>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '15px' }}>
                    <img src={user?.qr_code_url || "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"} alt="Resident QR" style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff', lineHeight: '1.4' }}>Present this QR at the Barangay Hall.</p>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Recent Requests</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-600)', cursor: 'pointer' }} onClick={handleOpenList}>View All</span>
                  </div>
                  
                  {loadingRequests ? (
                     <div style={{ padding: '15px', textAlign: 'center' }}><div className="spinner-small" style={{ margin: '0 auto' }}></div></div>
                  ) : myRequests.length === 0 ? (
                     <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', border: '1px dashed #cbd5e1' }}>
                       No recent document requests.
                     </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {myRequests.slice(0, 2).map(req => (
                        <div key={req.id} onClick={handleOpenList} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid #e2e8f0' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a' }}>{req.template?.template_name || 'Document'}</strong>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: req.status === 'completed' || req.status === 'released' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#d97706' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: req.status === 'completed' || req.status === 'released' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#d97706' }}></span> 
                              {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : 'Pending'}
                            </span>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" />
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleOpenForm} style={{ width: '100%', marginTop: '15px', padding: '10px', background: 'transparent', border: '1px dashed var(--primary-400)', color: 'var(--primary-600)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + Request New Document
                  </button>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}><Phone size={20} color="#ef4444"/> Emergency Hotlines</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}><span style={{ color: '#64748b' }}>Barangay Desk:</span> <strong style={{ color: '#1e293b' }}>(049) 123-4567</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}><span style={{ color: '#64748b' }}>Police Station:</span> <strong style={{ color: '#1e293b' }}>117</strong></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Fire Dept:</span> <strong style={{ color: '#1e293b' }}>(049) 765-4321</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '60vh' }}>
              {!isCreatingRequest ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>My Document Requests</h2>
                      <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Track the status of your requests here.</p>
                    </div>
                    <button onClick={handleOpenForm} className="btn btn-primary">
                      <Plus size={18} /> New Request
                    </button>
                  </div>
                  {/* ... Rest of your existing documents code ... */}
                  {loadingRequests ? (
                     <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>Loading your requests...</div>
                  ) : myRequests.length === 0 ? (
                     <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                       <FileText size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
                       <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No Requests Found</h3>
                       <button onClick={handleOpenForm} className="btn btn-secondary">Create your first request</button>
                     </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {myRequests.map((request) => (
                        <div key={request.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--surface)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-800)' }}>{request.template?.template_name || 'Document'}</h3>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className={`badge ${request.status === 'completed' || request.status === 'released' ? 'badge-success' : request.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {request.status ? request.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>
                          <div style={{ background: 'var(--neutral-50)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
                            <p style={{ margin: '0 0 5px 0' }}><strong>Tracking No:</strong> {request.tracking_code || 'N/A'}</p>
                            <p style={{ margin: 0 }}><strong>Purpose:</strong> {request.purpose || 'Not specified'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button onClick={handleOpenList} className="btn btn-secondary" style={{ marginBottom: '20px', background: 'transparent', border: 'none', padding: '5px 0', color: '#64748b' }}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <DocumentRequestForm residentData={user} templates={templates} onCancel={handleOpenList} onSubmit={async (payload) => {
                      try {
                        const cleanPayload = { ...payload, status: 'pending' };
                        delete cleanPayload.notarizedDocFile;
                        const { error } = await supabase.from('document_requests').insert([cleanPayload]);
                        if (error) throw error;
                        setIsCreatingRequest(false);
                        fetchMyRequests(); 
                        toast.success("Request submitted!");
                      } catch (err) { toast.error("Failed: " + err.message); }
                  }} />
                </>
              )}
            </div>
          )}

          {activeTab === 'report' && (
             <ResidentBlotterTab user={user} />
          )} 
        </div>
      </div>
    </>
  );
};

export default ResidentHome;