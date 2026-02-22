import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { 
  Settings, 
  Mail, 
  FileText, 
  Clock,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Input } from '../common';
import toast from 'react-hot-toast'; // <--- ADDED MISSING IMPORT HERE
import './SystemSettings.css';

/**
 * SystemSettings Component
 * * Configure system-wide settings and features
 */
const SystemSettings = () => {
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    enable_email_notifications: settings?.enable_email_notifications || false,
    enable_qr_email: settings?.enable_qr_email || false,
    auto_backup: settings?.auto_backup || false,
    require_approval: settings?.require_approval || true,
    documents_per_day_limit: settings?.documents_per_day_limit || '100',
    session_timeout: settings?.session_timeout || '60',
    default_document_fee: settings?.default_document_fee || '0',
    processing_time_days: settings?.processing_time_days || '3',
  });

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
      await updateSettings(formData);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to save settings'); // Added error toast too
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      enable_email_notifications: settings?.enable_email_notifications || false,
      enable_qr_email: settings?.enable_qr_email || false,
      auto_backup: settings?.auto_backup || false,
      require_approval: settings?.require_approval || true,
      documents_per_day_limit: settings?.documents_per_day_limit || '100',
      session_timeout: settings?.session_timeout || '60',
      default_document_fee: settings?.default_document_fee || '0',
      processing_time_days: settings?.processing_time_days || '3',
    });
  };

  return (
    <div className="system-settings">
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
                  {formData.enable_email_notifications ? (
                    <ToggleRight size={20} />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
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
                  {formData.enable_qr_email ? (
                    <ToggleRight size={20} />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
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
                  {formData.require_approval ? (
                    <ToggleRight size={20} />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
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
                  {formData.auto_backup ? (
                    <ToggleRight size={20} />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Document Settings */}
        <div className="settings-section">
          <div className="section-header">
            <FileText size={20} />
            <h3>Document Settings</h3>
          </div>

          <div className="form-grid">
            <Input
              label="Daily Document Limit"
              name="documents_per_day_limit"
              type="number"
              value={formData.documents_per_day_limit}
              onChange={handleChange}
              placeholder="100"
              hint="Maximum requests per day per resident"
            />

            <Input
              label="Processing Time (Days)"
              name="processing_time_days"
              type="number"
              value={formData.processing_time_days}
              onChange={handleChange}
              placeholder="3"
              hint="Average processing time in days"
            />

            <Input
              label="Default Document Fee (₱)"
              name="default_document_fee"
              type="number"
              step="0.01"
              value={formData.default_document_fee}
              onChange={handleChange}
              placeholder="0.00"
              hint="Default fee for documents"
            />

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
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading}
          >
            <RefreshCw size={20} />
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;