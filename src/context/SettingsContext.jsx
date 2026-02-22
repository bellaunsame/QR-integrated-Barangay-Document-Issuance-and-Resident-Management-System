import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

const SettingsContext = createContext({});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const CACHE_DURATION = 5 * 60 * 1000;

  // 1. Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // 2. ---> NEW: THE THEME SYNC ENGINE <---
  useEffect(() => {
    // Check if the theme setting exists, default to 'system' if not
    const currentTheme = settings['theme'] || settings['theme_mode'] || 'system';

    const applyTheme = (isDark) => {
      // Standard approach: toggles both class and data-attribute to support most CSS setups
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    if (currentTheme === 'system') {
      // Check the computer's OS preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Apply it immediately
      applyTheme(mediaQuery.matches);

      // Listen for OS changes in real-time (if user toggles Dark Mode while app is open)
      const handleChange = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Force light or dark mode based on direct selection
      applyTheme(currentTheme === 'dark');
    }
  }, [settings]); // Re-run this check whenever settings change!

  const loadSettings = async (forceRefresh = false) => {
    if (!forceRefresh && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await db.settings.getAll();
      const settingsObj = {};
      
      data.forEach(setting => {
        let value = setting.setting_value;
        if (setting.setting_type === 'boolean') {
          value = value === 'true' || value === true;
        } else if (setting.setting_type === 'number') {
          value = parseFloat(value) || 0;
        }
        settingsObj[setting.setting_key] = value;
      });

      setSettings(settingsObj);
      setLastFetched(Date.now());
      setInitialized(true);

      localStorage.setItem('barangay_settings', JSON.stringify(settingsObj));
      localStorage.setItem('settings_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error loading settings:', error);
      try {
        const cachedSettings = localStorage.getItem('barangay_settings');
        if (cachedSettings) {
          setSettings(JSON.parse(cachedSettings));
          toast('Using cached settings (offline mode)', { icon: '📡' });
        }
      } catch (cacheError) {
        console.error('Error loading cached settings:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSetting = useCallback((key, defaultValue = '') => {
    const value = settings[key];
    return value !== undefined && value !== null ? value : defaultValue;
  }, [settings]);

  const getSettings = useCallback((keys) => {
    const result = {};
    keys.forEach(key => {
      result[key] = settings[key];
    });
    return result;
  }, [settings]);

  const updateSetting = async (key, value, userId) => {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid setting key');
      }

      const stringValue = String(value);

      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { 
            setting_key: key, 
            setting_value: stringValue,
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'setting_key' } 
        );

      if (error) throw error;
      
      setSettings(prev => ({ ...prev, [key]: value }));
      const updatedSettings = { ...settings, [key]: value };
      localStorage.setItem('barangay_settings', JSON.stringify(updatedSettings));
      
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const updateSettings = async (settingsToUpdate, userId) => {
    try {
      const updates = Object.entries(settingsToUpdate).map(([key, value]) =>
        updateSetting(key, value, userId)
      );

      await Promise.all(updates);
      toast.success('Settings updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update some settings');
      throw error;
    }
  };

  const refreshSettings = useCallback(async () => {
    await loadSettings(true);
  }, []);

  const resetSettings = async (userId) => {
    if (!window.confirm('Are you sure you want to reset all settings to default values?')) {
      return false;
    }

    try {
      const defaultSettings = {
        barangay_name: 'Barangay Sample',
        barangay_logo_url: '',
        city_municipality: 'Sample City',
        province: 'Sample Province',
        contact_number: '123-4567',
        email_address: 'barangay@sample.local',
        enable_email_qr: 'true',
        documents_per_day_limit: '100',
        qr_expiry_days: '365',
        theme_mode: 'system' // Resetting theme to system default
      };

      await updateSettings(defaultSettings, userId);
      toast.success('Settings reset to default values');
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
      return false;
    }
  };

  const isFeatureEnabled = useCallback((featureName) => {
    return getSetting(featureName, false) === true || getSetting(featureName, false) === 'true';
  }, [getSetting]);

  const getBarangayInfo = useCallback(() => {
    return {
      name: getSetting('barangay_name', 'Barangay'),
      logoUrl: getSetting('barangay_logo_url', ''),
      cityMunicipality: getSetting('city_municipality', ''),
      province: getSetting('province', ''),
      contactNumber: getSetting('contact_number', ''),
      emailAddress: getSetting('email_address', ''),
      fullAddress: `${getSetting('barangay_name', 'Barangay')}, ${getSetting('city_municipality', '')}, ${getSetting('province', '')}`
    };
  }, [getSetting]);

  const validateSetting = (key, value) => {
    const validators = {
      email_address: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      contact_number: (val) => val.length >= 7,
      documents_per_day_limit: (val) => !isNaN(val) && parseInt(val) > 0,
      qr_expiry_days: (val) => !isNaN(val) && parseInt(val) > 0
    };
    if (validators[key]) return validators[key](value);
    return true; 
  };

  const value = {
    settings,
    loading,
    initialized,
    getSetting,
    getSettings,
    updateSetting,
    updateSettings,
    refreshSettings,
    resetSettings,
    isFeatureEnabled,
    getBarangayInfo,
    validateSetting
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;