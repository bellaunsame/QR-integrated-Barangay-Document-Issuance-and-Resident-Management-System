import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, AlertTriangle, Bell, LogOut, QrCode, ChevronRight, Pin, ChevronLeft, Clock, CheckCircle, Plus, ThumbsUp, Download, Package, Gavel, CheckCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; 

import brgyHallBg from '../assets/Brgyhall.jpg';
import logo from '../assets/brgy.2-icon.png'; 
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import ResidentBlotterTab from '../components/residents/ResidentBlotterTab'; 
import ResidentProfileTab from '../components/residents/ResidentProfileTab'; 

// Import the separated CSS file
import './ResidentHome.css';

import { generateQRData, generateQRCodeImage } from '../services/qrCodeService';
import idBackground from '../assets/id-bg.png'; 

// =====================================================================
// HELPER: TIME AGO FORMATTER
// =====================================================================
const timeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// =====================================================================
// ID GENERATOR LOGIC
// =====================================================================
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const downloadResidentID = async (resident) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    try {
        const bgImg = await loadImage(idBackground);
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.warn("Could not load id-bg.png. Using solid background.");
    }

    const textStartX = 100;
    const strictMaxWidth = 620; 

    ctx.font = 'bold 70px "Times New Roman", Times, serif';
    ctx.fillStyle = '#164e63'; 
    const fullName = `${resident.first_name} ${resident.middle_name ? resident.middle_name.charAt(0) + '.' : ''} ${resident.last_name} ${resident.suffix || ''}`.trim();
    ctx.fillText(fullName, textStartX, 350, strictMaxWidth); 

    ctx.font = 'normal 22px Arial, sans-serif'; 
    ctx.fillStyle = '#334155'; 
    
    const address = `${resident.full_address}, ${resident.barangay}`;
    ctx.fillText(address, textStartX, 420, strictMaxWidth);
    ctx.fillText(resident.mobile_number || 'No contact provided', textStartX, 460, strictMaxWidth);

    const qrData = generateQRData(resident);
    const qrCodeBase64 = await generateQRCodeImage(qrData, { width: 600, margin: 4 });
    const qrImg = await loadImage(qrCodeBase64);
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(760, 200, 360, 360, 20); 
    ctx.fill();

    ctx.drawImage(qrImg, 780, 220, 320, 320); 

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.98));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resident.last_name}_Brgy_ID.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error generating ID image:', error);
    throw error;
  }
};

const ResidentHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [announcements, setAnnouncements] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [displayQR, setDisplayQR] = useState(null); 
  
  const [likedAnnouncements, setLikedAnnouncements] = useState(new Set());
  const [isLiking, setIsLiking] = useState(false);
  
  const [myRequests, setMyRequests] = useState([]);
  const [templates, setTemplates] = useState([]); 
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  const [equipmentInventory, setEquipmentInventory] = useState([]);
  const [myEquipmentReqs, setMyEquipmentReqs] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [isCreatingEqReq, setIsCreatingEqReq] = useState(false);
  const [eqForm, setEqForm] = useState({ equipment_id: '', quantity: 1, borrow_date: '', expected_return: '', purpose: '' });
  
  const [isEqAgreed, setIsEqAgreed] = useState(false);
  const [mySummons, setMySummons] = useState([]);

  // --- NOTIFICATION STATES ---
  const [showNotifs, setShowNotifs] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(new Set()); 
  const notifRef = useRef(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('resident_session');
    if (sessionStr) {
      const parsedUser = JSON.parse(sessionStr);
      setUser(parsedUser);
      
      const storedDismissed = localStorage.getItem(`dismissed_notifs_${parsedUser.id}`);
      if (storedDismissed) {
        setDismissedNotifs(new Set(JSON.parse(storedDismissed)));
      }
    } else {
      navigate('/resident-login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const setupQR = async () => {
      if (user.qr_code_url) {
        setDisplayQR(user.qr_code_url);
      } else {
        try {
          const qrData = generateQRData(user);
          const qrCodeBase64 = await generateQRCodeImage(qrData, { width: 400, margin: 2 });
          setDisplayQR(qrCodeBase64);
        } catch (err) {
          console.error("Failed to generate fallback QR:", err);
        }
      }
    };
    setupQR();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const userPurok = user?.purok || 'All';

        const { data: newsData } = await supabase
          .from('announcements')
          .select('*')
          .or(`target_purok.eq.All,target_purok.eq.${userPurok}`)
          .or(`expiration_date.is.null,expiration_date.gte.${today}`)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10); 
        setAnnouncements(newsData || []);

        const { data: likesData } = await supabase.from('announcement_likes').select('announcement_id').eq('resident_id', user.id);
        if (likesData) setLikedAnnouncements(new Set(likesData.map(like => like.announcement_id)));

        const { data: tempDocs } = await supabase.from('document_templates').select('*').eq('is_active', true);
        setTemplates(tempDocs || []);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchData();
  }, [user]); 

  // =======================================================
  // FIXED: EQUIPMENT FETCHING WITH PROPER ERROR LOGGING
  // =======================================================
  const fetchEquipmentData = async () => {
    if (!user) return;
    setLoadingEquipment(true);
    try {
      // 1. Fetch Inventory
      const { data: inv, error: invError } = await supabase
        .from('equipment_inventory')
        .select('*');
        
      if (invError) {
        console.error("Inventory Fetch Error:", invError);
        toast.error("Failed to load equipment items.");
      } else {
        setEquipmentInventory(inv || []);
      }

      // 2. Fetch Borrowing History
      const { data: myBorrows, error: borrowError } = await supabase
        .from('borrowing_records')
        .select(`*, equipment_inventory(item_name)`)
        .eq('borrower_name', `${user.first_name} ${user.last_name}`) 
        .order('borrow_date', { ascending: false });
      
      if (borrowError) {
        console.error("Borrow History Error:", borrowError);
      } else {
        setMyEquipmentReqs(myBorrows || []);
      }
      
    } catch (err) {
      console.error("Unexpected error fetching equipment:", err);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const { data } = await supabase
        .from('document_requests')
        .select(`*, template:document_templates(template_name)`)
        .eq('resident_id', user.id)
        .order('created_at', { ascending: false });
      setMyRequests(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSummons = async () => {
    if (!user) return;
    try {
      const fullName = `${user.first_name} ${user.last_name}`;
      const { data } = await supabase
        .from('blotter_records')
        .select('*')
        .ilike('respondent_name', `%${fullName}%`) 
        .not('summon_schedule', 'is', null); 
      if (data) setMySummons(data);
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    fetchEquipmentData(); 
    fetchSummons();

    const docChannel = supabase
      .channel('resident-documents')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'document_requests', filter: `resident_id=eq.${user.id}` }, (payload) => {
        fetchMyRequests(); 
        toast.success(`Your document status was updated to: ${payload.new.status.toUpperCase()}`, { icon: '🔔' });
      }).subscribe();

    const eqChannel = supabase
      .channel('resident-equipment')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'borrowing_records' }, () => {
        fetchEquipmentData();
      }).subscribe();

    const blotterChannel = supabase
      .channel('resident-blotter')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blotter_records' }, () => {
        fetchSummons();
      }).subscribe();

    return () => { 
      supabase.removeChannel(docChannel); 
      supabase.removeChannel(eqChannel);
      supabase.removeChannel(blotterChannel);
    };
  }, [user]);

  const handleAcknowledge = async (announcementId) => {
    if (!user || isLiking || likedAnnouncements.has(announcementId)) return;
    setIsLiking(true);
    try {
      const { error } = await supabase.from('announcement_likes').insert([{ announcement_id: announcementId, resident_id: user.id }]);
      if (error && error.code !== '23505') throw error;
      setLikedAnnouncements(prev => new Set(prev).add(announcementId));
      toast.success("Announcement acknowledged!", { icon: '👍' });
    } catch (error) {
      toast.error("Failed to acknowledge. Try again later.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleDownloadIDCard = async () => {
    if (!user) return;
    const toastId = toast.loading("Generating your Digital ID Card...");
    try {
      await downloadResidentID(user);
      toast.success("ID Card downloaded successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate ID Card. Please try again.", { id: toastId });
    }
  };

  // =======================================================
  // FIXED: ADDED BORROWER NAME AND EQUIPMENT ID
  // =======================================================
  const handleEquipmentSubmit = async (e) => {
    e.preventDefault();
    if (!isEqAgreed) {
      toast.error("Please confirm the details are correct.");
      return;
    }

    const toastId = toast.loading("Submitting equipment request...");
    try {
      const { error } = await supabase.from('borrowing_records').insert([{
        borrower_name: `${user.first_name} ${user.last_name}`, // FIXED
        equipment_id: eqForm.equipment_id,                     // FIXED
        quantity: parseInt(eqForm.quantity),
        borrow_date: eqForm.borrow_date,
        expected_return: eqForm.expected_return,
        purpose: eqForm.purpose,
        status: 'Pending' 
      }]);
      if (error) throw error;
      toast.success("Request sent for approval! You'll receive an email once approved.", { id: toastId });
      setIsCreatingEqReq(false);
      setEqForm({ equipment_id: '', quantity: 1, borrow_date: '', expected_return: '', purpose: '' });
      setIsEqAgreed(false);
      fetchEquipmentData();
    } catch (err) {
      toast.error(err.message || "Failed to submit request.", { id: toastId });
    }
  };

  const handleOpenForm = () => { setActiveTab('documents'); setIsCreatingRequest(true); };
  const handleOpenList = () => { setActiveTab('documents'); setIsCreatingRequest(false); };

  const handleLogout = () => {
    localStorage.removeItem('resident_session');
    toast.success("Logged out successfully");
    navigate('/resident-login', { replace: true });
  };

  // ==========================================
  // COMPILE NOTIFICATIONS
  // ==========================================
  const rawNotifications = [
    ...announcements
      .filter(a => !likedAnnouncements.has(a.id))
      .map(a => ({ id: `ann_${a.id}`, title: 'New Announcement', desc: a.title, icon: <Bell size={16}/>, color: '#f59e0b', tab: 'home', date: a.created_at })),
    
    ...myRequests
      .filter(r => r.status !== 'pending')
      .map(r => ({ id: `doc_${r.id}_${r.status}`, title: `Document ${r.status}`, desc: r.template?.template_name || 'Request updated', icon: <FileText size={16}/>, color: r.status === 'rejected' ? '#ef4444' : '#10b981', tab: 'documents', date: r.created_at })),
    
    ...myEquipmentReqs
      .filter(e => e.status !== 'Pending' && e.status !== 'Released')
      .map(e => ({ id: `eq_${e.id}_${e.status}`, title: `Equipment ${e.status}`, desc: `${e.quantity}x ${e.equipment_inventory?.item_name}`, icon: <Package size={16}/>, color: e.status === 'Rejected' ? '#ef4444' : '#10b981', tab: 'equipment', date: e.created_at })),

    ...myEquipmentReqs
      .filter(e => e.status === 'Released') 
      .map(e => {
        const dueDate = new Date(e.expected_return);
        const now = new Date();
        const timeDiff = dueDate - now;
        if (timeDiff < 0) return { id: `rem_overdue_${e.id}`, title: `OVERDUE: Return Equipment`, desc: `Please return ${e.quantity}x ${e.equipment_inventory?.item_name} immediately.`, icon: <AlertTriangle size={16}/>, color: '#ef4444', tab: 'equipment', date: new Date().toISOString() };
        else if (timeDiff < 86400000) return { id: `rem_duesoon_${e.id}`, title: `Reminder: Return Soon`, desc: `Due today.`, icon: <Clock size={16}/>, color: '#f59e0b', tab: 'equipment', date: new Date().toISOString() };
        return { id: `eq_${e.id}_${e.status}`, title: `Equipment ${e.status}`, desc: `${e.quantity}x ${e.equipment_inventory?.item_name}`, icon: <Package size={16}/>, color: '#10b981', tab: 'equipment', date: e.created_at };
      }).filter(Boolean),

    ...mySummons.map(s => ({ 
      id: `summon_${s.id}`, title: `MANDATORY SUMMON: Case ${s.case_number}`, desc: `You are requested to appear on ${new Date(s.summon_schedule).toLocaleDateString()}. Check Report tab.`, icon: <Gavel size={16}/>, color: '#b91c1c', tab: 'report', date: s.created_at 
    }))
  ];

  rawNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));

  const unreadCount = rawNotifications.filter(n => !dismissedNotifs.has(n.id)).length;
  const displayNotifs = rawNotifications.slice(0, 15); 

  const handleNotificationClick = (notif) => {
    setActiveTab(notif.tab);
    setShowNotifs(false);
    const updatedDismissed = new Set(dismissedNotifs);
    updatedDismissed.add(notif.id);
    setDismissedNotifs(updatedDismissed);
    localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify([...updatedDismissed]));
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    const allIds = displayNotifs.map(n => n.id);
    const updatedDismissed = new Set([...dismissedNotifs, ...allIds]);
    setDismissedNotifs(updatedDismissed);
    localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify([...updatedDismissed]));
  };

  if (!user) return null; 

  // --- ADDED RESTRICTED VIEW COMPONENT ---
  const RestrictedView = ({ featureName }) => (
    <div className="animation-fade-in" style={{ background: '#fff', padding: '3rem 2rem', borderRadius: '12px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
      <AlertTriangle size={60} color="#f59e0b" style={{ marginBottom: '20px', opacity: 0.8 }} />
      <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Access Restricted</h2>
      <p style={{ color: '#64748b', maxWidth: '400px', lineHeight: '1.5' }}>
        Your account must be <strong>verified</strong> by the Barangay Staff to access the {featureName} feature. Please wait for the staff to review your registration.
      </p>
      <button onClick={() => setActiveTab('home')} className="btn btn-primary" style={{ marginTop: '20px' }}>
        Return to Home
      </button>
    </div>
  );

  return (
    <div className="resident-layout">
      
      <nav className="glass-nav">
        <div className="nav-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logo} alt="Barangay Logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.2' }}>Barangay Dos</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: '600' }}>Resident Portal</span>
            </div>
          </div>

          <div className="desktop-tabs" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => { setActiveTab('home'); setIsCreatingRequest(false); setIsCreatingEqReq(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'home' ? '#ffffff' : 'transparent', color: activeTab === 'home' ? 'var(--primary-700)' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'home' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              <Home size={18} /> Home
            </button>
            <button onClick={() => { setActiveTab('documents'); setIsCreatingEqReq(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'documents' ? '#ffffff' : 'transparent', color: activeTab === 'documents' ? 'var(--primary-700)' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'documents' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              <FileText size={18} /> Documents
            </button>
            <button onClick={() => { setActiveTab('equipment'); setIsCreatingRequest(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'equipment' ? '#ffffff' : 'transparent', color: activeTab === 'equipment' ? 'var(--primary-700)' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'equipment' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              <Package size={18} /> Equipment
            </button>
            <button onClick={() => { setActiveTab('report'); setIsCreatingRequest(false); setIsCreatingEqReq(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: activeTab === 'report' ? '#ef4444' : 'transparent', color: activeTab === 'report' ? '#ffffff' : '#64748b', borderRadius: '99px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'report' ? '0 2px 4px rgba(239,68,68,0.3)' : 'none' }}>
              <AlertTriangle size={18} /> Report
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            {/* NOTIFICATION BELL */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifs(!showNotifs)} 
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '50%', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              >
                <Bell size={20} color="#475569" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid #fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="notif-dropdown">
                  <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#1e293b' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {displayNotifs.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>You're all caught up!</div>
                    ) : (
                      displayNotifs.map(n => {
                        const isRead = dismissedNotifs.has(n.id);
                        return (
                          <div 
                            key={n.id} 
                            className={`notif-item ${isRead ? 'read' : 'unread'}`}
                            onClick={() => handleNotificationClick(n)} 
                            style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${n.color}20`, color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {n.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: isRead ? '600' : '800' }}>{n.title}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '8px' }}>{timeAgo(n.date)}</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: isRead ? '#94a3b8' : '#64748b' }}>{n.desc}</span>
                            </div>
                            {!isRead && <div style={{ width: '8px', height: '8px', background: 'var(--primary-500)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE BUTTON - UPDATED WITH DYNAMIC VERIFICATION */}
            <div 
              className="desktop-tabs" 
              onClick={() => setActiveTab('profile')} 
              style={{ textAlign: 'right', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: activeTab === 'profile' ? '#f1f5f9' : 'transparent', padding: '5px 10px', borderRadius: '8px', transition: 'background 0.2s' }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{user?.first_name}</p>
                {/* DYNAMIC VERIFIED BADGE */}
                {user?.is_verified ? (
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}><CheckCircle size={10} /> Verified</p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}><Clock size={10} /> Unverified</p>
                )}
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                {user?.first_name?.charAt(0) || 'R'}
              </div>
            </div>

            <button onClick={handleLogout} title="Log Out" style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}>
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <div className="mobile-bottom-nav">
        <button className={`mobile-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={24} color={activeTab === 'home' ? 'var(--primary-700)' : '#94a3b8'} fill={activeTab === 'home' ? 'var(--primary-100)' : 'none'} />
          <span>Home</span>
        </button>
        <button className={`mobile-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          <FileText size={24} color={activeTab === 'documents' ? 'var(--primary-700)' : '#94a3b8'} fill={activeTab === 'documents' ? 'var(--primary-100)' : 'none'} />
          <span>Docs</span>
        </button>
        <button className={`mobile-tab ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>
          <Package size={24} color={activeTab === 'equipment' ? 'var(--primary-700)' : '#94a3b8'} fill={activeTab === 'equipment' ? 'var(--primary-100)' : 'none'} />
          <span>Borrow</span>
        </button>
        <button className={`mobile-tab ${activeTab === 'report' ? 'active-report' : ''}`} onClick={() => setActiveTab('report')}>
          <AlertTriangle size={24} color={activeTab === 'report' ? '#ef4444' : '#94a3b8'} fill={activeTab === 'report' ? '#fef2f2' : 'none'} />
          <span>Report</span>
        </button>
      </div>

      {/* GLOBAL UNVERIFIED BANNER - ADDED */}
      {!user?.is_verified && (
        <div style={{ background: '#fef3c7', color: '#b45309', padding: '12px 20px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', borderBottom: '1px solid #fde68a' }}>
          <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
          Your account is currently unverified. Some features are restricted until Barangay Staff approves your account.
        </div>
      )}

      <div className="main-content">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="grid-layout">
            <div className="news-column">
              <div style={{ marginBottom: '2rem' }}>
                <h1 className="welcome-title" style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Welcome back, {user?.first_name || 'Neighbor'}! 👋</h1>
                <p style={{ color: '#475569', margin: 0, fontSize: '1.1rem' }}>Here is the latest news and updates from the barangay.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {loadingNews ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner-small" style={{ margin: '0 auto' }}></div></div>
                ) : announcements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', color: '#64748b' }}><Bell size={40} style={{ opacity: 0.2, marginBottom: '10px' }} /><p>No announcements.</p></div>
                ) : (
                  announcements.map(news => {
                    const isLiked = likedAnnouncements.has(news.id);
                    return (
                      <div key={news.id} className="animation-fade-in" style={{ background: news.is_pinned ? '#fefce8' : '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: news.is_pinned ? '0 10px 15px -3px rgba(245, 158, 11, 0.1), 0 0 0 2px #fde047' : '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: news.is_pinned ? 'none' : `5px solid var(--primary-500)` }}>
                        {news.image_url && <img src={news.image_url} alt="Poster" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b', paddingRight: '15px' }}>
                              {news.is_pinned && <Pin size={16} color="#f59e0b" style={{marginRight:'5px'}}/>}
                              {news.title}
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <Clock size={12} /> {timeAgo(news.created_at)}
                            </span>
                          </div>
                          <p style={{ color: '#475569', whiteSpace: 'pre-wrap', marginBottom: '1rem', lineHeight: '1.5' }}>{news.content}</p>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                            <button onClick={() => handleAcknowledge(news.id)} disabled={isLiked || isLiking} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: isLiked ? '1px solid #a7f3d0' : '1px solid #cbd5e1', background: isLiked ? '#ecfdf5' : 'transparent', color: isLiked ? '#059669' : '#64748b', cursor: isLiked ? 'default' : 'pointer' }}>
                              {isLiked ? <><CheckCircle size={16} /> Acknowledged</> : <><ThumbsUp size={16} /> Acknowledge</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="widgets-column">
              <div style={{ background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%)', color: 'white', borderRadius: '16px', padding: '25px 20px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 15px 0' }}><QrCode size={20} style={{verticalAlign:'bottom'}}/> Digital Barangay ID</h4>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '15px' }}>
                  {displayQR ? <img src={displayQR} alt="QR" style={{ width: '140px', height: '140px' }} /> : <div className="spinner-small"></div>}
                  <button onClick={handleDownloadIDCard} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-100)', color: 'var(--primary-700)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop:'10px' }}>
                    <Download size={14} /> Download ID
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Present this at the Barangay Hall.</p>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <ResidentProfileTab user={user} setUser={setUser} />
        )}

        {/* DOCUMENTS TAB - WITH RESTRICTION */}
        {activeTab === 'documents' && (
          !user?.is_verified ? (
            <RestrictedView featureName="Document Requests" />
          ) : (
            <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', minHeight: '60vh' }}>
              {!isCreatingRequest ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>My Document Requests</h2>
                    <button onClick={handleOpenForm} className="btn btn-primary"><Plus size={18} /> New Request</button>
                  </div>
                  {loadingRequests ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner"></div></div> : myRequests.length === 0 ? (
                      <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                        <FileText size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <h3 style={{ color: '#475569' }}>No Requests Found</h3>
                      </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {myRequests.map((req) => (
                        <div key={req.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--surface)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-800)' }}>{req.template?.template_name}</h3>
                            <span className={`badge ${req.status === 'completed' || req.status === 'released' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {req.status ? req.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Tracking No:</strong> {req.tracking_code}</p>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Purpose:</strong> {req.purpose}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button onClick={handleOpenList} className="btn btn-secondary" style={{ marginBottom: '20px', background: 'transparent', border: 'none' }}><ChevronLeft size={18} /> Back</button>
                  <DocumentRequestForm residentData={user} templates={templates} onCancel={handleOpenList} onSubmit={async (payload) => {
                      try {
                        const cleanPayload = { ...payload, status: 'pending' };
                        delete cleanPayload.notarizedDocFile;
                        await supabase.from('document_requests').insert([cleanPayload]);
                        setIsCreatingRequest(false);
                        fetchMyRequests(); 
                        toast.success("Request submitted!");
                      } catch (err) { toast.error("Failed: " + err.message); }
                  }} />
                </>
              )}
            </div>
          )
        )}

        {/* EQUIPMENT TAB - WITH RESTRICTION */}
        {activeTab === 'equipment' && (
          !user?.is_verified ? (
            <RestrictedView featureName="Equipment Borrowing" />
          ) : (
            <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', minHeight: '60vh' }}>
              {!isCreatingEqReq ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Equipment Requests</h2>
                      <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Borrow chairs, tables, and other barangay property.</p>
                    </div>
                    <button onClick={() => { setIsCreatingEqReq(true); setIsEqAgreed(false); }} className="btn btn-primary">
                      <Plus size={18} /> Borrow Equipment
                    </button>
                  </div>
                  
                  {loadingEquipment ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>Loading history...</div>
                  ) : myEquipmentReqs.length === 0 ? (
                      <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                        <Package size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No Borrowing History</h3>
                        <button onClick={() => { setIsCreatingEqReq(true); setIsEqAgreed(false); }} className="btn btn-secondary">Borrow an item now</button>
                      </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {myEquipmentReqs.map((req) => (
                        <div key={req.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--surface)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-800)' }}>{req.quantity}x {req.equipment_inventory?.item_name}</h3>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Needed: {new Date(req.borrow_date).toLocaleDateString()}</span>
                            </div>
                            <span className={`badge ${req.status === 'Released' || req.status === 'Returned' ? 'badge-success' : req.status === 'Rejected' || req.status.includes('Damage') ? 'badge-danger' : 'badge-warning'}`}>
                              {req.status ? req.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>
                          <div style={{ background: 'var(--neutral-50)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
                            <p style={{ margin: '0 0 5px 0' }}><strong>Return By:</strong> {new Date(req.expected_return).toLocaleDateString()}</p>
                            <p style={{ margin: '0 0 5px 0' }}><strong>Purpose:</strong> {req.purpose || 'Not specified'}</p>
                            {req.damage_notes && <p style={{ margin: 0, color: '#ef4444' }}><strong>Notes:</strong> {req.damage_notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setIsCreatingEqReq(false)} className="btn btn-secondary" style={{ marginBottom: '20px', background: 'transparent', border: 'none', padding: '5px 0', color: '#64748b' }}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <div style={{ maxWidth: '600px', margin: '0 auto', background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={22} color="var(--primary-600)"/> Request Equipment</h3>
                    
                    <form onSubmit={handleEquipmentSubmit}>
                      <div className="eq-form-group">
                        <label>Select Item to Borrow *</label>
                        <select required value={eqForm.equipment_id} onChange={e => setEqForm({...eqForm, equipment_id: e.target.value})}>
                          <option value="">-- Choose Item --</option>
                          {equipmentInventory.map(item => (
                            <option key={item.id} value={item.id} disabled={item.available_quantity === 0}>
                              {item.item_name} ({item.available_quantity} left)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="eq-form-group">
                        <label>Quantity Needed *</label>
                        <input type="number" min="1" required value={eqForm.quantity} onChange={e => setEqForm({...eqForm, quantity: e.target.value})} />
                      </div>

                      <div style={{ display: 'flex', gap: '15px' }}>
                        <div className="eq-form-group" style={{ flex: 1 }}>
                          <label>Date Needed *</label>
                          <input type="datetime-local" required value={eqForm.borrow_date} onChange={e => setEqForm({...eqForm, borrow_date: e.target.value})} />
                        </div>
                        <div className="eq-form-group" style={{ flex: 1 }}>
                          <label>Expected Return *</label>
                          <input type="datetime-local" required value={eqForm.expected_return} onChange={e => setEqForm({...eqForm, expected_return: e.target.value})} />
                        </div>
                      </div>

                      <div className="eq-form-group">
                        <label>Purpose / Event *</label>
                        <textarea rows="3" placeholder="e.g., Birthday Party, Wake, Meeting" required value={eqForm.purpose} onChange={e => setEqForm({...eqForm, purpose: e.target.value})}></textarea>
                      </div>

                      {/* AGREEMENT CHECKBOX */}
                      <div className="eq-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <input 
                          type="checkbox" 
                          id="eqAgree" 
                          checked={isEqAgreed} 
                          onChange={(e) => setIsEqAgreed(e.target.checked)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="eqAgree" style={{ fontSize: '0.85rem', fontWeight: 'normal', cursor: 'pointer', margin: 0, color: '#475569' }}>
                          I agree that all the details provided are correct before submitting this request.
                        </label>
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                         <button type="button" onClick={() => setIsCreatingEqReq(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                         <button type="submit" disabled={!isEqAgreed} className="btn btn-primary" style={{ flex: 1, opacity: isEqAgreed ? 1 : 0.6, cursor: isEqAgreed ? 'pointer' : 'not-allowed' }}>Submit Request</button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          )
        )}

        {/* REPORT/BLOTTER TAB - WITH RESTRICTION */}
        {activeTab === 'report' && (
          !user?.is_verified ? (
            <RestrictedView featureName="Incident Reporting" />
          ) : (
            <ResidentBlotterTab user={user} />
          )
        )} 
      </div>
    </div>
  );
};

export default ResidentHome;