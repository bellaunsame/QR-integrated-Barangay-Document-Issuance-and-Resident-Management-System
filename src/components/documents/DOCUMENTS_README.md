# Documents Components

Components for managing document requests and templates in the Barangay Document System.

## Available Components

### 1. DocumentRequestForm
**Files:** `DocumentRequestForm.jsx + .css`

**Purpose:** Form for creating new document requests

**Features:**
- Resident information display
- Template/document type selection
- Purpose textarea (10-500 chars)
- Template preview
- Real-time validation
- Character counter
- Submit/Cancel actions

**Props:**
```jsx
<DocumentRequestForm
  resident={residentObject}     // Optional - pre-fills resident
  templates={templatesArray}    // Array of available templates
  onSubmit={(data) => {}}      // Callback with form data
  onCancel={() => {}}          // Cancel callback
/>
```

**Form Data:**
```javascript
{
  resident_id: 'uuid',
  template_id: 'uuid',
  request_type: 'Barangay Clearance',
  purpose: 'For employment purposes',
  status: 'pending'
}
```

---

### 2. DocumentRequestCard
**Files:** `DocumentRequestCard.jsx + .css`

**Purpose:** Display document request in compact card format

**Features:**
- Color-coded status badges
- Request type and date
- Resident information
- Purpose display
- Processing notes
- Action menu (View, Approve, Reject, Complete, Download, Delete)
- Hover effects

**Props:**
```jsx
<DocumentRequestCard
  request={requestObject}
  onView={(request) => {}}
  onApprove={(request) => {}}
  onReject={(request) => {}}
  onComplete={(request) => {}}
  onDelete={(request) => {}}
  onDownload={(request) => {}}
  showActions={true}            // Optional - default true
/>
```

**Status Colors:**
- Pending: Orange (#f59e0b)
- Processing: Blue (#3b82f6)
- Approved: Green (#10b981)
- Rejected: Red (#ef4444)
- Completed: Purple (#8b5cf6)
- Released: Green (#10b981)

---

### 3. DocumentRequestDetails
**Files:** `DocumentRequestDetails.jsx + .css`

**Purpose:** Full-screen modal with complete request details

**Features:**
- Large header with status
- Request information section
- Resident information section
- Processing information section
- Document download/print buttons
- Action buttons (Approve, Reject, Complete)
- Smooth animations

**Props:**
```jsx
<DocumentRequestDetails
  request={requestObject}
  onClose={() => {}}
  onApprove={(request) => {}}      // Optional
  onReject={(request) => {}}       // Optional
  onComplete={(request) => {}}     // Optional
  onDownload={(request) => {}}     // Optional
/>
```

**Sections:**
1. Request Information (ID, type, status, dates, purpose)
2. Resident Information (name, contact, address)
3. Processing Information (processor, dates, notes)
4. Document Actions (download, print)
5. Request Actions (approve/reject/complete)

---

### 4. DocumentStatusFilter
**Files:** `DocumentStatusFilter.jsx + .css`

**Purpose:** Filter document requests by status

**Features:**
- All status options with counts
- Color-coded buttons
- Active state highlighting
- Clear filter button
- Responsive grid layout

**Props:**
```jsx
<DocumentStatusFilter
  onFilterChange={(status) => {}}  // Callback with selected status or null
  counts={{                        // Optional - status counts
    all: 50,
    pending: 15,
    processing: 8,
    approved: 12,
    rejected: 3,
    completed: 10,
    released: 2
  }}
/>
```

**Filter Options:**
- All Requests (gray)
- Pending (orange)
- Processing (blue)
- Approved (green)
- Rejected (red)
- Completed (purple)
- Released (green)

---

### 5. TemplateForm
**Files:** `TemplateForm.jsx + .css`

**Purpose:** Form for creating/editing document templates

**Features:**
- Template name and code
- Required fields (comma-separated)
- Template content textarea
- 18 available placeholders
- Click-to-insert placeholders
- Template preview
- Active/inactive toggle
- Validation

**Props:**
```jsx
<TemplateForm
  template={templateObject}    // Optional - for editing
  onSubmit={(data) => {}}     // Callback with form data
  onCancel={() => {}}         // Cancel callback
/>
```

**Available Placeholders:**
- `{resident_name}` - Full name
- `{first_name}` - First name
- `{middle_name}` - Middle name
- `{last_name}` - Last name
- `{age}` - Age
- `{gender}` - Gender
- `{civil_status}` - Civil status
- `{address}` - Full address
- `{street}` - Street
- `{barangay}` - Barangay
- `{city_municipality}` - City
- `{province}` - Province
- `{mobile_number}` - Phone
- `{email}` - Email
- `{date_of_birth}` - Birth date
- `{purpose}` - Request purpose
- `{date_today}` - Current date
- `{occupation}` - Occupation

---

## Complete Usage Example

### Document Requests Management Page

```jsx
import { useState, useEffect } from 'react';
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Button, Modal } from '../components/common';
import {
  DocumentRequestForm,
  DocumentRequestCard,
  DocumentRequestDetails,
  DocumentStatusFilter
} from '../components/documents';
import { Plus } from 'lucide-react';
import { db } from '../services/supabaseClient';
import toast from 'react-hot-toast';

function DocumentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [residents, setResidents] = useState([]);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter]);

  const loadData = async () => {
    try {
      const [requestsData, templatesData, residentsData] = await Promise.all([
        db.requests.getAll(),
        db.templates.getAll(),
        db.residents.getAll()
      ]);
      
      setRequests(requestsData);
      setTemplates(templatesData);
      setResidents(residentsData);
      
      calculateStatusCounts(requestsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const calculateStatusCounts = (requestsData) => {
    const counts = {
      all: requestsData.length,
      pending: requestsData.filter(r => r.status === 'pending').length,
      processing: requestsData.filter(r => r.status === 'processing').length,
      approved: requestsData.filter(r => r.status === 'approved').length,
      rejected: requestsData.filter(r => r.status === 'rejected').length,
      completed: requestsData.filter(r => r.status === 'completed').length,
      released: requestsData.filter(r => r.status === 'released').length
    };
    setStatusCounts(counts);
  };

  const filterRequests = () => {
    if (!statusFilter) {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === statusFilter));
    }
  };

  const handleCreateRequest = async (data) => {
    try {
      const newRequest = await db.requests.create(data);
      toast.success('Request created successfully!');
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create request');
    }
  };

  const handleApprove = async (request) => {
    if (!window.confirm('Approve this request?')) return;
    
    try {
      await db.requests.update(request.id, {
        status: 'approved',
        processed_by: currentUser.id,
        processed_at: new Date().toISOString()
      });
      toast.success('Request approved!');
      loadData();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (request) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await db.requests.update(request.id, {
        status: 'rejected',
        processed_by: currentUser.id,
        processed_at: new Date().toISOString(),
        processing_notes: reason
      });
      toast.success('Request rejected');
      loadData();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleComplete = async (request) => {
    try {
      await db.requests.update(request.id, {
        status: 'completed',
        released_by: currentUser.id,
        released_at: new Date().toISOString()
      });
      toast.success('Request marked as completed!');
      loadData();
    } catch (error) {
      toast.error('Failed to complete request');
    }
  };

  const handleDelete = async (request) => {
    if (!window.confirm('Delete this request?')) return;
    
    try {
      await db.requests.delete(request.id);
      toast.success('Request deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete request');
    }
  };

  return (
    <>
      <PageHeader
        title="Document Requests"
        description="Manage document requests from residents"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Document Requests' }]} />}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={20} />
            New Request
          </Button>
        }
      />

      {/* Status Filter */}
      <DocumentStatusFilter
        onFilterChange={setStatusFilter}
        counts={statusCounts}
      />

      {/* Requests Grid */}
      <div className="requests-grid">
        {filteredRequests.map(request => (
          <DocumentRequestCard
            key={request.id}
            request={request}
            onView={(r) => {
              setSelectedRequest(r);
              setShowDetails(true);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Create Request Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="New Document Request"
          size="lg"
        >
          <DocumentRequestForm
            templates={templates}
            onSubmit={handleCreateRequest}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <DocumentRequestDetails
          request={selectedRequest}
          onClose={() => {
            setShowDetails(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

export default DocumentRequestsPage;
```

### CSS for Grid:

```css
.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .requests-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Template Management Example

```jsx
import { useState, useEffect } from 'react';
import { TemplateForm } from '../components/documents';
import { db } from '../services/supabaseClient';

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreateTemplate = async (data) => {
    try {
      await db.templates.create(data);
      toast.success('Template created!');
      setShowForm(false);
      loadTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (data) => {
    try {
      await db.templates.update(selectedTemplate.id, data);
      toast.success('Template updated!');
      setShowForm(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  return (
    <>
      {/* Template list here */}

      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <TemplateForm
            template={selectedTemplate}
            onSubmit={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
            onCancel={() => {
              setShowForm(false);
              setSelectedTemplate(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
```

---

## Component Features Summary

### DocumentRequestForm
- ✅ Resident info display
- ✅ Template selection
- ✅ Purpose validation (10-500 chars)
- ✅ Template preview
- ✅ Character counter
- ✅ Security: Input sanitization

### DocumentRequestCard
- ✅ Compact card design
- ✅ Color-coded status
- ✅ Action menu
- ✅ Hover effects
- ✅ Responsive layout

### DocumentRequestDetails
- ✅ Full details modal
- ✅ 5 information sections
- ✅ Document download
- ✅ Action buttons
- ✅ Smooth animations

### DocumentStatusFilter
- ✅ 7 status filters
- ✅ Count badges
- ✅ Clear filter button
- ✅ Color-coded
- ✅ Responsive grid

### TemplateForm
- ✅ Template editor
- ✅ 18 placeholders
- ✅ Click-to-insert
- ✅ Live preview
- ✅ Validation
- ✅ Active/inactive toggle

---

## File Organization

```
src/
├── components/
│   └── documents/
│       ├── DocumentRequestForm.jsx + .css
│       ├── DocumentRequestCard.jsx + .css
│       ├── DocumentRequestDetails.jsx + .css
│       ├── DocumentStatusFilter.jsx + .css
│       ├── TemplateForm.jsx + .css
│       ├── index.js
│       └── README.md
```

---

## Integration with Services

### Database Operations:
```javascript
// Create request
await db.requests.create(requestData);

// Update status
await db.requests.update(id, { status: 'approved' });

// Get all templates
const templates = await db.templates.getAll();
```

### Security:
```javascript
// Form validation uses inputSanitizer
import { validateField } from '../../services/security/inputSanitizer';

const validation = validateField(value, rules);
```

---

## Best Practices

### 1. Always Validate Input
```jsx
const validation = validateField(formData.purpose, {
  required: true,
  minLength: 10,
  maxLength: 500
});
```

### 2. Show Loading States
```jsx
{loading ? (
  <div className="spinner-small"></div>
) : (
  'Submit'
)}
```

### 3. Confirm Destructive Actions
```jsx
if (!window.confirm('Delete this request?')) return;
```

### 4. Use Toast Notifications
```jsx
toast.success('Request approved!');
toast.error('Failed to save');
```

---

## Accessibility

All components follow accessibility guidelines:
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader friendly
- ✅ Color contrast compliant

---

## Responsive Design

All components are fully responsive:
- **Desktop:** Grid layout, full features
- **Tablet:** Adjusted spacing
- **Mobile:** Single column, touch-friendly

---

All document components are production-ready with validation, security, and beautiful UI! 📄✨
