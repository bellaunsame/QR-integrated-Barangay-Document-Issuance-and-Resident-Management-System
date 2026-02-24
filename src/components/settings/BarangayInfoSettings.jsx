import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Building2, Phone, Mail, Save, RefreshCw } from 'lucide-react';
import { Input } from '../common';
import toast from 'react-hot-toast'; // Required for notifications
import './BarangayInfoSettings.css';

/**
 * BarangayInfoSettings Component
 * Manages barangay administrative information and contact details.
 * Integrates with SettingsContext to persist data to the Supabase backend.
 */
const BarangayInfoSettings = () => {
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  
  // Initialize form state with data from SettingsContext
  // FIXED: Changed captain_name to barangay_chairman and kagawad_names to barangay_kagawad_list
  const [formData, setFormData] = useState({
    barangay_name: settings?.barangay_name || '',
    city_municipality: settings?.city_municipality || '',
    province: settings?.province || '',
    region: settings?.region || '',
    zip_code: settings?.zip_code || '',
    contact_number: settings?.contact_number || '',
    email_address: settings?.email_address || '',
    barangay_chairman: settings?.barangay_chairman || '',
    barangay_kagawad_list: settings?.barangay_kagawad_list || '',
    sk_chairman: settings?.sk_chairman || '',
    barangay_website: settings?.barangay_website || '',
    enable_email_notifications: settings?.enable_email_notifications ?? true
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Validates and submits the updated barangay information.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field Validation
    if (!formData.barangay_name) {
      toast.error('Barangay name is required');
      return;
    }

    // Standard Philippine Mobile Format Check (e.g., 09123456789)
    const phoneRegex = /^09\d{9}$/;
    if (formData.contact_number && !phoneRegex.test(formData.contact_number)) {
      toast.error('Invalid phone number format (Use: 09XXXXXXXXX)');
      return;
    }

    setLoading(true);

    try {
      // Calls the updateSettings function provided by SettingsContext
      await updateSettings(formData);
      toast.success('Barangay information updated successfully!');
    } catch (error) {
      console.error('Error updating barangay info:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets the form fields to the last saved state in the database.
   */
  const handleReset = () => {
    if (window.confirm('Discard unsaved changes and reset form?')) {
      setFormData({
        barangay_name: settings?.barangay_name || '',
        city_municipality: settings?.city_municipality || '',
        province: settings?.province || '',
        region: settings?.region || '',
        zip_code: settings?.zip_code || '',
        contact_number: settings?.contact_number || '',
        email_address: settings?.email_address || '',
        barangay_chairman: settings?.barangay_chairman || '',
        barangay_kagawad_list: settings?.barangay_kagawad_list || '',
        sk_chairman: settings?.sk_chairman || '',
        barangay_website: settings?.barangay_website || '',
      });
      toast('Form has been reset');
    }
  };

  return (
    <div className="barangay-info-settings">
      <form onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <div className="settings-section">
          <div className="section-header">
            <Building2 size={20} />
            <h3>Basic Information</h3>
          </div>

          <div className="form-grid">
            <Input
              label="Barangay Name"
              name="barangay_name"
              value={formData.barangay_name}
              onChange={handleChange}
              placeholder="Enter barangay name"
              required
            />

            <Input
              label="City/Municipality"
              name="city_municipality"
              value={formData.city_municipality}
              onChange={handleChange}
              placeholder="Enter city or municipality"
              required
            />

            <Input
              label="Province"
              name="province"
              value={formData.province}
              onChange={handleChange}
              placeholder="Enter province"
              required
            />

            <Input
              label="Region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              placeholder="e.g., NCR, Region IV-A"
              required
            />

            <Input
              label="ZIP Code"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              placeholder="Enter ZIP code"
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="settings-section">
          <div className="section-header">
            <Phone size={20} />
            <h3>Contact Information</h3>
          </div>

          <div className="form-grid">
            <Input
              label="Contact Number"
              name="contact_number"
              icon={<Phone size={18} />}
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="09123456789"
            />

            <Input
              label="Email Address"
              name="email_address"
              type="email"
              icon={<Mail size={18} />}
              value={formData.email_address}
              onChange={handleChange}
              placeholder="barangay@example.com"
            />

            <Input
              label="Website (Optional)"
              name="barangay_website"
              value={formData.barangay_website}
              onChange={handleChange}
              placeholder="https://www.barangay.gov.ph"
            />
          </div>
        </div>

        {/* Officials Section */}
        <div className="settings-section">
          <div className="section-header">
            <Building2 size={20} />
            <h3>Barangay Officials</h3>
          </div>

          <div className="form-grid">
            {/* FIXED: Changed to barangay_chairman */}
            <Input
              label="Barangay Chairman"
              name="barangay_chairman"
              value={formData.barangay_chairman}
              onChange={handleChange}
              placeholder="Full name of barangay chairman"
            />

            <Input
              label="SK Chairman"
              name="sk_chairman"
              value={formData.sk_chairman}
              onChange={handleChange}
              placeholder="Full name of SK chairman"
            />

            {/* FIXED: Changed to barangay_kagawad_list */}
            <div className="form-group full-width">
              <label htmlFor="barangay_kagawad_list">
                Barangay Kagawads
                <span className="label-hint">(One per line)</span>
              </label>
              <textarea
                id="barangay_kagawad_list"
                name="barangay_kagawad_list"
                value={formData.barangay_kagawad_list}
                onChange={handleChange}
                placeholder="Enter kagawad names, one per line"
                rows="6"
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
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

export default BarangayInfoSettings;