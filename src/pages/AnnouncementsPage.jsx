import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Megaphone, AlertTriangle, Bell, Info, Pin, Image as ImageIcon, MapPin, CalendarX2, ThumbsUp, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // --- NEW: LIKES VIEWER MODAL STATES ---
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [viewingLikesFor, setViewingLikesFor] = useState(null);
  const [likedResidents, setLikedResidents] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  const [formData, setFormData] = useState({ 
    title: '', content: '', type: 'Info', target_purok: 'All', is_pinned: false, expiration_date: '' 
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      // Fetch announcements
      const { data: newsData, error: newsError } = await supabase.from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (newsError) throw newsError;

      // Fetch the like counts for all announcements
      const { data: likesData, error: likesError } = await supabase
        .from('announcement_likes')
        .select('announcement_id');

      if (likesError) throw likesError;

      // Calculate how many likes each announcement has
      const likeCounts = {};
      likesData.forEach(like => {
        likeCounts[like.announcement_id] = (likeCounts[like.announcement_id] || 0) + 1;
      });

      // Merge the counts into the announcements data
      const mergedData = (newsData || []).map(news => ({
        ...news,
        like_count: likeCounts[news.id] || 0
      }));

      setAnnouncements(mergedData);
    } catch (error) {
      toast.error("Failed to load announcements");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: FETCH WHO LIKED A SPECIFIC POST ---
  const handleViewLikes = async (announcement) => {
    setViewingLikesFor(announcement.title);
    setShowLikesModal(true);
    setLoadingLikes(true);
    setLikedResidents([]);

    try {
      // Fetch names by joining announcement_likes with the residents table
      const { data, error } = await supabase
        .from('announcement_likes')
        .select(`
          created_at,
          residents (
            first_name,
            last_name,
            purok
          )
        `)
        .eq('announcement_id', announcement.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLikedResidents(data || []);
    } catch (error) {
      toast.error("Failed to load resident acknowledgements.");
      console.error(error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("Image must be less than 5MB");
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `announcements/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }

      const payload = { 
        ...formData, 
        image_url: finalImageUrl,
        expiration_date: formData.expiration_date || null,
        created_by: user?.id 
      };
      
      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success("Announcement updated!");
      } else {
        const { error } = await supabase.from('announcements').insert([payload]);
        if (error) throw error;
        toast.success("Announcement posted!");
      }
      
      setShowModal(false);
      loadAnnouncements();
    } catch (error) {
      toast.error("Error saving announcement: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted successfully");
      loadAnnouncements();
    }
  };

  const openModal = (a = null) => {
    setImageFile(null);
    if (a) {
      setEditingId(a.id);
      setFormData({ 
        title: a.title, content: a.content, type: a.type, 
        target_purok: a.target_purok || 'All', is_pinned: a.is_pinned || false, 
        expiration_date: a.expiration_date || '', image_url: a.image_url 
      });
      setImagePreview(a.image_url || '');
    } else {
      setEditingId(null);
      setFormData({ title: '', content: '', type: 'Info', target_purok: 'All', is_pinned: false, expiration_date: '' });
      setImagePreview('');
    }
    setShowModal(true);
  };

  return (
    <div className="residents-page">
      <div className="page-header">
        <div>
          <h1><Megaphone size={28} style={{ display:'inline', marginRight:'10px', verticalAlign:'bottom', color:'var(--primary-600)' }}/> News & Announcements</h1>
          <p>Post updates, warnings, and event posters for residents to see on their portal.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={20} /> Post New Update</button>
      </div>

      <div className="card desktop-table-container">
        {loading ? <div style={{padding:'2rem', textAlign:'center'}}>Loading...</div> : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title & Content</th>
                  <th>Reach / Engagement</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign:'center', padding:'2rem'}}>No announcements posted yet.</td></tr>
                ) : (
                  announcements.map((a) => (
                    <tr key={a.id} style={{ background: a.is_pinned ? '#fefce8' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                          {a.is_pinned && <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#fff' }}><Pin size={12}/> Pinned</span>}
                          <span className={`badge`} style={{ 
                            background: a.type === 'Warning' ? '#fee2e2' : a.type === 'Event' ? '#d1fae5' : '#e0e7ff',
                            color: a.type === 'Warning' ? '#ef4444' : a.type === 'Event' ? '#10b981' : '#3b82f6', border: '1px solid currentColor'
                          }}>
                            {a.type === 'Warning' ? <AlertTriangle size={12}/> : a.type === 'Event' ? <Bell size={12}/> : <Info size={12}/>} {a.type}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {a.image_url && <img src={a.image_url} alt="poster" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />}
                          <div>
                            <strong>{a.title}</strong>
                            <p style={{ margin:'5px 0 0 0', fontSize:'0.85rem', color:'#64748b' }}>{a.content.length > 60 ? a.content.substring(0, 60) + '...' : a.content}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          
                          {/* TARGET AUDIENCE */}
                          <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                            <MapPin size={14}/> <span>{a.target_purok}</span>
                          </div>

                          {/* NEW: ACKNOWLEDGEMENT BADGE (Clickable) */}
                          <div 
                            onClick={() => a.like_count > 0 ? handleViewLikes(a) : null}
                            style={{ 
                              display:'inline-flex', alignItems:'center', gap:'6px', padding: '4px 8px', borderRadius: '20px',
                              background: a.like_count > 0 ? '#ecfdf5' : '#f1f5f9', 
                              color: a.like_count > 0 ? '#059669' : '#94a3b8', 
                              border: a.like_count > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              fontWeight: 'bold', width: 'fit-content', cursor: a.like_count > 0 ? 'pointer' : 'default',
                              transition: 'all 0.2s'
                            }}
                            title={a.like_count > 0 ? "Click to see who acknowledged" : "No acknowledgements yet"}
                          >
                            <ThumbsUp size={14}/> {a.like_count} Acknowledged
                          </div>

                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => openModal(a)}><Edit2 size={18} /></button>
                          <button className="btn-icon" style={{color:'#ef4444', background:'#fee2e2'}} onClick={() => handleDelete(a.id)}><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- NEW: LIKES VIEWER MODAL --- */}
      {showLikesModal && (
        <div className="modal-overlay" onClick={() => setShowLikesModal(false)} style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1100 }}>
          <div className="modal-content animation-fade-in" onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}><ThumbsUp size={20} /> Resident Acknowledgements</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>For: {viewingLikesFor}</p>
              </div>
              <button onClick={() => setShowLikesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {loadingLikes ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading residents...</div>
              ) : likedResidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No one has acknowledged this yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {likedResidents.map((record, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                        {record.residents?.first_name?.charAt(0) || 'R'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>
                          {record.residents?.first_name} {record.residents?.last_name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          {record.residents?.purok} • {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* NEW/EDIT POST MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'600px', maxHeight: '90vh', overflowY: 'auto', padding:'25px' }}>
            <h2 style={{marginTop:0, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px'}}>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
            <form onSubmit={handleSave}>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display:'block', marginBottom:'5px', fontWeight:'bold' }}>Type *</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1' }}>
                    <option value="Info">General Info</option>
                    <option value="Event">Barangay Event</option>
                    <option value="Warning">Warning / Alert</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', marginBottom:'5px', fontWeight:'bold' }}>Target Audience</label>
                  <select value={formData.target_purok} onChange={e => setFormData({...formData, target_purok: e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1' }}>
                    <option value="All">All Residents</option>
                    <option value="Purok 1">Purok 1</option>
                    <option value="Purok 2">Purok 2</option>
                    <option value="Purok 3">Purok 3</option>
                    <option value="Purok 4">Purok 4</option>
                    <option value="Purok 5">Purok 5</option>
                    <option value="Purok 6">Purok 6</option>
                    <option value="Purok 7">Purok 7</option>
                    <option value="Pabahay Phase 1">Pabahay Phase 1</option>
                    <option value="Pabahay Phase 2">Pabahay Phase 2</option>
                    <option value="Pabahay Phase 3">Pabahay Phase 3</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:'15px' }}>
                <label style={{ display:'block', marginBottom:'5px', fontWeight:'bold' }}>Title *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1' }} placeholder="e.g., Road Clearing Operations" />
              </div>
              
              <div style={{ marginBottom:'15px' }}>
                <label style={{ display:'block', marginBottom:'5px', fontWeight:'bold' }}>Content / Details *</label>
                <textarea required rows="4" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1', resize:'vertical' }} placeholder="Write the full announcement here..."></textarea>
              </div>

              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #cbd5e1' }}>
                <label style={{ display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'10px', fontWeight:'bold' }}>
                  <span><ImageIcon size={18} style={{ display:'inline', verticalAlign:'text-bottom', marginRight:'5px'}}/> Attach Poster / Image (Optional)</span>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '5px 10px', fontSize: '0.8rem' }}>
                    Browse File
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                  </label>
                </label>
                {imagePreview && (
                  <div style={{ textAlign: 'center', position: 'relative', marginTop: '10px' }}>
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <button type="button" onClick={() => { setImagePreview(''); setImageFile(null); setFormData({...formData, image_url: ''}); }} style={{ position: 'absolute', top: '-10px', right: 'calc(50% - 100px)', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>×</button>
                  </div>
                )}
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                <div>
                  <label style={{ display:'block', marginBottom:'5px', fontWeight:'bold' }}>Auto-Remove Date (Optional)</label>
                  <input type="date" min={new Date().toISOString().split('T')[0]} value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1' }} />
                  <small style={{ color: '#64748b' }}>Hides from residents after this date.</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: formData.is_pinned ? '#fefce8' : '#f1f5f9', padding: '10px', borderRadius: '6px', border: formData.is_pinned ? '1px solid #fde047' : '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: '100%', fontWeight: 'bold', color: formData.is_pinned ? '#b45309' : '#475569' }}>
                    <input type="checkbox" checked={formData.is_pinned} onChange={e => setFormData({...formData, is_pinned: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: '#f59e0b' }} />
                    <Pin size={20} /> Pin to top of feed
                  </label>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Post Announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;