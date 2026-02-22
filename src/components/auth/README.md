# Auth Components

This folder contains authentication-related components for the Barangay Document Issuance System.

## Available Components

### 1. ProtectedRoute
**File:** `ProtectedRoute.jsx`

**Purpose:** Protect routes from unauthorized access with role-based control

**Features:**
- Authentication check
- Role-based access control
- Loading state handling
- Inactive account detection
- Custom redirect paths
- User-friendly error pages

**Usage:**
```jsx
import { ProtectedRoute } from '../components/auth';

// Basic protection (any authenticated user)
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />

// Role-based protection (single role)
<Route path="/settings" element={
  <ProtectedRoute requiredRoles="admin">
    <SettingsPage />
  </ProtectedRoute>
} />

// Multiple roles allowed
<Route path="/documents" element={
  <ProtectedRoute requiredRoles={['admin', 'clerk']}>
    <DocumentsPage />
  </ProtectedRoute>
} />

// Custom redirect
<Route path="/sensitive" element={
  <ProtectedRoute redirectTo="/unauthorized">
    <SensitivePage />
  </ProtectedRoute>
} />
```

**Props:**
- `children` (ReactNode) - Components to render if authorized
- `requiredRoles` (string | string[]) - Required role(s) to access
- `redirectTo` (string) - Redirect path if unauthorized (default: '/login')

---

### 2. LoginForm
**File:** `LoginForm.jsx`

**Purpose:** User login form with validation

**Features:**
- Email/password authentication
- Form validation
- Show/hide password toggle
- Remember me functionality
- Error handling
- Loading states
- Default credentials display

**Usage:**
```jsx
import { LoginForm } from '../components/auth';

function LoginPage() {
  return (
    <div className="login-page">
      <LoginForm />
    </div>
  );
}
```

**Features:**
- Auto-fill remembered email
- Real-time validation
- Password visibility toggle
- Accessible form controls
- Responsive design

---

### 3. RoleGuard
**File:** `RoleGuard.jsx`

**Purpose:** Conditionally render UI based on user role

**Features:**
- Role-based conditional rendering
- Fallback content support
- Multiple role support
- Clean syntax

**Usage:**
```jsx
import { RoleGuard } from '../components/auth';

function Toolbar() {
  return (
    <div>
      {/* Show for admins only */}
      <RoleGuard roles="admin">
        <AdminButton />
      </RoleGuard>

      {/* Show for admins or clerks */}
      <RoleGuard roles={['admin', 'clerk']}>
        <ProcessButton />
      </RoleGuard>

      {/* With fallback */}
      <RoleGuard 
        roles="admin" 
        fallback={<ViewOnlyMessage />}
      >
        <EditButton />
      </RoleGuard>
    </div>
  );
}
```

**Props:**
- `children` (ReactNode) - Content to render if authorized
- `roles` (string | string[]) - Required role(s)
- `fallback` (ReactNode) - Content to render if not authorized

---

### 4. PermissionGuard
**File:** `PermissionGuard.jsx`

**Purpose:** More granular permission-based rendering

**Features:**
- Permission-based conditional rendering
- Works with permission system from AuthContext
- Fallback support

**Usage:**
```jsx
import { PermissionGuard } from '../components/auth';

function DocumentActions() {
  return (
    <div>
      <PermissionGuard permission="manage_residents">
        <AddResidentButton />
      </PermissionGuard>

      <PermissionGuard permission="process_documents">
        <ProcessDocumentButton />
      </PermissionGuard>

      <PermissionGuard 
        permission="view_audit_logs"
        fallback={<p>No access to logs</p>}
      >
        <ViewLogsButton />
      </PermissionGuard>
    </div>
  );
}
```

**Props:**
- `children` (ReactNode) - Content to render if authorized
- `permission` (string) - Required permission
- `fallback` (ReactNode) - Content to render if not authorized

**Available Permissions:**
- Admin: `manage_users`, `manage_settings`, `manage_templates`, `manage_residents`, `process_documents`, `view_audit_logs`, `export_data`
- Clerk: `process_documents`, `view_residents`, `view_requests`, `release_documents`
- Record Keeper: `manage_residents`, `generate_qr`, `view_requests`, `send_qr_codes`

---

### 5. AuthGuard
**File:** `AuthGuard.jsx`

**Purpose:** Simple authentication check without role verification

**Features:**
- Basic authentication check
- Loading state support
- Fallback content
- Simpler than ProtectedRoute

**Usage:**
```jsx
import { AuthGuard } from '../components/auth';

function MyComponent() {
  return (
    <AuthGuard
      fallback={<LoginPrompt />}
      showLoading={true}
    >
      <AuthenticatedContent />
    </AuthGuard>
  );
}

// Or inline
{user ? <UserMenu /> : <LoginButton />}

// Better with AuthGuard
<AuthGuard fallback={<LoginButton />}>
  <UserMenu />
</AuthGuard>
```

**Props:**
- `children` (ReactNode) - Content to render if authenticated
- `fallback` (ReactNode) - Content to render if not authenticated
- `showLoading` (boolean) - Show loading spinner while checking (default: true)

---

### 6. UserAvatar
**File:** `UserAvatar.jsx`

**Purpose:** Display user avatar with initials or image

**Features:**
- Auto-generated initials
- Color based on name
- Multiple sizes
- Image support
- Optional name display
- Role display

**Usage:**
```jsx
import { UserAvatar } from '../components/auth';

// Basic avatar
<UserAvatar user={user} />

// With size
<UserAvatar user={user} size="lg" />

// With name
<UserAvatar user={user} showName={true} />

// All options
<UserAvatar 
  user={user}
  size="xl"
  showName={true}
  className="custom-class"
/>
```

**Props:**
- `user` (Object) - User object with name/email
- `size` (string) - 'sm', 'md', 'lg', 'xl' (default: 'md')
- `showName` (boolean) - Show name next to avatar (default: false)
- `className` (string) - Additional CSS classes

**Sizes:**
- `sm` - 32px (for compact views)
- `md` - 40px (default, general use)
- `lg` - 56px (for headers)
- `xl` - 80px (for profile pages)

---

## Common Usage Patterns

### Complete Route Protection Setup
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected - any authenticated user */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        {/* Admin only */}
        <Route path="/users" element={
          <ProtectedRoute requiredRoles="admin">
            <UsersPage />
          </ProtectedRoute>
        } />
        
        {/* Admin or Clerk */}
        <Route path="/documents" element={
          <ProtectedRoute requiredRoles={['admin', 'clerk']}>
            <DocumentsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

### Conditional UI Rendering
```jsx
import { RoleGuard, PermissionGuard } from './components/auth';

function Toolbar() {
  return (
    <div className="toolbar">
      {/* Always visible */}
      <ViewButton />
      
      {/* Admin only */}
      <RoleGuard roles="admin">
        <DeleteButton />
        <SettingsButton />
      </RoleGuard>
      
      {/* Multiple roles */}
      <RoleGuard roles={['admin', 'clerk']}>
        <ProcessButton />
      </RoleGuard>
      
      {/* Permission-based */}
      <PermissionGuard permission="manage_residents">
        <AddResidentButton />
      </PermissionGuard>
    </div>
  );
}
```

### User Profile Display
```jsx
import { UserAvatar, AuthGuard } from './components/auth';

function Header() {
  const { user, logout } = useAuth();
  
  return (
    <header>
      <Logo />
      
      <AuthGuard fallback={<LoginButton />}>
        <div className="user-menu">
          <UserAvatar user={user} size="md" showName={true} />
          <button onClick={logout}>Logout</button>
        </div>
      </AuthGuard>
    </header>
  );
}
```

### Complex Authorization Logic
```jsx
import { RoleGuard, PermissionGuard } from './components/auth';

function DocumentCard({ document }) {
  return (
    <div className="card">
      <h3>{document.title}</h3>
      
      {/* Everyone can view */}
      <ViewButton />
      
      {/* Only if has edit permission */}
      <PermissionGuard permission="process_documents">
        <EditButton />
      </PermissionGuard>
      
      {/* Only admin can delete */}
      <RoleGuard roles="admin">
        <DeleteButton />
      </RoleGuard>
      
      {/* Conditional based on both role and document status */}
      {document.status === 'pending' && (
        <RoleGuard roles={['admin', 'clerk']}>
          <ApproveButton />
        </RoleGuard>
      )}
    </div>
  );
}
```

---

## File Organization

```
src/
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.jsx
│   │   ├── ProtectedRoute.css
│   │   ├── LoginForm.jsx
│   │   ├── LoginForm.css
│   │   ├── RoleGuard.jsx
│   │   ├── PermissionGuard.jsx
│   │   ├── AuthGuard.jsx
│   │   ├── UserAvatar.jsx
│   │   ├── UserAvatar.css
│   │   ├── index.js
│   │   └── README.md
│   └── common/
│       ├── LoadingSpinner.jsx
│       └── LoadingSpinner.css
```

---

## Best Practices

### 1. Use ProtectedRoute for Routes
```jsx
// ✅ Good - Protect entire route
<Route path="/admin" element={
  <ProtectedRoute requiredRoles="admin">
    <AdminPage />
  </ProtectedRoute>
} />

// ❌ Bad - Check inside component
<Route path="/admin" element={<AdminPage />} />
// Then check role inside AdminPage
```

### 2. Use Guards for Conditional UI
```jsx
// ✅ Good - Guard for UI elements
<RoleGuard roles="admin">
  <DeleteButton />
</RoleGuard>

// ❌ Bad - Manual check
{user?.role === 'admin' && <DeleteButton />}
```

### 3. Combine Guards When Needed
```jsx
// ✅ Good - Nested guards
<AuthGuard>
  <RoleGuard roles="admin">
    <PermissionGuard permission="manage_users">
      <UserManagement />
    </PermissionGuard>
  </RoleGuard>
</AuthGuard>

// Or use ProtectedRoute which handles all checks
<ProtectedRoute requiredRoles="admin">
  <UserManagement />
</ProtectedRoute>
```

### 4. Provide Fallbacks for Better UX
```jsx
// ✅ Good - With fallback
<RoleGuard 
  roles="admin" 
  fallback={<p>Admin access required</p>}
>
  <AdminPanel />
</RoleGuard>

// ❌ Bad - No feedback
<RoleGuard roles="admin">
  <AdminPanel />
</RoleGuard>
```

---

## Styling

All auth components use CSS variables from your theme:
- `--primary-600` - Primary brand color
- `--surface` - Card/surface background
- `--text-primary` - Primary text color
- `--border` - Border color
- etc.

To customize, override these variables or add custom classes.

---

## Accessibility

All components follow accessibility best practices:
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Screen reader friendly

---

## Testing

```jsx
import { render, screen } from '@testing-library/react';
import { ProtectedRoute, RoleGuard } from './components/auth';

test('redirects when not authenticated', () => {
  render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
  // Assert redirect to login
});

test('shows content for correct role', () => {
  render(
    <RoleGuard roles="admin">
      <div>Admin Content</div>
    </RoleGuard>
  );
  // Assert content visible
});
```

---

All components are production-ready with proper error handling, loading states, and user feedback! 🎉