# Residents Components

Components for managing resident information in the Barangay Document System.

## Available Components

### 1. ResidentForm
**File:** `ResidentForm.jsx + .css`

**Purpose:** Form for adding or editing resident information

**Features:**
- Comprehensive personal information (name, DOB, gender, civil status)
- Complete address fields (house, street, purok, barangay, city, province)
- Contact information (mobile, email)
- Employment details (occupation, income)
- Status checkboxes (voter, PWD, senior citizen)
- Built-in validation with `inputSanitizer`
- Error handling and display
- Loading states
- Save/Cancel actions

**Props:**
```jsx
<ResidentForm
  resident={residentData}  // For editing (optional)
  onSubmit={(data) => handleSubmit(data)}
  onCancel={() => handleCancel()}
/>
```

**Form Sections:**
1. Personal Information (9 fields)
2. Address Information (7 fields)
3. Contact Information (2 fields)
4. Employment Information (2 fields)
5. Status Information (3 checkboxes)

---

### 2. ResidentCard
**File:** `ResidentCard.jsx + .css`

**Purpose:** Display resident in card format with quick actions

**Features:**
- Avatar with user icon
- Full name with suffix
- Age, gender, civil status
- Status badges (Voter, PWD, Senior)
- Complete address
- Contact information
- Occupation
- QR code status indicator
- Action menu (View, Edit, Generate QR, Delete)
- Hover effects

**Props:**
```jsx
<ResidentCard
  resident={residentData}
  onView={(resident) => showDetails(resident)}
  onEdit={(resident) => openEditForm(resident)}
  onDelete={(resident) => confirmDelete(resident)}
  onGenerateQR={(resident) => generateQR(resident)}
/>
```

---

### 3. ResidentDetails
**File:** `ResidentDetails.jsx + .css`

**Purpose:** Full-screen modal showing complete resident information

**Features:**
- Large avatar header
- Complete personal information
- Full address details
- Contact information
- Employment information
- Status indicators with visual feedback
- QR code display with download button
- Generate QR button (if not generated)
- Close button
- Smooth animations

**Props:**
```jsx
<ResidentDetails
  resident={residentData}
  onClose={() => closeModal()}
  onGenerateQR={(resident) => generateQR(resident)}
/>
```

**Sections:**
1. Personal Information (7 fields)
2. Address Information (5 fields)
3. Contact Information (2 fields)
4. Employment Information (2 fields)
5. Status Information (3 statuses with indicators)
6. QR Code (if available)

---

### 4. ResidentSearch
**File:** `ResidentSearch.jsx + .css`

**Purpose:** Search and filter residents

**Features:**
- Real-time search input
- Clear search button
- Advanced filters toggle
- 6 filter options (gender, civil status, age range, voter, PWD, senior)
- Active filter count badge
- Clear all filters button
- Smooth animations
- Responsive design

**Props:**
```jsx
<ResidentSearch
  onSearch={(query) => handleSearch(query)}
  onFilterChange={(filters) => handleFilterChange(filters)}
/>
```

**Filters Available:**
- Gender (Male, Female)
- Civil Status (Single, Married, Widowed, Separated, Divorced)
- Age Range (0-17, 18-59, 60+)
- Voter Status (Registered, Not Registered)
- PWD Status (PWD, Not PWD)
- Senior Citizen (Yes, No)

---

## Complete Usage Example

### Full Residents Management Page

```jsx
import { useState, useEffect } from 'react';
import { PageHeader, Breadcrumbs } from '../components/layout';
import { Button, Modal } from '../components/common';
import {
  ResidentForm,
  ResidentCard,
  ResidentDetails,
  ResidentSearch
} from '../components/residents';
import { Plus } from 'lucide-react';
import { db } from '../services/supabaseClient';
import { generateQRCode } from '../services/qrCodeService';
import toast from 'react-hot-toast';

function ResidentsPage() {
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await db.residents.getAll();
      setResidents(data);
      setFilteredResidents(data);
    } catch (error) {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    if (!query) {
      setFilteredResidents(residents);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = residents.filter(resident => {
      const fullName = `${resident.first_name} ${resident.middle_name} ${resident.last_name}`.toLowerCase();
      const address = `${resident.street} ${resident.barangay}`.toLowerCase();
      const mobile = resident.mobile_number || '';

      return (
        fullName.includes(lowercaseQuery) ||
        address.includes(lowercaseQuery) ||
        mobile.includes(lowercaseQuery)
      );
    });

    setFilteredResidents(filtered);
  };

  const handleFilterChange = (filters) => {
    let filtered = [...residents];

    // Apply gender filter
    if (filters.gender) {
      filtered = filtered.filter(r => r.gender === filters.gender);
    }

    // Apply civil status filter
    if (filters.civil_status) {
      filtered = filtered.filter(r => r.civil_status === filters.civil_status);
    }

    // Apply age range filter
    if (filters.age_range) {
      filtered = filtered.filter(r => {
        const age = calculateAge(r.date_of_birth);
        if (filters.age_range === '0-17') return age < 18;
        if (filters.age_range === '18-59') return age >= 18 && age < 60;
        if (filters.age_range === '60+') return age >= 60;
        return true;
      });
    }

    // Apply boolean filters
    if (filters.voter_status) {
      filtered = filtered.filter(r => r.voter_status === (filters.voter_status === 'true'));
    }

    if (filters.pwd_status) {
      filtered = filtered.filter(r => r.pwd_status === (filters.pwd_status === 'true'));
    }

    if (filters.senior_citizen) {
      filtered = filtered.filter(r => r.senior_citizen === (filters.senior_citizen === 'true'));
    }

    setFilteredResidents(filtered);
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddResident = async (data) => {
    try {
      const newResident = await db.residents.create(data);
      toast.success('Resident added successfully!');
      setShowForm(false);
      loadResidents();
    } catch (error) {
      toast.error('Failed to add resident');
    }
  };

  const handleEditResident = async (data) => {
    try {
      await db.residents.update(selectedResident.id, data);
      toast.success('Resident updated successfully!');
      setShowForm(false);
      setSelectedResident(null);
      loadResidents();
    } catch (error) {
      toast.error('Failed to update resident');
    }
  };

  const handleDeleteResident = async (resident) => {
    if (!window.confirm(`Delete ${resident.first_name} ${resident.last_name}?`)) {
      return;
    }

    try {
      await db.residents.delete(resident.id);
      toast.success('Resident deleted successfully!');
      loadResidents();
    } catch (error) {
      toast.error('Failed to delete resident');
    }
  };

  const handleGenerateQR = async (resident) => {
    try {
      const qrData = await generateQRCode(resident);
      await db.residents.update(resident.id, {
        qr_code_data: qrData.data,
        qr_code_url: qrData.url
      });
      toast.success('QR Code generated successfully!');
      loadResidents();
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  return (
    <>
      <PageHeader
        title="Residents"
        description="Manage barangay residents and their information"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Residents' }]} />}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={20} />
            Add Resident
          </Button>
        }
      />

      {/* Search and Filters */}
      <ResidentSearch
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      {/* Residents Grid */}
      <div className="residents-grid">
        {filteredResidents.map(resident => (
          <ResidentCard
            key={resident.id}
            resident={resident}
            onView={(r) => {
              setSelectedResident(r);
              setShowDetails(true);
            }}
            onEdit={(r) => {
              setSelectedResident(r);
              setShowForm(true);
            }}
            onDelete={handleDeleteResident}
            onGenerateQR={handleGenerateQR}
          />
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedResident(null);
          }}
          title={selectedResident ? 'Edit Resident' : 'Add Resident'}
          size="xl"
        >
          <ResidentForm
            resident={selectedResident}
            onSubmit={selectedResident ? handleEditResident : handleAddResident}
            onCancel={() => {
              setShowForm(false);
              setSelectedResident(null);
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {showDetails && selectedResident && (
        <ResidentDetails
          resident={selectedResident}
          onClose={() => {
            setShowDetails(false);
            setSelectedResident(null);
          }}
          onGenerateQR={handleGenerateQR}
        />
      )}
    </>
  );
}

export default ResidentsPage;
```

### CSS for Grid Layout:

```css
.residents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .residents-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Component Features Summary

### ResidentForm
- ✅ 20+ input fields
- ✅ Built-in validation
- ✅ Error messages
- ✅ Loading states
- ✅ Add/Edit modes
- ✅ Security: Input sanitization

### ResidentCard
- ✅ Compact information display
- ✅ Status badges
- ✅ Quick actions menu
- ✅ Hover effects
- ✅ QR status indicator
- ✅ Responsive design

### ResidentDetails
- ✅ Full information modal
- ✅ QR code display
- ✅ Download QR option
- ✅ Organized sections
- ✅ Visual status indicators
- ✅ Smooth animations

### ResidentSearch
- ✅ Real-time search
- ✅ 6 filter options
- ✅ Clear search/filters
- ✅ Active filter count
- ✅ Collapsible filters
- ✅ Responsive layout

---

## File Organization

```
src/
├── components/
│   └── residents/
│       ├── ResidentForm.jsx + .css
│       ├── ResidentCard.jsx + .css
│       ├── ResidentDetails.jsx + .css
│       ├── ResidentSearch.jsx + .css
│       ├── index.js
│       └── README.md
```

---

## Integration with Services

### Database Service:
```javascript
import { db } from '../services/supabaseClient';

// CRUD operations
await db.residents.create(data);
await db.residents.update(id, data);
await db.residents.delete(id);
await db.residents.getAll();
await db.residents.getById(id);
```

### QR Code Service:
```javascript
import { generateQRCode } from '../services/qrCodeService';

const qrData = await generateQRCode(resident);
// Returns: { data, url }
```

### Validation Service:
```javascript
import { validateForm } from '../services/security/inputSanitizer';

const result = validateForm(formData, validationRules);
// Returns: { isValid, errors, sanitizedData }
```

---

## Best Practices

### 1. Always Validate Input
```jsx
const validation = validateForm(formData, validationRules);
if (!validation.isValid) {
  setErrors(validation.errors);
  return;
}
// Use validation.sanitizedData
```

### 2. Show Loading States
```jsx
{loading ? (
  <div className="spinner"></div>
) : (
  <ResidentCard resident={resident} />
)}
```

### 3. Confirm Delete Actions
```jsx
const handleDelete = (resident) => {
  if (window.confirm(`Delete ${resident.first_name}?`)) {
    // Delete
  }
};
```

### 4. Handle Errors Gracefully
```jsx
try {
  await db.residents.create(data);
  toast.success('Success!');
} catch (error) {
  toast.error('Failed to save');
  console.error(error);
}
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
- **Tablet:** Adjusted grid, visible filters
- **Mobile:** Single column, collapsible filters, full-screen modals

---

All residents components are production-ready with validation, security, and beautiful UI! 👥✨