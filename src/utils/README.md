# Utils Folder

This folder contains utility functions and constants used throughout the Barangay Document Issuance System.

## Available Utilities

### 1. dateUtils.js
**Purpose:** Date formatting and manipulation

**Functions:**
- `formatDate(date, format)` - Format date to readable string
- `formatDatePH(date)` - Philippine date format (MMMM dd, yyyy)
- `formatDateTime(date)` - Format date with time
- `formatTime(date)` - Format time only
- `getRelativeTime(date)` - "2 hours ago"
- `calculateAge(dateOfBirth)` - Calculate age from DOB
- `daysBetween(date1, date2)` - Days between dates
- `isToday(date)` - Check if date is today
- `isPast(date)` - Check if date is in past
- `isFuture(date)` - Check if date is in future
- `getCurrentDate()` - Get current date (YYYY-MM-DD)
- `parseDate(dateString)` - Safely parse date string

**Example:**
```jsx
import { formatDate, calculateAge, getRelativeTime } from '../utils';

const formatted = formatDate(new Date(), 'MMM dd, yyyy');
const age = calculateAge('1990-01-15');
const relative = getRelativeTime('2024-01-01'); // "2 months ago"
```

---

### 2. stringUtils.js
**Purpose:** String manipulation and formatting

**Functions:**
- `capitalize(str)` - Capitalize first letter
- `capitalizeWords(str)` - Capitalize each word
- `toTitleCase(str)` - Convert to title case
- `truncate(str, length, suffix)` - Truncate with ellipsis
- `slugify(str)` - Convert to URL-friendly slug
- `formatPhoneNumber(phone)` - Format PH phone number
- `formatCurrency(amount)` - Format as Philippine Peso
- `formatNumber(num)` - Add commas to number
- `getInitials(name)` - Get initials from name
- `maskEmail(email)` - Mask email (j***@example.com)
- `generateRandomString(length)` - Random string
- `generateId(prefix)` - Generate unique ID

**Example:**
```jsx
import { formatCurrency, truncate, slugify } from '../utils';

const price = formatCurrency(1500); // "₱1,500.00"
const short = truncate('Long text here', 10); // "Long text..."
const slug = slugify('Hello World!'); // "hello-world"
```

---

### 3. arrayUtils.js
**Purpose:** Array operations and transformations

**Functions:**
- `unique(arr)` - Remove duplicates
- `uniqueBy(arr, key)` - Remove duplicates by property
- `groupBy(arr, key)` - Group array by property
- `sortBy(arr, key, order)` - Sort array by property
- `chunk(arr, size)` - Split into chunks
- `shuffle(arr)` - Randomize array
- `paginate(arr, page, perPage)` - Paginate array
- `filterBy(arr, filters)` - Filter by multiple properties
- `pluck(arr, key)` - Extract property values
- `sum(arr)` - Sum numbers
- `sumBy(arr, key)` - Sum property values
- `average(arr)` - Calculate average
- `countBy(arr, key)` - Count occurrences

**Example:**
```jsx
import { sortBy, groupBy, sumBy } from '../utils';

const sorted = sortBy(residents, 'last_name', 'asc');
const grouped = groupBy(requests, 'status');
const total = sumBy(items, 'price');
```

---

### 4. helpers.js
**Purpose:** Miscellaneous helper functions

**Functions:**
- `sleep(ms)` - Async delay
- `retry(fn, maxAttempts, delay)` - Retry with backoff
- `debounce(func, wait)` - Debounce function
- `throttle(func, limit)` - Throttle function
- `deepClone(obj)` - Deep clone object
- `deepMerge(target, ...sources)` - Deep merge objects
- `isEmpty(obj)` - Check if empty
- `pick(obj, keys)` - Pick properties
- `omit(obj, keys)` - Omit properties
- `get(obj, path, default)` - Get nested property
- `generateUUID()` - Generate UUID
- `copyToClipboard(text)` - Copy to clipboard
- `downloadFile(url, filename)` - Download file
- `parseJSON(str, default)` - Safe JSON parse
- `getDeviceType()` - Detect device (mobile/tablet/desktop)
- `scrollToTop(smooth)` - Scroll to top

**Example:**
```jsx
import { debounce, isEmpty, copyToClipboard } from '../utils';

const handleSearch = debounce((term) => {
  searchAPI(term);
}, 500);

if (isEmpty(data)) {
  return <EmptyState />;
}

await copyToClipboard('Text to copy');
```

---

### 5. constants.js
**Purpose:** Application-wide constants

**Constants:**
- `ROLES` - User roles (admin, clerk, record_keeper)
- `REQUEST_STATUS` - Document statuses
- `CIVIL_STATUS` - Civil status options
- `GENDER` - Gender options
- `VALIDATION` - Validation rules
- `DATE_FORMATS` - Date format strings
- `STORAGE_KEYS` - LocalStorage keys
- `ERROR_MESSAGES` - Error message templates
- `SUCCESS_MESSAGES` - Success message templates
- `TEMPLATE_VARIABLES` - Available template variables
- `ROUTES` - Application routes

**Example:**
```jsx
import { ROLES, REQUEST_STATUS, VALIDATION } from '../utils/constants';

if (user.role === ROLES.ADMIN) {
  // Admin only
}

if (request.status === REQUEST_STATUS.PENDING) {
  // Process pending request
}

const isValidPassword = password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
```

---

## Usage Patterns

### Complete Workflow Example
```jsx
import {
  formatDate,
  formatCurrency,
  capitalize,
  sortBy,
  groupBy,
  REQUEST_STATUS,
  ROLES
} from '../utils';

function RequestsReport({ requests }) {
  // Format data
  const formattedRequests = requests.map(req => ({
    ...req,
    fullName: capitalize(`${req.resident.first_name} ${req.resident.last_name}`),
    formattedDate: formatDate(req.created_at, 'MMM dd, yyyy'),
    amount: formatCurrency(req.fee)
  }));
  
  // Sort and group
  const sorted = sortBy(formattedRequests, 'created_at', 'desc');
  const grouped = groupBy(sorted, 'status');
  
  // Display by status
  return (
    <div>
      {Object.entries(grouped).map(([status, items]) => (
        <section key={status}>
          <h3>{status} ({items.length})</h3>
          {items.map(item => (
            <RequestCard key={item.id} {...item} />
          ))}
        </section>
      ))}
    </div>
  );
}
```

### Search with Debounce
```jsx
import { debounce, normalizeWhitespace } from '../utils';

function SearchBar() {
  const [search, setSearch] = useState('');
  
  const handleSearch = debounce((term) => {
    const cleaned = normalizeWhitespace(term);
    searchAPI(cleaned);
  }, 500);
  
  return (
    <input
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        handleSearch(e.target.value);
      }}
    />
  );
}
```

### Data Validation
```jsx
import { validateEmail, validatePhoneNumber, isEmpty } from '../utils';
import { VALIDATION, ERROR_MESSAGES } from '../utils/constants';

function validateForm(data) {
  const errors = {};
  
  if (isEmpty(data.email)) {
    errors.email = ERROR_MESSAGES.REQUIRED_FIELD;
  } else if (!validateEmail(data.email)) {
    errors.email = ERROR_MESSAGES.INVALID_EMAIL;
  }
  
  if (data.phone && !validatePhoneNumber(data.phone)) {
    errors.phone = ERROR_MESSAGES.INVALID_PHONE;
  }
  
  if (data.password && data.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    errors.password = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

### Array Operations
```jsx
import { groupBy, sumBy, averageBy, sortBy } from '../utils';

function AnalyticsDashboard({ requests }) {
  // Group by month
  const byMonth = groupBy(requests, (r) => 
    formatDate(r.created_at, 'yyyy-MM')
  );
  
  // Calculate totals
  const totalFees = sumBy(requests, 'fee');
  const avgProcessingTime = averageBy(
    requests.filter(r => r.processed_at),
    (r) => daysBetween(r.created_at, r.processed_at)
  );
  
  // Top documents
  const topDocs = sortBy(
    Object.entries(countBy(requests, 'request_type')),
    ([_, count]) => count,
    'desc'
  ).slice(0, 5);
  
  return <AnalyticsView data={{ byMonth, totalFees, avgProcessingTime, topDocs }} />;
}
```

---

## Best Practices

### 1. Use Named Imports
```jsx
// ✅ Good - Import only what you need
import { formatDate, capitalize } from '../utils';

// ❌ Bad - Import everything
import * as utils from '../utils';
```

### 2. Use Constants for Magic Values
```jsx
// ✅ Good
import { ROLES, REQUEST_STATUS } from '../utils/constants';

if (user.role === ROLES.ADMIN) { }
if (request.status === REQUEST_STATUS.PENDING) { }

// ❌ Bad
if (user.role === 'admin') { }
if (request.status === 'pending') { }
```

### 3. Chain Array Utilities
```jsx
// ✅ Good - Readable chain
const result = sortBy(
  filterBy(residents, { is_active: true }),
  'last_name'
);

// ❌ Bad - Nested calls
const result = sortBy(filterBy(residents, { is_active: true }), 'last_name');
```

### 4. Handle Edge Cases
```jsx
// ✅ Good - Safe handling
const formatted = formatDate(date) || 'No date';
const age = calculateAge(dob) || 0;

// ❌ Bad - Assumes data exists
const formatted = formatDate(date);
const age = calculateAge(dob);
```

---

## File Organization

```
src/
├── utils/
│   ├── dateUtils.js        # Date utilities
│   ├── stringUtils.js      # String utilities
│   ├── arrayUtils.js       # Array utilities
│   ├── helpers.js          # Helper functions
│   ├── constants.js        # Constants
│   ├── index.js            # Central export
│   └── README.md           # This file
```

---

## Common Use Cases

### Formatting Display Data
```jsx
import { formatDate, formatCurrency, capitalizeWords } from '../utils';

function ResidentCard({ resident }) {
  return (
    <div>
      <h3>{capitalizeWords(resident.full_name)}</h3>
      <p>Born: {formatDate(resident.date_of_birth)}</p>
      <p>Income: {formatCurrency(resident.monthly_income)}</p>
    </div>
  );
}
```

### Data Transformation
```jsx
import { sortBy, groupBy, pluck } from '../utils';

// Get all resident names
const names = pluck(residents, 'full_name');

// Group by barangay
const byBarangay = groupBy(residents, 'barangay');

// Sort by age descending
const sorted = sortBy(residents, 'date_of_birth', 'asc');
```

### Form Validation
```jsx
import { isEmpty, isNumeric, isAlpha } from '../utils';
import { VALIDATION } from '../utils/constants';

function validate(form) {
  if (isEmpty(form.name)) return 'Name required';
  if (!isAlpha(form.name)) return 'Name must be letters only';
  if (form.age && !isNumeric(form.age)) return 'Age must be number';
  if (form.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return 'Password too short';
  }
  return null;
}
```

### URL and Query Management
```jsx
import { getQueryParams, buildQueryString } from '../utils';

// Get current URL params
const params = getQueryParams(); // { page: '2', status: 'pending' }

// Build query string
const query = buildQueryString({ page: 2, status: 'pending' });
// Result: "page=2&status=pending"

// Use in fetch
fetch(`/api/requests?${query}`);
```

---

## Testing Utilities

```jsx
import { formatDate, capitalize, sumBy } from '../utils';

describe('dateUtils', () => {
  test('formatDate formats correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('stringUtils', () => {
  test('capitalize works', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
});

describe('arrayUtils', () => {
  test('sumBy calculates total', () => {
    const items = [{ price: 100 }, { price: 200 }];
    expect(sumBy(items, 'price')).toBe(300);
  });
});
```

---

## Performance Tips

1. **Use debounce for search inputs**
   ```jsx
   const debouncedSearch = debounce(searchFunction, 500);
   ```

2. **Use throttle for scroll events**
   ```jsx
   const throttledScroll = throttle(handleScroll, 100);
   ```

3. **Memoize expensive operations**
   ```jsx
   const sorted = useMemo(() => sortBy(data, 'name'), [data]);
   ```

4. **Use constants for repeated values**
   ```jsx
   import { ROLES } from '../utils/constants';
   // Instead of typing 'admin' everywhere
   ```

---

All utilities are production-ready, well-tested, and optimized for performance! 🎉