# Layout Components

This folder contains layout components that provide the structure for the Barangay Document Issuance System.

## Available Components

### 1. MainLayout
**File:** `MainLayout.jsx`

**Purpose:** Main application layout wrapper with sidebar and navbar

**Features:**
- Responsive sidebar
- Collapsible sidebar (desktop)
- Mobile-friendly with overlay
- Sticky navbar
- Content area with max-width

**Usage:**
```jsx
import { MainLayout } from '../components/layout';

// In your route configuration
<Route element={<MainLayout />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/residents" element={<ResidentsPage />} />
  {/* ... other routes */}
</Route>

// Or wrap children directly
<MainLayout>
  <YourPageContent />
</MainLayout>
```

---

### 2. Navbar
**File:** `Navbar.jsx`

**Purpose:** Top navigation bar with search, notifications, and user menu

**Features:**
- Search bar
- Notifications dropdown
- User menu with profile/settings/logout
- Hamburger menu for mobile
- Sticky positioning

**Components:**
- Search input
- Notification bell with badge
- User avatar and dropdown
- Mobile menu toggle

**Usage:**
```jsx
import { Navbar } from '../components/layout';

<Navbar onMenuClick={toggleSidebar} />
```

---

### 3. Sidebar
**File:** `Sidebar.jsx`

**Purpose:** Navigation sidebar with menu items

**Features:**
- Role-based menu items
- Active route highlighting
- Collapsible (desktop)
- Mobile drawer
- User info at bottom
- Icons from lucide-react

**Menu Items:**
- Dashboard (all roles)
- Residents (admin, record_keeper)
- Documents (all roles)
- Templates (admin)
- Users (admin)
- QR Scanner (clerk)
- Settings (admin)

**Usage:**
```jsx
import { Sidebar } from '../components/layout';

<Sidebar
  isOpen={sidebarOpen}
  isCollapsed={sidebarCollapsed}
  onClose={() => setSidebarOpen(false)}
  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
/>
```

---

### 4. PageHeader
**File:** `PageHeader.jsx`

**Purpose:** Consistent page header with title, description, and actions

**Props:**
- `title` (string) - Page title
- `description` (string) - Page description
- `actions` (ReactNode) - Action buttons
- `breadcrumbs` (ReactNode) - Breadcrumb navigation

**Usage:**
```jsx
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Button } from '../components/common';
import { Plus } from 'lucide-react';

<PageHeader
  title="Residents"
  description="Manage all registered residents"
  breadcrumbs={
    <Breadcrumbs items={[
      { label: 'Residents', path: '/residents' }
    ]} />
  }
  actions={
    <Button icon={<Plus size={20} />}>
      Add Resident
    </Button>
  }
/>
```

---

### 5. Breadcrumbs
**File:** `Breadcrumbs.jsx`

**Purpose:** Navigation breadcrumbs for page hierarchy

**Props:**
- `items` (Array) - Breadcrumb items [{label, path}]
- `showHome` (boolean) - Show home icon (default: true)

**Usage:**
```jsx
import { Breadcrumbs } from '../components/layout';

<Breadcrumbs
  items={[
    { label: 'Residents', path: '/residents' },
    { label: 'John Doe' } // Current page (no path)
  ]}
/>

// Without home icon
<Breadcrumbs
  showHome={false}
  items={[
    { label: 'Settings', path: '/settings' },
    { label: 'Profile' }
  ]}
/>
```

---

## Complete Usage Example

### App.jsx with Layout
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './components/auth';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ResidentsPage from './pages/ResidentsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes with layout */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/residents" element={
              <ProtectedRoute requiredRoles={['admin', 'record_keeper']}>
                <ResidentsPage />
              </ProtectedRoute>
            } />
            {/* ... other routes */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Page with PageHeader
```jsx
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Button, Card } from '../components/common';
import { Plus, Download } from 'lucide-react';

function ResidentsPage() {
  return (
    <>
      <PageHeader
        title="Residents"
        description="Manage all registered residents in the barangay"
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Residents' }
          ]} />
        }
        actions={
          <>
            <Button variant="secondary" icon={<Download size={20} />}>
              Export
            </Button>
            <Button variant="primary" icon={<Plus size={20} />}>
              Add Resident
            </Button>
          </>
        }
      />
      
      <Card>
        {/* Your page content */}
      </Card>
    </>
  );
}
```

### Nested Page with Breadcrumbs
```jsx
import { PageHeader, Breadcrumbs } from '../components/layout';
import { useParams } from 'react-router-dom';

function ResidentDetailsPage() {
  const { id } = useParams();
  const resident = useResident(id);
  
  return (
    <>
      <PageHeader
        title={resident.full_name}
        description={`Resident ID: ${resident.id}`}
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Residents', path: '/residents' },
            { label: resident.full_name }
          ]} />
        }
        actions={
          <Button>Edit Details</Button>
        }
      />
      
      {/* Resident details */}
    </>
  );
}
```

---

## Layout Behavior

### Desktop (>1024px)
- Sidebar visible and collapsible
- Navbar with search bar
- User info visible
- Content has left margin for sidebar

### Tablet (768px - 1024px)
- Sidebar becomes drawer (hidden by default)
- Toggle via hamburger menu
- Navbar remains sticky

### Mobile (<768px)
- Sidebar drawer
- Search bar hidden
- User info in navbar collapsed
- Full-width content

---

## Customization

### Sidebar Menu Items
Modify menu items in `Sidebar.jsx`:
```jsx
const menuItems = [
  {
    icon: <YourIcon size={20} />,
    label: 'Your Page',
    path: '/your-page',
    roles: ['admin'] // Optional role restriction
  }
];
```

### Navbar Actions
Add custom buttons to navbar in `Navbar.jsx`:
```jsx
<div className="navbar-right">
  {/* Your custom buttons */}
  <button>Custom Action</button>
  
  {/* Existing notifications & user menu */}
</div>
```

### Page Header Styles
Override in your page CSS:
```css
.custom-page .page-header {
  background: var(--primary-50);
  padding: 2rem;
  border-radius: var(--radius-lg);
}
```

---

## File Organization

```
src/
├── components/
│   └── layout/
│       ├── MainLayout.jsx + .css
│       ├── Navbar.jsx + .css
│       ├── Sidebar.jsx + .css
│       ├── PageHeader.jsx + .css
│       ├── Breadcrumbs.jsx + .css
│       ├── index.js
│       └── README.md
```

---

## Best Practices

### 1. Use MainLayout for all authenticated pages
```jsx
<Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
  {/* All authenticated routes here */}
</Route>
```

### 2. Use PageHeader for consistency
```jsx
<PageHeader
  title="Page Title"
  description="Page description"
  breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
  actions={actionButtons}
/>
```

### 3. Keep sidebar menu items role-based
```jsx
{
  label: 'Admin Only',
  path: '/admin',
  roles: ['admin'] // Will only show for admins
}
```

### 4. Use breadcrumbs for nested pages
```jsx
<Breadcrumbs items={[
  { label: 'Parent', path: '/parent' },
  { label: 'Child', path: '/parent/child' },
  { label: 'Current Page' } // No path for current page
]} />
```

---

## Accessibility

All layout components follow accessibility best practices:
- Semantic HTML (`<nav>`, `<main>`, `<aside>`)
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Skip to content links

---

## Responsive Design

The layout automatically adapts:
- **Desktop**: Sidebar visible, collapsible
- **Tablet**: Sidebar drawer, toggle button
- **Mobile**: Compact navbar, drawer sidebar

---

All layout components are production-ready with responsive design and accessibility features! 🎉