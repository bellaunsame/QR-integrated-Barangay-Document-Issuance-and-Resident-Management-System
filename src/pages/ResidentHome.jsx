import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, AlertTriangle, Bell, LogOut, QrCode, Phone, ChevronRight, Pin, MapPin, ChevronLeft, Clock, CheckCircle, XCircle, Plus, ThumbsUp, Download, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; 

import brgyHallBg from '../assets/Brgyhall.jpg';
import logo from '../assets/brgy.2-icon.png'; 
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import ResidentBlotterTab from '../components/residents/ResidentBlotterTab'; 

// --- IMPORTS FOR ID GENERATION ---
import { generateQRData, generateQRCodeImage } from '../services/qrCodeService';
import idBackground from '../assets/id-bg.png'; 

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

  // --- NOTIFICATION STATES ---
  const [showNotifs, setShowNotifs] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(new Set()); // Tracks read notifications
  const notifRef = useRef(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('resident_session');
    if (sessionStr) {
      const parsedUser = JSON.parse(sessionStr);
      setUser(parsedUser);
      
      // Load previously dismissed notifications from Local Storage
      const storedDismissed = localStorage.getItem(`dismissed_notifs_${parsedUser.id}`);
      if (storedDismissed) {
        setDismissedNotifs(new Set(JSON.parse(storedDismissed)));
      }
    } else {
      navigate('/resident-login', { replace: true });
    }
  }, [navigate]);

  // Click outside to close notifications
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

  const fetchEquipmentData = async () => {
    if (!user) return;
    setLoadingEquipment(true);
    try {
      const { data: inv } = await supabase.from('equipment_inventory').select('*');
      if (inv) setEquipmentInventory(inv);

      const { data: myBorrows } = await supabase
        .from('borrowing_records')
        .select(`*, equipment_inventory(item_name)`)
        .eq('borrower_name', `${user.first_name} ${user.last_name}`) 
        .order('borrow_date', { ascending: false });
      
      if (myBorrows) setMyEquipmentReqs(myBorrows);
    } catch (err) {
      console.error(err);
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

  // REAL-TIME UPDATES FOR BOTH DOCUMENTS & EQUIPMENT
  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    fetchEquipmentData(); 

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

    return () => { 
      supabase.removeChannel(docChannel); 
      supabase.removeChannel(eqChannel);
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

  const handleEquipmentSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Submitting equipment request...");
    try {
      const { error } = await supabase.from('borrowing_records').insert([{
        borrower_name: `${user.first_name} ${user.last_name}`,
        equipment_id: eqForm.equipment_id,
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
  // COMPILE NOTIFICATIONS & HANDLE CLICK
  // ==========================================
  const allNotifications = [
    // 1. Unread Announcements
    ...announcements
      .filter(a => !likedAnnouncements.has(a.id))
      .map(a => ({ id: `ann_${a.id}`, title: 'New Announcement', desc: a.title, icon: <Bell size={16}/>, color: '#f59e0b', tab: 'home' })),
    
    // 2. Document Updates 
    ...myRequests
      .filter(r => r.status !== 'pending')
      .map(r => ({ id: `doc_${r.id}_${r.status}`, title: `Document ${r.status}`, desc: r.template?.template_name || 'Request updated', icon: <FileText size={16}/>, color: r.status === 'rejected' ? '#ef4444' : '#10b981', tab: 'documents' })),
    
    // 3. Equipment Updates (Pending/Rejected/Returned states)
    ...myEquipmentReqs
      .filter(e => e.status !== 'Pending' && e.status !== 'Released')
      .map(e => ({ id: `eq_${e.id}_${e.status}`, title: `Equipment ${e.status}`, desc: `${e.quantity}x ${e.equipment_inventory?.item_name}`, icon: <Package size={16}/>, color: e.status === 'Rejected' ? '#ef4444' : '#10b981', tab: 'equipment' })),

    // 4. Equipment Return Reminders (Active Borrows: Due Soon or Overdue)
    ...myEquipmentReqs
      .filter(e => e.status === 'Released') 
      .map(e => {
        const dueDate = new Date(e.expected_return);
        const now = new Date();
        const timeDiff = dueDate - now;
        
        // If the date has passed (Overdue)
        if (timeDiff < 0) {
          return { id: `rem_overdue_${e.id}`, title: `OVERDUE: Return Equipment`, desc: `Please return ${e.quantity}x ${e.equipment_inventory?.item_name} immediately.`, icon: <AlertTriangle size={16}/>, color: '#ef4444', tab: 'equipment' };
        } 
        // If due within the next 24 hours (86400000 milliseconds)
        else if (timeDiff < 86400000) {
          return { id: `rem_duesoon_${e.id}`, title: `Reminder: Return Soon`, desc: `Your borrowed ${e.quantity}x ${e.equipment_inventory?.item_name} is due today.`, icon: <Clock size={16}/>, color: '#f59e0b', tab: 'equipment' };
        }
        
        // Otherwise, just a standard 'Released' notification
        return { id: `eq_${e.id}_${e.status}`, title: `Equipment ${e.status}`, desc: `${e.quantity}x ${e.equipment_inventory?.item_name}`, icon: <Package size={16}/>, color: '#10b981', tab: 'equipment' };
      }).filter(Boolean)
  ];

  // Only show notifications that haven't been dismissed
  const notifications = allNotifications.filter(n => !dismissedNotifs.has(n.id)).slice(0, 10);

  const handleNotificationClick = (notif) => {
    // Change tab to where the info is
    setActiveTab(notif.tab);
    
    // Close dropdown
    setShowNotifs(false);
    
    // Mark as read (dismissed)
    const updatedDismissed = new Set(dismissedNotifs);
    updatedDismissed.add(notif.id);
    setDismissedNotifs(updatedDismissed);
    
    // Save to local storage so it remembers next time
    localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify([...updatedDismissed]));
  };

  if (!user) return null; 

  return (
    <>
      <style>{`
        .resident-layout {
          background-image: linear-gradient(rgba(241, 245, 249, 0.85), rgba(241, 245, 249, 0.95)), url(${brgyHallBg});
          background-size: cover; background-position: center; background-attachment: fixed;
          min-height: 100vh; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif;
        }
        
        .glass-nav {
          background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          position: sticky; top: 0; z-index: 50; padding: 0.5rem 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 65px; width: 100%; }
        .main-content { max-width: 1200px; margin: 2rem auto; width: 100%; padding: 0 2rem; flex: 1; }
        .grid-layout { display: flex; gap: 2rem; }
        .news-column { flex: 2.5; }
        .widgets-column { flex: 1; min-width: 300px; }
        .welcome-title { font-size: 2rem; }
        .mobile-bottom-nav { display: none; }

        .notif-dropdown {
          position: absolute;
          top: 130%;
          right: -10px; 
          background: #fff;
          width: 340px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          border: 1px solid #e2e8f0;
          z-index: 1000;
          overflow: hidden;
        }

        .notif-item:hover { background: #f8fafc; }

        @media (max-width: 768px) {
          .glass-nav { padding: 0.5rem 1rem; }
          .nav-container { height: 55px; }
          .desktop-tabs { display: none !important; } 
          .main-content { margin: 1rem auto; padding: 0 1rem; }
          .grid-layout { flex-direction: column; gap: 1.5rem; }
          .widgets-column { min-width: 100%; }
          .welcome-title { font-size: 1.5rem; }
          .resident-layout { padding-bottom: 80px; }
          
          .notif-dropdown {
            position: fixed;
            top: 65px; 
            right: 15px;
            left: 15px; 
            width: auto;
            max-width: none;
          }

          .mobile-bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff;
            border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 15px rgba(0,0,0,0.05); z-index: 100;
            justify-content: space-between; align-items: center; padding: 8px 5px;
            padding-bottom: calc(8px + env(safe-area-inset-bottom)); 
          }

          .mobile-tab {
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
            font-size: 0.7rem; font-weight: 700; color: #64748b; background: transparent; border: none;
            flex: 1; padding: 6px 0; cursor: pointer; transition: all 0.2s;
          }

          .mobile-tab span { margin-top: 2px; }
          .mobile-tab.active { color: var(--primary-700); }
          .mobile-tab.active-report { color: #ef4444; }
        }

        .btn-download-qr:hover { background-color: var(--primary-200) !important; transform: translateY(-1px); }
        .eq-form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; }
        .eq-form-group label { font-weight: bold; font-size: 0.9rem; color: #334155; }
        .eq-form-group input, .eq-form-group select, .eq-form-group textarea { padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; }
      `}</style>

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
              
              {/* --- NOTIFICATION BELL --- */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifs(!showNotifs)} 
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '50%', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  <Bell size={20} color="#475569" />
                  {notifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></span>
                  )}
                </button>

                {showNotifs && (
                  <div className="notif-dropdown">
                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Notifications
                      <span style={{ fontSize: '0.75rem', background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '2px 8px', borderRadius: '10px' }}>{notifications.length} New</span>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>You're all caught up!</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className="notif-item"
                            onClick={() => handleNotificationClick(n)} 
                            style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                          >
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${n.color}20`, color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {n.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{n.title}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{n.desc}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* --- END NOTIFICATIONS --- */}

              <div className="desktop-tabs" style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{user?.first_name}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}><CheckCircle size={10} /> Verified</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', border: '2px solid #fff' }}>
                {user?.first_name?.charAt(0) || 'R'}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <h3 style={{ margin: 0 }}>{news.is_pinned && <Pin size={16} color="#f59e0b" style={{marginRight:'5px'}}/>}{news.title}</h3>
                            </div>
                            <p style={{ color: '#475569', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{news.content}</p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                              <button onClick={() => handleAcknowledge(news.id)} disabled={isLiked || isLiking} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: isLiked ? '1px solid #a7f3d0' : '1px solid #cbd5e1', background: isLiked ? '#ecfdf5' : 'transparent', color: isLiked ? '#059669' : '#64748b', cursor: 'pointer' }}>
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

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
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
          )}

          {/* EQUIPMENT TAB */}
          {activeTab === 'equipment' && (
            <div className="animation-fade-in" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', minHeight: '60vh' }}>
              {!isCreatingEqReq ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Equipment Requests</h2>
                      <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Borrow chairs, tables, and other barangay property.</p>
                    </div>
                    <button onClick={() => setIsCreatingEqReq(true)} className="btn btn-primary">
                      <Plus size={18} /> Borrow Equipment
                    </button>
                  </div>
                  
                  {loadingEquipment ? (
                     <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>Loading history...</div>
                  ) : myEquipmentReqs.length === 0 ? (
                     <div style={{ background: '#f8fafc', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                       <Package size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.5 }} />
                       <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No Borrowing History</h3>
                       <button onClick={() => setIsCreatingEqReq(true)} className="btn btn-secondary">Borrow an item now</button>
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

                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                         <button type="button" onClick={() => setIsCreatingEqReq(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                         <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Request</button>
                      </div>
                    </form>
                  </div>
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