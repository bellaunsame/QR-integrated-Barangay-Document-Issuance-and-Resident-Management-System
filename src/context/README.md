# Context Folder

This folder contains all React Context providers for managing global application state.

## Available Contexts

### 1. AuthContext
**File:** `AuthContext.jsx`

**Purpose:** Manages user authentication and authorization

**Features:**
- User login/logout
- Session management
- Role-based access control
- Permission checking
- Audit logging for auth events
- User profile updates

**Usage:**
```jsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, login, logout, hasRole, hasPermission } = useAuth();
  
  if (!user) return <div>Please login</div>;
  
  return (
    <div>
      <h1>Welcome, {user.full_name}</h1>
      {hasRole('admin') && <AdminPanel />}
      {hasPermission('manage_residents') && <ResidentManager />}
    </div>
  );
}
```

**Available Methods:**
- `login(email, password)` - Login user
- `logout()` - Logout user
- `updateProfile(updates)` - Update user profile
- `hasRole(roles)` - Check if user has role(s)
- `hasPermission(permission)` - Check if user has permission
- `refreshUser()` - Refresh user data from database

---

### 2. SettingsContext
**File:** `SettingsContext.jsx`

**Purpose:** Manages system-wide settings and configuration

**Features:**
- Load/save system settings
- Settings caching (5-minute cache)
- Offline support with localStorage
- Setting validation
- Barangay information management
- Feature toggles

**Usage:**
```jsx
import { useSettings } from '../context/SettingsContext';

function MyComponent() {
  const { 
    getSetting, 
    updateSetting, 
    getBarangayInfo,
    isFeatureEnabled 
  } = useSettings();
  
  const barangayName = getSetting('barangay_name', 'Barangay');
  const barangayInfo = getBarangayInfo();
  const emailEnabled = isFeatureEnabled('enable_email_qr');
  
  return (
    <div>
      <h1>{barangayName}</h1>
      <p>{barangayInfo.fullAddress}</p>
    </div>
  );
}
```

**Available Methods:**
- `getSetting(key, defaultValue)` - Get a setting value
- `getSettings(keys)` - Get multiple settings
- `updateSetting(key, value, userId)` - Update a setting
- `updateSettings(settingsObj, userId)` - Update multiple settings
- `refreshSettings()` - Refresh from database
- `resetSettings(userId)` - Reset to defaults
- `isFeatureEnabled(featureName)` - Check if feature is enabled
- `getBarangayInfo()` - Get barangay information object
- `validateSetting(key, value)` - Validate a setting value

---

### 3. NotificationContext
**File:** `NotificationContext.jsx`

**Purpose:** Manages toast notifications and alerts

**Features:**
- Success/error/warning/info notifications
- Loading notifications
- Promise-based notifications
- Notification history
- Confirmation dialogs

**Usage:**
```jsx
import { useNotification } from '../context/NotificationContext';

function MyComponent() {
  const { success, error, warning, info, promise, confirm } = useNotification();
  
  const handleSave = async () => {
    const result = await promise(
      saveData(),
      {
        loading: 'Saving...',
        success: 'Saved successfully!',
        error: 'Failed to save'
      }
    );
  };
  
  const handleDelete = () => {
    confirm(
      'Are you sure?',
      () => deleteItem(),
      () => console.log('Cancelled')
    );
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

**Available Methods:**
- `success(message, options)` - Show success toast
- `error(message, options)` - Show error toast
- `warning(message, options)` - Show warning toast
- `info(message, options)` - Show info toast
- `loading(message)` - Show loading toast
- `dismiss(toastId)` - Dismiss specific toast
- `dismissAll()` - Dismiss all toasts
- `promise(promiseFn, messages)` - Promise-based notification
- `confirm(message, onConfirm, onCancel)` - Show confirmation
- `clearHistory()` - Clear notification history
- `getHistory()` - Get notification history

---

### 4. ThemeContext
**File:** `ThemeContext.jsx`

**Purpose:** Manages UI theme and appearance settings

**Features:**
- Light/dark mode
- Font size adjustment
- Compact mode
- Theme persistence in localStorage
- Dynamic color access

**Usage:**
```jsx
import { useTheme } from '../context/ThemeContext';

function MyComponent() {
  const { 
    theme, 
    toggleTheme, 
    fontSize, 
    changeFontSize,
    isDark 
  } = useTheme();
  
  return (
    <div>
      <button onClick={toggleTheme}>
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </button>
      <select 
        value={fontSize} 
        onChange={(e) => changeFontSize(e.target.value)}
      >
        <option value="small">Small</option>
        <option value="normal">Normal</option>
        <option value="large">Large</option>
      </select>
    </div>
  );
}
```

**Available Methods:**
- `toggleTheme()` - Toggle between light/dark
- `setThemeMode(mode)` - Set specific theme ('light' or 'dark')
- `changeFontSize(size)` - Change font size ('small', 'normal', 'large')
- `toggleCompactMode()` - Toggle compact mode
- `resetTheme()` - Reset to defaults
- `getColors()` - Get current theme colors

---

### 5. DataContext
**File:** `DataContext.jsx`

**Purpose:** Manages application data with caching

**Features:**
- Data fetching and caching (2-minute cache)
- CRUD operations for residents, templates, requests
- Data search and filtering
- Statistics calculation
- Cache invalidation

**Usage:**
```jsx
import { useData } from '../context/DataContext';

function MyComponent() {
  const { 
    residents, 
    fetchResidents, 
    searchResidents,
    getStatistics,
    loading 
  } = useData();
  
  useEffect(() => {
    fetchResidents();
  }, []);
  
  const stats = getStatistics();
  const results = searchResidents('John');
  
  if (loading.residents) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Total Residents: {stats.totalResidents}</p>
      {/* ... */}
    </div>
  );
}
```

**Available Methods:**
- `fetchResidents(forceRefresh)` - Fetch all residents
- `fetchTemplates(forceRefresh)` - Fetch all templates
- `fetchRequests(forceRefresh)` - Fetch all requests
- `fetchUsers(forceRefresh)` - Fetch all users
- `addResident(data)` - Create new resident
- `updateResident(id, updates)` - Update resident
- `deleteResident(id)` - Delete resident
- `addTemplate(data)` - Create new template
- `updateTemplate(id, updates)` - Update template
- `deleteTemplate(id)` - Delete template
- `addRequest(data)` - Create new request
- `updateRequest(id, updates)` - Update request
- `getResidentById(id)` - Get resident from cache
- `getTemplateById(id)` - Get template from cache
- `getRequestById(id)` - Get request from cache
- `searchResidents(term)` - Search residents
- `getRequestsByStatus(status)` - Filter requests
- `getStatistics()` - Get app statistics
- `clearCache()` - Clear all cached data
- `refreshAll()` - Refresh all data

---

## Setting Up Contexts

### In App.jsx:
```jsx
import { 
  AuthProvider, 
  SettingsProvider, 
  NotificationProvider,
  ThemeProvider,
  DataProvider 
} from './context';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <SettingsProvider>
            <DataProvider>
              {/* Your app content */}
            </DataProvider>
          </SettingsProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
```

### Provider Order Matters:
1. **ThemeProvider** - First, so theme is available to all
2. **NotificationProvider** - Second, for notifications throughout
3. **AuthProvider** - Third, for authentication
4. **SettingsProvider** - Fourth, may need auth
5. **DataProvider** - Last, may need auth and settings

---

## Best Practices

### 1. Always use the hooks
```jsx
// ✅ Good
const { user } = useAuth();

// ❌ Bad
const user = AuthContext._currentValue;
```

### 2. Handle loading states
```jsx
const { user, loading } = useAuth();

if (loading) return <LoadingSpinner />;
if (!user) return <LoginPage />;

return <DashboardPage />;
```

### 3. Use cache wisely
```jsx
// Use cached data by default
const { residents, fetchResidents } = useData();

// Force refresh when needed
const handleRefresh = () => {
  fetchResidents(true);
};
```

### 4. Combine contexts when needed
```jsx
function MyComponent() {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const { success } = useNotification();
  
  const handleAction = async () => {
    // Use multiple contexts together
    if (user.role === 'admin') {
      const limit = getSetting('documents_per_day_limit', 100);
      success(`Limit set to ${limit}`);
    }
  };
}
```

### 5. Error handling
```jsx
const { login } = useAuth();

const handleLogin = async () => {
  try {
    await login(email, password);
  } catch (error) {
    // Error already shown via toast in context
    console.error('Login failed:', error);
  }
};
```

---

## Performance Tips

1. **Use selective imports** - Only import what you need
2. **Avoid unnecessary re-renders** - Use useCallback and useMemo
3. **Leverage caching** - Don't fetch data unnecessarily
4. **Clear cache when appropriate** - After major updates
5. **Use loading states** - Show feedback to users

---

## Troubleshooting

### Context not found error
**Problem:** `useAuth must be used within AuthProvider`
**Solution:** Make sure component is inside the provider in App.jsx

### Stale data
**Problem:** Data not updating after changes
**Solution:** Use `forceRefresh` parameter or call `refreshAll()`

### Performance issues
**Problem:** Too many re-renders
**Solution:** Check if you're updating state unnecessarily, use React DevTools to profile

---

## File Structure

```
src/
├── context/
│   ├── AuthContext.jsx
│   ├── SettingsContext.jsx
│   ├── NotificationContext.jsx
│   ├── ThemeContext.jsx
│   ├── DataContext.jsx
│   ├── index.js (exports all contexts)
│   └── README.md (this file)
```

---

## Additional Resources

- [React Context Documentation](https://react.dev/reference/react/useContext)
- [Context Best Practices](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [Performance Optimization](https://react.dev/reference/react/memo)