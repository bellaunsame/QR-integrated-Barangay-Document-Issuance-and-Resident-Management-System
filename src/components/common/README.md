# Common Components

This folder contains reusable UI components used throughout the Barangay Document Issuance System.

## Available Components

### 1. Button
**File:** `Button.jsx`

**Purpose:** Reusable button component with multiple variants and states

**Props:**
- `variant` (string) - 'primary', 'secondary', 'success', 'danger', 'warning', 'ghost'
- `size` (string) - 'sm', 'md', 'lg'
- `fullWidth` (boolean) - Take full width
- `loading` (boolean) - Show loading spinner
- `disabled` (boolean) - Disable button
- `icon` (ReactNode) - Icon component
- `iconPosition` (string) - 'left' or 'right'

**Usage:**
```jsx
import { Button } from '../components/common';
import { Save, Plus } from 'lucide-react';

// Basic button
<Button>Click me</Button>

// Primary button with icon
<Button variant="primary" icon={<Save size={20} />}>
  Save Changes
</Button>

// Loading state
<Button loading={isSubmitting}>
  Submit
</Button>

// Danger button
<Button variant="danger" icon={<Trash size={20} />}>
  Delete
</Button>

// Full width
<Button fullWidth variant="success" icon={<Plus size={20} />}>
  Add New
</Button>
```

---

### 2. Card
**File:** `Card.jsx`

**Purpose:** Container component with elevation and optional header/footer

**Props:**
- `header` (ReactNode) - Card header content
- `footer` (ReactNode) - Card footer content
- `hoverable` (boolean) - Add hover effect
- `padding` (string) - 'none', 'sm', 'md', 'lg'
- `onClick` (function) - Click handler

**Usage:**
```jsx
import { Card } from '../components/common';

// Basic card
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// With header and footer
<Card
  header={<h3>Document Request</h3>}
  footer={<Button>Approve</Button>}
>
  <p>Request details...</p>
</Card>

// Hoverable card
<Card hoverable onClick={() => navigate('/details')}>
  <DocumentPreview />
</Card>

// No padding
<Card padding="none">
  <img src="/image.jpg" alt="Banner" />
</Card>
```

---

### 3. Modal
**File:** `Modal.jsx`

**Purpose:** Full-featured modal dialog with backdrop

**Props:**
- `isOpen` (boolean) - Control visibility
- `onClose` (function) - Close handler
- `title` (string) - Modal title
- `footer` (ReactNode) - Footer content
- `size` (string) - 'sm', 'md', 'lg', 'xl', 'full'
- `closeOnBackdrop` (boolean) - Close when clicking backdrop
- `showCloseButton` (boolean) - Show X button

**Usage:**
```jsx
import { Modal, Button } from '../components/common';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Confirm</Button>
          </>
        }
      >
        <p>Are you sure you want to proceed?</p>
      </Modal>
    </>
  );
}
```

---

### 4. Input
**File:** `Input.jsx`

**Purpose:** Styled text input with label and error display

**Props:**
- `label` (string) - Input label
- `error` (string) - Error message
- `hint` (string) - Help text
- `icon` (ReactNode) - Icon component
- `iconPosition` (string) - 'left' or 'right'
- `fullWidth` (boolean) - Take full width (default: true)

**Usage:**
```jsx
import { Input } from '../components/common';
import { Mail, Lock } from 'lucide-react';

// Basic input
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With icon
<Input
  label="Email"
  icon={<Mail size={20} />}
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With error
<Input
  label="Password"
  type="password"
  icon={<Lock size={20} />}
  error={errors.password}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// With hint
<Input
  label="Phone Number"
  hint="Format: 09XX-XXX-XXXX"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
/>
```

---

### 5. LoadingSpinner
**File:** `LoadingSpinner.jsx`

**Purpose:** Loading indicator

**Props:**
- `size` (string) - 'sm', 'md', 'lg', 'xl'
- `color` (string) - 'primary', 'white', 'gray'
- `text` (string) - Optional loading text

**Usage:**
```jsx
import { LoadingSpinner } from '../components/common';

// Basic spinner
<LoadingSpinner />

// Large spinner with text
<LoadingSpinner size="lg" text="Loading data..." />

// White spinner (for dark backgrounds)
<LoadingSpinner color="white" />

// Full page loading
<div className="loading-page">
  <LoadingSpinner size="xl" text="Please wait..." />
</div>
```

---

### 6. Badge
**File:** `Badge.jsx`

**Purpose:** Small colored label for status, counts, etc

**Props:**
- `variant` (string) - 'primary', 'success', 'warning', 'danger', 'gray'
- `size` (string) - 'sm', 'md', 'lg'
- `icon` (ReactNode) - Optional icon

**Usage:**
```jsx
import { Badge } from '../components/common';
import { Check, Clock } from 'lucide-react';

// Status badges
<Badge variant="success" icon={<Check size={14} />}>
  Approved
</Badge>

<Badge variant="warning" icon={<Clock size={14} />}>
  Pending
</Badge>

<Badge variant="danger">Rejected</Badge>

// Count badge
<Badge variant="primary">{unreadCount}</Badge>

// Small badge
<Badge size="sm" variant="gray">New</Badge>
```

---

### 7. Table
**File:** `Table.jsx`

**Purpose:** Responsive table with sorting and selection

**Props:**
- `columns` (Array) - Column definitions
- `data` (Array) - Table data
- `striped` (boolean) - Striped rows (default: true)
- `hoverable` (boolean) - Row hover effect (default: true)
- `onRowClick` (function) - Row click handler
- `emptyMessage` (string) - Message when no data

**Usage:**
```jsx
import { Table } from '../components/common';

const columns = [
  { key: 'name', title: 'Name', width: '30%' },
  { key: 'email', title: 'Email', width: '30%' },
  { 
    key: 'status', 
    title: 'Status',
    align: 'center',
    render: (value) => <Badge variant={value === 'active' ? 'success' : 'gray'}>{value}</Badge>
  },
  { 
    key: 'actions', 
    title: 'Actions',
    align: 'right',
    render: (_, row) => (
      <Button size="sm" onClick={() => handleEdit(row)}>Edit</Button>
    )
  }
];

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
];

<Table
  columns={columns}
  data={data}
  onRowClick={(row) => console.log('Clicked:', row)}
  emptyMessage="No users found"
/>
```

---

### 8. EmptyState
**File:** `EmptyState.jsx`

**Purpose:** Display when no data is available

**Props:**
- `icon` (ReactNode) - Icon component
- `title` (string) - Main message
- `description` (string) - Supporting text
- `action` (ReactNode) - CTA button

**Usage:**
```jsx
import { EmptyState, Button } from '../components/common';
import { FileX, Plus } from 'lucide-react';

<EmptyState
  icon={<FileX size={48} />}
  title="No documents found"
  description="Get started by creating your first document"
  action={
    <Button icon={<Plus size={20} />}>
      Create Document
    </Button>
  }
/>
```

---

### 9. Pagination
**File:** `Pagination.jsx`

**Purpose:** Navigate through pages of data

**Props:**
- `currentPage` (number) - Current page number
- `totalPages` (number) - Total number of pages
- `onPageChange` (function) - Page change handler
- `siblingCount` (number) - Pages to show on each side (default: 1)

**Usage:**
```jsx
import { Pagination } from '../components/common';
import { usePagination } from '../hooks';

function ResidentsList() {
  const {
    currentPage,
    totalPages,
    currentData,
    goToPage
  } = usePagination(residents, 10);

  return (
    <>
      <Table data={currentData} columns={columns} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </>
  );
}
```

---

## Complete Usage Example

```jsx
import {
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Input,
  LoadingSpinner,
  EmptyState,
  Pagination
} from '../components/common';
import { Plus, Edit, Trash } from 'lucide-react';

function ResidentsPage() {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [residents, setResidents] = useState([]);
  const { currentPage, totalPages, currentData, goToPage } = usePagination(residents, 10);

  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { 
      key: 'status', 
      title: 'Status',
      render: (value) => <Badge variant="success">{value}</Badge>
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      render: (_, row) => (
        <>
          <Button size="sm" icon={<Edit size={16} />}>Edit</Button>
          <Button size="sm" variant="danger" icon={<Trash size={16} />}>Delete</Button>
        </>
      )
    }
  ];

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading residents..." />;
  }

  return (
    <Card
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>Residents</h2>
          <Button icon={<Plus size={20} />} onClick={() => setShowModal(true)}>
            Add Resident
          </Button>
        </div>
      }
    >
      {residents.length === 0 ? (
        <EmptyState
          title="No residents found"
          description="Start by adding your first resident"
          action={<Button icon={<Plus size={20} />}>Add Resident</Button>}
        />
      ) : (
        <>
          <Table columns={columns} data={currentData} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Resident"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">Save</Button>
          </>
        }
      >
        <Input label="Full Name" placeholder="Enter full name" />
        <Input label="Email" type="email" placeholder="email@example.com" />
      </Modal>
    </Card>
  );
}
```

---

## File Organization

```
src/
├── components/
│   └── common/
│       ├── Button.jsx
│       ├── Button.css
│       ├── Card.jsx
│       ├── Card.css
│       ├── Modal.jsx
│       ├── Modal.css
│       ├── Input.jsx
│       ├── Input.css
│       ├── LoadingSpinner.jsx
│       ├── LoadingSpinner.css
│       ├── Badge.jsx
│       ├── Badge.css
│       ├── Table.jsx
│       ├── Table.css
│       ├── EmptyState.jsx
│       ├── EmptyState.css
│       ├── Pagination.jsx
│       ├── Pagination.css
│       ├── index.js
│       └── README.md
```

---

## Styling

All components use CSS variables from your theme:
- `--primary-600`, `--primary-700` - Primary colors
- `--surface` - Background color
- `--border` - Border color
- `--text-primary`, `--text-secondary`, `--text-tertiary` - Text colors
- `--radius-sm`, `--radius-md`, `--radius-lg` - Border radius
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` - Shadows
- `--transition-fast`, `--transition-base` - Transitions

---

## Best Practices

1. **Import from index**
   ```jsx
   import { Button, Card, Modal } from '../components/common';
   ```

2. **Use consistent variants**
   ```jsx
   <Button variant="primary">Primary Action</Button>
   <Button variant="danger">Delete</Button>
   ```

3. **Combine components**
   ```jsx
   <Card>
     <Table data={data} columns={columns} />
     <Pagination {...paginationProps} />
   </Card>
   ```

4. **Handle loading states**
   ```jsx
   {loading ? <LoadingSpinner /> : <Table data={data} />}
   ```

5. **Show empty states**
   ```jsx
   {data.length === 0 ? <EmptyState /> : <Table data={data} />}
   ```

---

All components are production-ready, fully responsive, and accessible! 🎉