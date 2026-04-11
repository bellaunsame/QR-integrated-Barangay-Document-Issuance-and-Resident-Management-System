import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../services/supabaseClient';
import { PageHeader, Breadcrumbs } from '../components/layout';
import { 
  BarangayInfoSettings, 
  SystemSettings 
} from '../components/settings';
import { Building2, Settings, ShieldCheck, Lock, Save, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import './SettingsPage.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('barangay');

  // ==========================================
  // INTERNAL COMPONENT: SECURITY SETTINGS
  // ==========================================
  const SecuritySettings = () => {
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    
    // Safety check: Only 'admin' role can modify the gateway code
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
      if (isAdmin) fetchCurrentCode();
    }, [isAdmin]);

    const fetchCurrentCode = async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from('system_configs')
          .select('value')
          .eq('key', 'staff_access_code')
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
        if (data) setAccessCode(data.value);
      } catch (err) {
        console.error("Error fetching access code:", err);
        toast.error("Could not load current access code.");
      } finally {
        setFetching(false);
      }
    };

    const handleUpdateCode = async (e) => {
      e.preventDefault();
      
      // Basic Validation
      if (!accessCode || accessCode.trim().length < 4) {
        return toast.error("Access code must be at least 4 characters.");
      }
      
      setLoading(true);
      try {
        const { error } = await supabase
          .from('system_configs')
          .upsert({ 
            key: 'staff_access_code', 
            value: accessCode.trim(), 
            updated_at: new Date() 
          });

        if (error) throw error;
        toast.success("Staff Access Code updated! The landing page is now secured with this new PIN.");
      } catch (err) {
        console.error("Update error:", err);
        toast.error("Failed to update access code. Check database permissions.");
      } finally {
        setLoading(false);
      }
    };

    // UI for Non-Admins
    if (!isAdmin) {
      return (
        <div className="tab-pane fade-in">
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid #fee2e2' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
            <h3 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Access Restricted</h3>
            <p style={{ color: '#b91c1c', maxWidth: '400px', margin: '0 auto' }}>
              Only System Administrators have permission to modify staff gateway security protocols and access codes.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="tab-pane fade-in">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--text-primary)' }}>
              <Lock size={22} color="var(--primary-600)" /> Staff Gateway Security
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.5' }}>
              This code acts as a gatekeeper on the Landing Page. Only users who know this PIN can proceed to the Official Staff login portal.
            </p>
          </div>

          {fetching ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} color="var(--primary-600)" />
              <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Loading security config...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdateCode}>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  Current Staff Access Code
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={accessCode} 
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter new PIN (e.g. 1234)"
                    style={{ 
                      fontSize: '1.5rem', 
                      letterSpacing: '4px', 
                      fontWeight: '800', 
                      textAlign: 'center', 
                      padding: '15px', 
                      borderRadius: '10px',
                      border: '2px solid var(--primary-100)',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-900)'
                    }}
                  />
                </div>
                <div style={{ marginTop: '15px', padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <small style={{ color: '#92400e', lineHeight: '1.4' }}>
                    <strong>Warning:</strong> Changing this will immediately lock out any staff who do not know the new code. Ensure you communicate the new PIN to your team.
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={fetchCurrentCode} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <RefreshCw size={18} /> Reset
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading} 
                  style={{ flex: 2, justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                  Save Security Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'barangay', label: 'Barangay Info', icon: Building2 },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: ShieldCheck } 
  ];

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings"
        description="Configure system parameters and manage gateway security"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Settings' }]} />}
      />

      {/* Tab Navigation */}
      <div className="settings-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Area */}
      <div className="settings-content">
        {activeTab === 'barangay' && (
          <div className="tab-pane fade-in">
            <BarangayInfoSettings />
          </div>
        )}

        {activeTab === 'system' && (
          <div className="tab-pane fade-in">
            <SystemSettings />
          </div>
        )}

        {activeTab === 'security' && (
          <SecuritySettings />
        )}
      </div>
    </div>
  );
};

// Simple helper icon not imported from lucide
const AlertCircle = ({ size, color, style }) => (
  <svg 
    style={style} 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default SettingsPage;