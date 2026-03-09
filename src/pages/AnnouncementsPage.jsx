import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Megaphone, AlertTriangle, Bell, Info, Pin, Image as ImageIcon, MapPin, CalendarX2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    title: '', content: '', type: 'Info', target_purok: 'All', is_pinned: false, expiration_date: '' 
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false }) // Pinned items first
      .order('created_at', { ascending: false });
      
    if (error) toast.error("Failed to load announcements");
    else setAnnouncements(data || []);
    setLoading(false);
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

      // 1. Upload image if a new one is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `announcements/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // We reuse your existing 'documents' bucket to store announcement posters
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
                  <th>Target / Expiration</th>
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
                        <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><MapPin size={14}/> {a.target_purok}</span>
                          <span style={{ display:'flex', alignItems:'center', gap:'4px', color: (a.expiration_date && new Date(a.expiration_date) < new Date()) ? '#ef4444' : '#64748b' }}>
                            <CalendarX2 size={14}/> {a.expiration_date ? new Date(a.expiration_date).toLocaleDateString() : 'No expiry'}
                          </span>
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

      {/* NEW/EDIT MODAL */}
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
                  {/* --- FIXED TARGET AUDIENCE DROPDOWN --- */}
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