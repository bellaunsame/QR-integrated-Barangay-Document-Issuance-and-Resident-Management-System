import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { 
  Settings, 
  Mail, 
  FileText, 
  Clock,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Type
} from 'lucide-react';
import { Input } from '../common';
import toast from 'react-hot-toast';
import './SystemSettings.css';

const SystemSettings = () => {
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    enable_email_notifications: settings?.enable_email_notifications || false,
    enable_qr_email: settings?.enable_qr_email || false,
    auto_backup: settings?.auto_backup || false,
    require_approval: settings?.require_approval ?? true,
    session_timeout: settings?.session_timeout || '60',
    // Fetch font size from LocalStorage instead of Supabase
    system_font_size: localStorage.getItem('system_font_size') || 'medium', 
  });

  // --- FORCE CSS OVERRIDE ---
  const applyFontSize = (size) => {
    const root = document.documentElement;
    if (size === 'small') {
      root.style.setProperty('font-size', '14px', 'important');
    } else if (size === 'large') {
      root.style.setProperty('font-size', '18px', 'important');
    } else {
      root.style.setProperty('font-size', '16px', 'important'); 
    }
  };

  useEffect(() => {
    applyFontSize(formData.system_font_size);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save visual settings to LocalStorage
      localStorage.setItem('system_font_size', formData.system_font_size);
      applyFontSize(formData.system_font_size);

      // 2. Save system settings to Supabase (Excluding the font size)
      const { system_font_size, ...databaseSettings } = formData;
      await updateSettings(databaseSettings);
      
      toast.success('Settings saved and applied!');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const savedFont = localStorage.getItem('system_font_size') || 'medium';
    setFormData({
      enable_email_notifications: settings?.enable_email_notifications || false,
      enable_qr_email: settings?.enable_qr_email || false,
      auto_backup: settings?.auto_backup || false,
      require_approval: settings?.require_approval ?? true,
      session_timeout: settings?.session_timeout || '60',
      system_font_size: savedFont,
    });
    applyFontSize(savedFont);
  };

  return (
    <div className="system-settings fade-in">
      <form onSubmit={handleSubmit}>
        
        {/* Feature Toggles */}
        <div className="settings-section">
          <div className="section-header">
            <Settings size={20} />
            <h3>Feature Settings</h3>
          </div>

          <div className="toggle-list">
            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-icon">
                  <Mail size={20} />
                </div>
                <div className="toggle-text">
                  <h4>Email Notifications</h4>
                  <p>Send email notifications for document status updates</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="enable_email_notifications"
                  checked={formData.enable_email_notifications}
                  onChange={handleChange}
                />
                <span className="toggle-slider">
                  {formData.enable_email_notifications ? <ToggleRight size={28} color="var(--primary-600)" /> : <ToggleLeft size={28} color="var(--text-tertiary)" />}
                </span>
              </label>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-icon">
                  <Mail size={20} />
                </div>
                <div className="toggle-text">
                  <h4>QR Code Email</h4>
                  <p>Automatically email QR codes to residents after registration</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="enable_qr_email"
                  checked={formData.enable_qr_email}
                  onChange={handleChange}
                />
                <span className="toggle-slider">
                  {formData.enable_qr_email ? <ToggleRight size={28} color="var(--primary-600)" /> : <ToggleLeft size={28} color="var(--text-tertiary)" />}
                </span>
              </label>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-icon">
                  <FileText size={20} />
                </div>
                <div className="toggle-text">
                  <h4>Require Approval</h4>
                  <p>Document requests require admin approval before processing</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="require_approval"
                  checked={formData.require_approval}
                  onChange={handleChange}
                />
                <span className="toggle-slider">
                  {formData.require_approval ? <ToggleRight size={28} color="var(--primary-600)" /> : <ToggleLeft size={28} color="var(--text-tertiary)" />}
                </span>
              </label>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-icon">
                  <Clock size={20} />
                </div>
                <div className="toggle-text">
                  <h4>Auto Backup</h4>
                  <p>Automatically backup database daily</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="auto_backup"
                  checked={formData.auto_backup}
                  onChange={handleChange}
                />
                <span className="toggle-slider">
                  {formData.auto_backup ? <ToggleRight size={28} color="var(--primary-600)" /> : <ToggleLeft size={28} color="var(--text-tertiary)" />}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* System & Appearance Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Type size={20} />
            <h3>Appearance & Access</h3>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                System Font Size
              </label>
              <select
                name="system_font_size"
                value={formData.system_font_size}
                onChange={handleChange}
                className="form-control"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--surface-bg)' }}
              >
                <option value="small">Small (Condensed)</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large (Accessibility)</option>
              </select>
              <span className="hint" style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                Adjust the global text size of the dashboard layout.
              </span>
            </div>

            <Input
              label="Session Timeout (Minutes)"
              name="session_timeout"
              type="number"
              value={formData.session_timeout}
              onChange={handleChange}
              placeholder="60"
              hint="Auto-logout after inactivity"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="settings-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
            <RefreshCw size={20} /> Reset
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner-small"></div>Saving...</> : <><Save size={20} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;