import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../services/supabaseClient'; 
import { Save, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const BarangayInfoSettings = () => {
  const { settings, refreshSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  
  // Main form state
  const [formData, setFormData] = useState({
    barangay_name: '',
    city_municipality: '',
    province: '',
    contact_number: '',
    email_address: '',
    barangay_chairman: '',
    sk_chairman: '',
    barangay_kagawads: ''
  });

  // State specifically for the 7 Kagawad boxes
  const [kagawadList, setKagawadList] = useState(Array(7).fill(''));

  // Load existing settings into the form
  useEffect(() => {
    if (settings) {
      // Helper function to safely extract values from settings array or object
      const getSet = (key, fallback = '') => {
        if (Array.isArray(settings)) {
          const found = settings.find(s => s.setting_key === key);
          return found && found.setting_value ? found.setting_value : fallback;
        }
        return settings[key] || fallback;
      };

      setFormData({
        barangay_name: getSet('barangay_name'),
        city_municipality: getSet('city_municipality'),
        province: getSet('province'),
        contact_number: getSet('contact_number'),
        email_address: getSet('email_address'),
        barangay_chairman: getSet('barangay_chairman'),
        sk_chairman: getSet('sk_chairman'),
        barangay_kagawads: getSet('barangay_kagawads')
      });

      // Parse the saved kagawads into exactly 7 slots
      const initialKagawads = getSet('barangay_kagawads', '');
      const parsed = initialKagawads.split('\n').filter(name => name.trim() !== '');
      
      const fixedList = Array(7).fill('');
      for (let i = 0; i < 7; i++) {
        if (parsed[i]) fixedList[i] = parsed[i];
      }
      setKagawadList(fixedList);
    }
  }, [settings]);

  // Handle standard text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle specific Kagawad input changes
  const handleKagawadChange = (index, value) => {
    const newList = [...kagawadList];
    newList[index] = value;
    setKagawadList(newList);
    // Combine the 7 boxes into a single string with line breaks for the database
    setFormData(prev => ({ ...prev, barangay_kagawads: newList.join('\n') }));
  };

  // Save changes to the database
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Loop through all form data and update the settings table directly using Supabase
      const updates = Object.keys(formData).map(key => {
        return supabase
          .from('system_settings') // FIXED: Now points to the correct table name!
          .upsert(
            { setting_key: key, setting_value: String(formData[key]) }, 
            { onConflict: 'setting_key' } 
          );
      });
      
      const results = await Promise.all(updates);

      // Check if any of the updates threw an error
      for (const res of results) {
        if (res.error) throw res.error;
      }
      
      await refreshSettings();
      toast.success('Barangay Information updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings. Check console for details.');
      console.error("Settings Update Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      
      {/* SECTION 1: General Location Info */}
      <div className="settings-section">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary-700)' }}>
          <Building2 size={20} /> General Information
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div className="form-group">
            <label>Barangay Name</label>
            <input
              type="text"
              name="barangay_name"
              value={formData.barangay_name}
              onChange={handleChange}
              placeholder="e.g. Barangay Dos"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>City / Municipality</label>
            <input
              type="text"
              name="city_municipality"
              value={formData.city_municipality}
              onChange={handleChange}
              placeholder="e.g. Cabuyao City"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Province</label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleChange}
              placeholder="e.g. Laguna"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="e.g. (049) 123-4567"
              className="form-control"
            />
          </div>
        </div>
      </div>

      <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />

      {/* SECTION 2: Barangay Officials */}
      <div className="settings-section">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary-700)' }}>
          <Users size={20} /> Barangay Officials
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="form-group">
            <label>Barangay Chairman (Punong Barangay)</label>
            <input
              type="text"
              name="barangay_chairman"
              value={formData.barangay_chairman}
              onChange={handleChange}
              placeholder="Full name of barangay chairman"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>SK Chairman</label>
            <input
              type="text"
              name="sk_chairman"
              value={formData.sk_chairman}
              onChange={handleChange}
              placeholder="Full name of SK chairman"
              className="form-control"
            />
          </div>
        </div>

        {/* The 7 Fixed Kagawad Input Boxes */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: 'bold' }}>
            Barangay Kagawads (7 Members)
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', background: 'var(--neutral-50)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {kagawadList.map((kagawad, index) => {
              const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
              
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)', minWidth: '90px' }}>
                    {ordinals[index]} Kagawad:
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Enter ${ordinals[index]} Kagawad name...`}
                    value={kagawad}
                    onChange={(e) => handleKagawadChange(index, e.target.value)}
                    style={{ flex: 1, margin: 0 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>
          {loading ? <div className="spinner-small"></div> : <Save size={18} style={{ marginRight: '8px' }} />}
          {loading ? 'Saving...' : 'Save Barangay Info'}
        </button>
      </div>
    </form>
  );
};

export default BarangayInfoSettings;