import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Image, UploadCloud, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import './GallerySettings.css';

const GallerySettings = () => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Storage bucket config
  const BUCKET_NAME = 'documents'; // Reusing existing bucket since 'gallery' might not exist
  const GALLERY_PATH = 'gallery/';
  const MAX_IMAGES = 10; // Open Question 1 answered: reasonable limit

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_configs') // Changed to system_configs to match the existing schema from SettingsPage
        .select('value')
        .eq('key', 'gallery_images')
        .single();

      // If no rows found, data is null
      if (error && error.code !== 'PGRST116') throw error;
      
      let parsedImages = [];
      if (data && data.value) {
        try {
          parsedImages = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        } catch(e) {
          console.error("Error parsing gallery images:", e);
        }
      }
      setImages(parsedImages || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      toast.error('Failed to load gallery images.');
    } finally {
      setLoading(false);
    }
  };

  const saveGalleryImages = async (newImages) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_configs')
        .upsert({ 
          key: 'gallery_images', 
          value: JSON.stringify(newImages), 
          updated_at: new Date() 
        });

      if (error) throw error;
      setImages(newImages);
    } catch (error) {
      console.error('Error saving gallery images:', error);
      toast.error('Failed to save gallery changes.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`You can only upload a maximum of ${MAX_IMAGES} images. Please delete some first.`);
      return;
    }

    setUploading(true);
    let successCount = 0;
    let newImageRecords = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image.`);
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit.`);
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${GALLERY_PATH}${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        newImageRecords.push({
          id: fileName,
          url: urlData.publicUrl,
          path: filePath,
          label: file.name.split('.')[0], // Default label is filename without extension
          uploaded_at: new Date().toISOString()
        });
        
        successCount++;
      } catch (err) {
        console.error("Error uploading file:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      const updatedImages = [...images, ...newImageRecords];
      await saveGalleryImages(updatedImages);
      toast.success(`Successfully uploaded ${successCount} image(s).`);
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (imageToDelete) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    
    try {
      // 1. Delete from Supabase Storage
      if (imageToDelete.path) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([imageToDelete.path]);
      }

      // 2. Update database record
      const updatedImages = images.filter(img => img.id !== imageToDelete.id);
      await saveGalleryImages(updatedImages);
      toast.success("Image deleted.");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image.");
    }
  };

  const handleLabelChange = (id, newLabel) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, label: newLabel } : img));
  };

  const handleSaveLabels = async () => {
    await saveGalleryImages(images);
    toast.success("Image labels saved.");
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="spinner" size={32} color="var(--primary-600)" />
      </div>
    );
  }

  return (
    <div className="gallery-settings">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={20} color="var(--primary-600)" />
            Landing Page Gallery
          </h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage the images that appear in the community gallery on the public Landing Page. ({images.length}/{MAX_IMAGES})
          </p>
        </div>
        
        {images.length > 0 && (
          <button className="btn btn-primary" onClick={handleSaveLabels} disabled={saving}>
            {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            Save Labels
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div 
        className={`gallery-upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          multiple 
          accept="image/jpeg,image/png,image/webp" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Loader2 size={40} className="spinner" color="var(--primary-500)" />
            <p>Uploading images...</p>
          </div>
        ) : (
          <>
            <UploadCloud className="upload-icon" />
            <div>
              <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Click to upload or drag and drop</p>
              <p className="upload-hint">JPG, PNG, or WebP (max. 5MB per image)</p>
            </div>
          </>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="gallery-grid">
          {images.map((img) => (
            <div key={img.id} className="gallery-card">
              <button 
                className="gallery-card-delete" 
                onClick={() => handleDeleteImage(img)}
                title="Delete image"
              >
                <Trash2 size={16} />
              </button>
              <img src={img.url} alt={img.label} className="gallery-card-image" />
              <div className="gallery-card-content">
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={img.label} 
                    onChange={(e) => handleLabelChange(img.id, e.target.value)}
                    placeholder="Image label (e.g., Community Event)"
                  />
                  <Edit2 size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                </div>
                <div className="gallery-card-meta">
                  <span>Added {new Date(img.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gallery-empty">
          <Image size={48} style={{ color: 'var(--border)', marginBottom: '1rem', opacity: 0.5 }} />
          <p>No images in the gallery yet.</p>
          <p style={{ fontSize: '0.85rem' }}>Upload images above to showcase them on the Landing Page. If left empty, default placeholder images will be shown.</p>
        </div>
      )}
    </div>
  );
};

export default GallerySettings;
