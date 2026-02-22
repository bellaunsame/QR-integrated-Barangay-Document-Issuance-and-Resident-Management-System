# Settings Components

This folder contains settings-related components for configuring the Barangay Document Issuance System.

## Available Components

### 1. BarangayInfoSettings
**File:** `BarangayInfoSettings.jsx`

**Purpose:** Manage barangay information and contact details

**Features:**
- Basic information (name, city, province, region, ZIP)
- Contact information (phone, email, website)
- Barangay officials (captain, SK chairman, kagawads)
- Form validation
- Save/Reset functionality

**Usage:**
```jsx
import { BarangayInfoSettings } from '../components/settings';

<BarangayInfoSettings />
```

**Fields:**
- **Basic Info:** Barangay name, city/municipality, province, region, ZIP code
- **Contact:** Phone number, email address, website
- **Officials:** Captain name, SK chairman, kagawad names (one per line)

---

### 2. SystemSettings
**File:** `SystemSettings.jsx`

**Purpose:** Configure system-wide settings and features

**Features:**
- Feature toggles (email notifications, QR email, auto backup)
- Document settings (limits, processing time, fees)
- Session management
- Modern toggle switches

**Usage:**
```jsx
import { SystemSettings } from '../components/settings';

<SystemSettings />
```

**Settings:**
- **Email Notifications:** Send updates to residents
- **QR Code Email:** Auto-send QR codes after registration
- **Require Approval:** Admin approval before processing
- **Auto Backup:** Daily database backups
- **Daily Document Limit:** Max requests per day per resident
- **Processing Time:** Average days to process
- **Default Fee:** Document fee amount
- **Session Timeout:** Auto-logout timer

---

### 3. AppearanceSettings
**File:** `AppearanceSettings.jsx`

**Purpose:** Configure theme and appearance

**Features:**
- Theme mode selection (Light, Dark, System)
- Color scheme picker (6 colors)
- Live preview
- Instant theme switching

**Usage:**
```jsx
import { AppearanceSettings } from '../components/settings';

<AppearanceSettings />
```

**Options:**
- **Themes:** Light, Dark, System
- **Colors:** Blue, Green, Purple, Orange, Red, Indigo
- **Preview:** Real-time interface preview

---

## Complete Usage Example

### Settings Page with Tabs

```jsx
import { useState } from 'react';
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Card } from '../components/common';
import {
  BarangayInfoSettings,
  SystemSettings,
  AppearanceSettings
} from '../components/settings';
import { Building2, Settings, Palette } from 'lucide-react';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('barangay');

  const tabs = [
    { id: 'barangay', label: 'Barangay Info', icon: Building2 },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure system settings and preferences"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Settings' }]} />}
      />

      <div className="settings-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="settings-content">
        {activeTab === 'barangay' && <BarangayInfoSettings />}
        {activeTab === 'system' && <SystemSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
      </div>
    </>
  );
}
```

---

## File Organization

```
src/
├── components/
│   └── settings/
│       ├── BarangayInfoSettings.jsx + .css
│       ├── SystemSettings.jsx + .css
│       ├── AppearanceSettings.jsx + .css
│       ├── index.js
│       └── README.md
```

---

## Component Features

### BarangayInfoSettings

#### Form Sections:
```
┌─────────────────────────────────┐
│  🏛️ Basic Information          │
│  • Barangay Name                │
│  • City/Municipality            │
│  • Province                     │
│  • Region                       │
│  • ZIP Code                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📞 Contact Information         │
│  • Phone Number                 │
│  • Email Address                │
│  • Website (Optional)           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  👥 Barangay Officials          │
│  • Captain Name                 │
│  • SK Chairman                  │
│  • Kagawad Names (multi-line)   │
└─────────────────────────────────┘
```

---

### SystemSettings

#### Toggle Features:
```
┌─────────────────────────────────┐
│  📧 Email Notifications    [ON] │
│  Send email for updates         │
│                                 │
│  📧 QR Code Email          [ON] │
│  Auto-email QR codes            │
│                                 │
│  ✅ Require Approval       [ON] │
│  Admin approval required        │
│                                 │
│  ⏰ Auto Backup           [OFF] │
│  Daily database backup          │
└─────────────────────────────────┘
```

#### Document Settings:
```
┌─────────────────────────────────┐
│  Daily Limit:        100        │
│  Processing Time:    3 days     │
│  Default Fee:        ₱ 0.00     │
│  Session Timeout:    60 min     │
└─────────────────────────────────┘
```

---

### AppearanceSettings

#### Theme Selection:
```
┌─────────┬─────────┬─────────┐
│   ☀️    │    🌙   │    💻   │
│  Light  │   Dark  │ System  │
│  Clean  │   Easy  │  Match  │
│ bright  │ on eyes │ system  │
└─────────┴─────────┴─────────┘
```

#### Color Scheme:
```
┌──────┬──────┬──────┐
│ 🔵   │ 🟢   │ 🟣   │
│ Blue │Green │Purple│
└──────┴──────┴──────┘
┌──────┬──────┬──────┐
│ 🟠   │ 🔴   │ 🔵   │
│Orange│ Red  │Indigo│
└──────┴──────┴──────┘
```

#### Live Preview:
```
┌─────────────────────────┐
│ ●●●                     │
│ ─────────────────────── │
│ ▌  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ ▌  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ ▌  ▬▬▬▬▬▬▬            │
└─────────────────────────┘
```

---

## Integration with Context

### SettingsContext
```jsx
import { useSettings } from '../../context/SettingsContext';

const { settings, updateSettings } = useSettings();

// Update settings
await updateSettings({
  barangay_name: 'Barangay Sample',
  enable_email_notifications: true
});
```

### ThemeContext
```jsx
import { useTheme } from '../../context/ThemeContext';

const { theme, setTheme, colorScheme, setColorScheme } = useTheme();

// Change theme
setTheme('dark');

// Change color
setColorScheme('green');
```

---

## Styling

All components use consistent styling:

### CSS Variables:
```css
--primary-600      /* Primary color */
--surface          /* Card background */
--border           /* Border color */
--text-primary     /* Main text */
--neutral-25       /* Light background */
```

### Responsive Breakpoints:
```css
@media (max-width: 768px) {
  /* Mobile styles */
}
```

---

## Best Practices

### 1. Use in Settings Page
```jsx
// ✅ Good - Combined in settings page
<SettingsPage>
  <BarangayInfoSettings />
  <SystemSettings />
  <AppearanceSettings />
</SettingsPage>

// ❌ Bad - Separate pages
<Route path="/barangay-settings" element={<BarangayInfoSettings />} />
<Route path="/system-settings" element={<SystemSettings />} />
```

### 2. Handle Loading States
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    await updateSettings(formData);
    toast.success('Settings saved');
  } catch (error) {
    toast.error('Failed to save settings');
  } finally {
    setLoading(false);
  }
};
```

### 3. Validate Before Save
```jsx
if (!formData.barangay_name) {
  setError('Barangay name is required');
  return;
}

if (!formData.contact_number.match(/^09\d{9}$/)) {
  setError('Invalid phone number format');
  return;
}
```

### 4. Provide Reset Functionality
```jsx
const handleReset = () => {
  setFormData(settings); // Reset to saved settings
};
```

---

## Customization

### Add New Setting Field:

**In BarangayInfoSettings.jsx:**
```jsx
<Input
  label="Secretary Name"
  name="secretary_name"
  value={formData.secretary_name}
  onChange={handleChange}
  placeholder="Enter secretary name"
/>
```

### Add New Toggle:

**In SystemSettings.jsx:**
```jsx
<div className="toggle-item">
  <div className="toggle-info">
    <div className="toggle-icon">
      <Bell size={20} />
    </div>
    <div className="toggle-text">
      <h4>SMS Notifications</h4>
      <p>Send SMS alerts for important updates</p>
    </div>
  </div>
  <label className="toggle-switch">
    <input
      type="checkbox"
      name="enable_sms"
      checked={formData.enable_sms}
      onChange={handleChange}
    />
    <span className="toggle-slider">
      {formData.enable_sms ? <ToggleRight /> : <ToggleLeft />}
    </span>
  </label>
</div>
```

### Add New Color Scheme:

**In AppearanceSettings.jsx:**
```jsx
{ 
  value: 'pink', 
  label: 'Pink', 
  color: '#ec4899', 
  description: 'Fun and playful' 
}
```

---

## Accessibility

All components follow accessibility guidelines:
- Proper label associations
- Keyboard navigation
- ARIA attributes
- Focus management
- Screen reader friendly

---

## Testing

```jsx
// Test barangay info save
test('saves barangay information', async () => {
  const { getByLabelText, getByText } = render(<BarangayInfoSettings />);
  
  fireEvent.change(getByLabelText('Barangay Name'), {
    target: { value: 'Barangay Test' }
  });
  
  fireEvent.click(getByText('Save Changes'));
  
  await waitFor(() => {
    expect(updateSettings).toHaveBeenCalled();
  });
});

// Test theme switching
test('changes theme', () => {
  const { getByText } = render(<AppearanceSettings />);
  
  fireEvent.click(getByText('Dark'));
  
  expect(setTheme).toHaveBeenCalledWith('dark');
});
```

---

All settings components are production-ready with validation, error handling, and beautiful UI! ⚙️✨