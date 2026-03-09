import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, AlertTriangle, Bell, LogOut, QrCode, Phone, ChevronRight, Pin, MapPin, ChevronLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; 

import brgyHallBg from '../assets/Brgyhall.jpg';
import DocumentRequestForm from '../components/documents/DocumentRequestForm';

const ResidentHome = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('home');
  const [announcements, setAnnouncements] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  
  // Document Request States
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // 1. Fetch Announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const userPurok = user?.purok || 'All';

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .or(`target_purok.eq.All,target_purok.eq.${userPurok}`)
          .or(`expiration_date.is.null,expiration_date.gte.${today}`)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10); 

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error("Failed to load news:", error);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchAnnouncements();
  }, [user]); 

  // 2. Fetch My Document Requests
  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          template:document_templates(template_name)
        `)
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
    fetchMyRequests();
  }, [user]);

  // Navigation Handlers to ensure correct state
  const handleOpenForm = () => {
    setActiveTab('documents');
    setIsCreatingRequest(true);
  };

  const handleOpenList = () => {
    setActiveTab('documents');
    setIsCreatingRequest(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/resident-login');
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

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
        
        .nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 70px; width: 100%; }
        .nav-brand { display: flex; align-items: center; gap: 10px; }
        .nav-tabs { display: flex; gap: 0.5rem; justify-content: center; flex: 1; padding: 0 20px; }
        .nav-profile { display: flex; align-items: center; gap: 15px; border-left: 1px solid #e2e8f0; padding-left: 15px; }
        .profile-text { display: block; text-align: right; }
        
        .main-content { max-width: 1200px; margin: 2rem auto; width: 100%; padding: 0 2rem; flex: 1; }
        .grid-layout { display: flex; gap: 2rem; }
        .news-column { flex: 2.5; }
        .widgets-column { flex: 1; min-width: 300px; }
        .welcome-title { font-size: 2rem; }

        @media (max-width: 768px) {
          .nav-container { flex-wrap: wrap; height: auto; padding: 15px 0; }
          .nav-brand { flex: 1; min-width: 60%; }
          .nav-profile { border-left: none !important; padding-left: 0 !important; }
          .nav-tabs { width: 100%; overflow-x: auto; margin-top: 15px; padding-bottom: 5px; justify-content: flex-start; padding: 0; -webkit-overflow-scrolling: touch; }
          .nav-tabs::-webkit-scrollbar { display: none; }
          .nav-tabs { -ms-overflow-style: none; scrollbar-width: none; }
          .nav-tabs button { white-space: nowrap; flex-shrink: 0; }
          .profile-text { display: none; }
          .main-content { margin: 1rem auto; padding: 0 1rem; }
          .grid-layout { flex-direction: column; gap: 1.5rem; }
          .widgets-column { min-width: 100%; }
          .welcome-title { font-size: 1.5rem; }
        }
      `}</style>

      <div className="resident-layout">
        {/* NAV BAR */}
        <nav style={{ background: '#fff', padding: '0 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div className="nav-container">
            
            <div className="nav-brand" style={{ maxWidth: '350px' }}>
              <div style={{ background: 'var(--primary-600)', color: 'white', padding: '10px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B2</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-800)', fontSize: '1rem', lineHeight: '1.2' }}>Barangay Dos, Calamba</h2>
                <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.2', whiteSpace: 'normal' }}>
                  Online Document Record & Services Management System
                </span>
              </div>
            </div>

            <div className="nav-tabs">
              <button onClick={() => { setActiveTab('home'); setIsCreatingRequest(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: 'none', background: activeTab === 'home' ? '#e0e7ff' : 'transparent', color: activeTab === 'home' ? 'var(--primary-700)' : '#64748b', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}><Home size={18} /> News & Home</button>
              <button onClick={handleOpenList} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: 'none', background: activeTab === 'documents' ? '#e0e7ff' : 'transparent', color: activeTab === 'documents' ? 'var(--primary-700)' : '#64748b', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}><FileText size={18} /> Documents</button>
              <button onClick={() => { setActiveTab('report'); setIsCreatingRequest(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: 'none', background: activeTab === 'report' ? '#fee2e2' : 'transparent', color: activeTab === 'report' ? '#ef4444' : '#64748b', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}><AlertTriangle size={18} /> File a Report</button>
            </div>

            <div className="nav-profile">
              <div className="profile-text">
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{user?.first_name || 'Resident'}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✓ Verified Account</p>
              </div>
              <button onClick={handleLogout} title="Log Out" style={{ background: '#fef2f2', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={18} /></button>
            </div>

          </div>
        </nav>

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
                      <div key={news.id} className="animation-fade-in" style={{ 
                        background: news.is_pinned ? '#fefce8' : '#fff', 
                        borderRadius: '12px', overflow: 'hidden',
                        boxShadow: news.is_pinned ? '0 10px 15px -3px rgba(245, 158, 11, 0.1), 0 0 0 2px #fde047' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                        borderLeft: news.is_pinned ? 'none' : `5px solid ${news.type === 'Warning' ? '#ef4444' : news.type === 'Event' ? '#10b981' : 'var(--primary-500)'}` 
                      }}>
                        
                        {news.image_url && (
                          <div style={{ width: '100%', height: '250px', background: '#000' }}>
                            <img src={news.image_url} alt="Announcement Poster" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
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
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff', lineHeight: '1.4' }}>Present this QR at the Barangay Hall to easily pull up your records.</p>
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

          {/* ========================================= */}
          {/* TAB 2: DOCUMENTS TAB                        */}
          {/* ========================================= */}
          {activeTab === 'documents' && (
            <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '60vh' }}>
              
              {!isCreatingRequest ? (
                // --- CUSTOM RESIDENT LIST VIEW (Safe & Won't Crash) ---
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>My Document Requests</h2>
                      <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Track the status of your requested barangay documents here.</p>
                    </div>
                    <button onClick={handleOpenForm} className="btn btn-primary">
                      <Plus size={18} /> New Request
                    </button>
                  </div>

                  {loadingRequests ? (
                     <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>Loading your requests...</div>
                  ) : myRequests.length === 0 ? (
                     <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                       <FileText size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
                       <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No Requests Found</h3>
                       <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>You haven't requested any documents yet.</p>
                       <button onClick={handleOpenForm} className="btn btn-secondary">Create your first request</button>
                     </div>
                  ) : (
                    // NATIVE RESIDENT CARD UI
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                      {myRequests.map((request) => (
                        <div key={request.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--surface)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-800)' }}>{request.template?.template_name || 'Document'}</h3>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{new Date(request.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                            
                            <span className={`badge ${
                              request.status === 'completed' || request.status === 'released' ? 'badge-success' : 
                              request.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {request.status === 'completed' || request.status === 'released' ? <CheckCircle size={12}/> : 
                               request.status === 'rejected' ? <XCircle size={12}/> : <Clock size={12}/>}
                              {request.status ? request.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>

                          <div style={{ background: 'var(--neutral-50)', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem' }}>
                            <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)' }}><strong>Tracking No:</strong> {request.tracking_code || 'N/A'}</p>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>Purpose:</strong> {request.purpose || 'Not specified'}</p>
                          </div>

                          {request.status === 'rejected' && request.remarks && (
                            <div style={{ marginTop: '15px', padding: '10px', background: '#fee2e2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#991b1b', marginBottom: '4px' }}>Reason for Rejection:</strong>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c' }}>{request.remarks}</p>
                            </div>
                          )}

                          {(request.status === 'completed' || request.status === 'released') && (
                            <div style={{ marginTop: '15px', padding: '10px', background: '#ecfdf5', borderRadius: '8px', textAlign: 'center' }}>
                              <strong style={{ color: '#065f46', fontSize: '0.9rem' }}>Ready for Pickup!</strong>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#047857' }}>Please proceed to the Barangay Hall to claim your document.</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // --- FORM VIEW ---
                <>
                  <button onClick={handleOpenList} className="btn btn-secondary" style={{ marginBottom: '20px', background: 'transparent', border: 'none', padding: '5px 0', color: '#64748b' }}>
                    <ChevronLeft size={18} /> Back to My Requests
                  </button>
                  
                  <DocumentRequestForm 
                    residentData={user} // Passes logged in user data to auto-fill the form
                    onCancel={handleOpenList}
                    onSubmit={async (payload) => {
                      // Insert request directly to Supabase from here since it's the Resident App
                      const { error } = await supabase.from('document_requests').insert([{ ...payload, status: 'pending' }]);
                      if (error) throw error;
                      
                      setIsCreatingRequest(false);
                      fetchMyRequests(); 
                      toast.success("Document request submitted successfully!");
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* TAB 3 Placeholder */}
          {activeTab === 'report' && (<div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}><h2 style={{ color: '#ef4444', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={24} /> File a Blotter / Report</h2><p style={{ color: '#64748b', marginBottom: '20px' }}>Submit a secure report.</p><div style={{ background: '#fef2f2', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #fca5a5' }}><AlertTriangle size={48} color="#f87171" style={{ marginBottom: '15px' }} /><h3 style={{ color: '#991b1b', margin: '0 0 10px 0' }}>Blotter Filing System</h3></div></div>)}
        </div>
      </div>
    </>
  );
};

export default ResidentHome;