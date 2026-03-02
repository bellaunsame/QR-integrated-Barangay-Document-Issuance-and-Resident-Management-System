import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { PageHeader, Breadcrumbs } from '../components/layout';
import { 
  BarangayInfoSettings, 
  SystemSettings 
} from '../components/settings';
import { Building2, Settings, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import './SettingsPage.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('barangay');

  const tabs = [
    { id: 'barangay', label: 'Barangay Info', icon: Building2 },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: ShieldCheck } 
  ];

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings"
        description="Configure system settings, and manage active sessions"
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
          <div className="tab-pane fade-in">
            {/* Removed the broken SessionManagement component. 
                Using a placeholder until you build the security module. */}
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
               <ShieldCheck size={48} style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }} />
               <h3>Security & Sessions</h3>
               <p>This module is currently under construction.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;