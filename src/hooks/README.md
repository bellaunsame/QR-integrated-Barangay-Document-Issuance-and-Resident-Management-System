# Custom Hooks

This folder contains reusable custom React hooks for the Barangay Document Issuance System.

## Available Hooks

### 1. useDebounce
**File:** `useDebounce.js`

**Purpose:** Delays updating a value until after a specified delay

**Use Cases:**
- Search inputs (wait for user to stop typing)
- API calls (reduce number of requests)
- Performance optimization

**Example:**
```jsx
import { useDebounce } from '../hooks';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    // This only runs 500ms after user stops typing
    if (debouncedSearch) {
      searchAPI(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search residents..."
    />
  );
}
```

---

### 2. useLocalStorage
**File:** `useLocalStorage.js`

**Purpose:** Persist state to localStorage automatically

**Use Cases:**
- Remember user preferences
- Save form drafts
- Cache data offline

**Example:**
```jsx
import { useLocalStorage } from '../hooks';

function SettingsComponent() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [fontSize, setFontSize, removeFontSize] = useLocalStorage('fontSize', 'normal');

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <button onClick={removeFontSize}>Reset Font Size</button>
    </div>
  );
}
```

---

### 3. useAsync
**File:** `useAsync.js`

**Purpose:** Handle async operations with loading, error, and data states

**Use Cases:**
- API calls
- Data fetching
- Async operations

**Example:**
```jsx
import { useAsync } from '../hooks';

function UsersComponent() {
  const { execute, loading, data, error, reset } = useAsync(
    async () => await db.users.getAll(),
    true // Execute immediately
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      <UserList users={data} />
      <button onClick={execute}>Refresh</button>
      <button onClick={reset}>Clear</button>
    </div>
  );
}
```

---

### 4. useForm
**File:** `useForm.js`

**Purpose:** Simplify form handling with validation

**Use Cases:**
- Login forms
- Registration forms
- Any form with validation

**Example:**
```jsx
import { useForm } from '../hooks';

function LoginForm() {
  const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm(
    { email: '', password: '' },
    async (values) => {
      await login(values.email, values.password);
    },
    (values) => {
      const errors = {};
      if (!values.email) errors.email = 'Email is required';
      if (!values.password) errors.password = 'Password is required';
      return errors;
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
      />
      {errors.email && <span>{errors.email}</span>}
      
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />
      {errors.password && <span>{errors.password}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

### 5. useClickOutside
**File:** `useClickOutside.js`

**Purpose:** Detect clicks outside an element

**Use Cases:**
- Close modals
- Close dropdowns
- Close popovers

**Example:**
```jsx
import { useClickOutside } from '../hooks';

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));

  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <div className="dropdown-menu">
          <MenuItem />
          <MenuItem />
        </div>
      )}
    </div>
  );
}
```

---

### 6. useWindowSize
**File:** `useWindowSize.js`

**Purpose:** Track window dimensions with breakpoint helpers

**Use Cases:**
- Responsive design
- Conditional rendering
- Mobile detection

**Example:**
```jsx
import { useWindowSize } from '../hooks';

function ResponsiveComponent() {
  const { width, height, isMobile, isTablet, isDesktop } = useWindowSize();

  if (isMobile) {
    return <MobileView />;
  }

  if (isTablet) {
    return <TabletView />;
  }

  return <DesktopView />;
}
```

---

### 7. useToggle
**File:** `useToggle.js`

**Purpose:** Simplify boolean state management

**Use Cases:**
- Show/hide modals
- Expand/collapse sections
- Toggle features

**Example:**
```jsx
import { useToggle } from '../hooks';

function ModalComponent() {
  const [isOpen, { toggle, setTrue, setFalse }] = useToggle(false);

  return (
    <>
      <button onClick={toggle}>Toggle Modal</button>
      <button onClick={setTrue}>Open Modal</button>
      {isOpen && (
        <Modal onClose={setFalse}>
          <h2>Modal Content</h2>
        </Modal>
      )}
    </>
  );
}
```

---

### 8. usePagination
**File:** `usePagination.js`

**Purpose:** Handle pagination logic

**Use Cases:**
- Table pagination
- List pagination
- Data splitting

**Example:**
```jsx
import { usePagination } from '../hooks';

function ResidentsList({ residents }) {
  const {
    currentPage,
    totalPages,
    currentData,
    nextPage,
    prevPage,
    goToPage
  } = usePagination(residents, 10);

  return (
    <div>
      <table>
        {currentData.map(resident => (
          <tr key={resident.id}>
            <td>{resident.name}</td>
          </tr>
        ))}
      </table>
      
      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1}>
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### 9. useCopyToClipboard
**File:** `useCopyToClipboard.js`

**Purpose:** Copy text to clipboard

**Use Cases:**
- Copy QR codes
- Copy document IDs
- Share links

**Example:**
```jsx
import { useCopyToClipboard } from '../hooks';
import { useNotification } from '../context';

function CopyButton({ text }) {
  const [copiedText, copy] = useCopyToClipboard();
  const { success, error } = useNotification();

  const handleCopy = async () => {
    const result = await copy(text);
    if (result) {
      success('Copied to clipboard!');
    } else {
      error('Failed to copy');
    }
  };

  return (
    <button onClick={handleCopy}>
      {copiedText ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

---

### 10. useKeyPress
**File:** `useKeyPress.js`

**Purpose:** Detect keyboard shortcuts

**Use Cases:**
- Keyboard shortcuts (Ctrl+S, Escape)
- Accessibility
- Quick actions

**Example:**
```jsx
import { useKeyPress, useKeyCombo } from '../hooks';

function SearchComponent() {
  const [isOpen, setIsOpen] = useState(false);

  // Detect Escape key
  useKeyPress('Escape', () => setIsOpen(false));

  // Detect Ctrl+K
  useKeyCombo({ ctrl: true, key: 'k' }, (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  return (
    <div>
      <p>Press Ctrl+K to open search</p>
      {isOpen && <SearchModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

---

### 11. useIntersectionObserver
**File:** `useIntersectionObserver.js`

**Purpose:** Detect element visibility in viewport

**Use Cases:**
- Lazy loading images
- Infinite scroll
- Animate on scroll

**Example:**
```jsx
import { useIntersectionObserver, useInfiniteScroll } from '../hooks';

function LazyImage({ src }) {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.5
  });

  return (
    <div ref={ref}>
      {isVisible ? (
        <img src={src} alt="Lazy loaded" />
      ) : (
        <div className="placeholder">Loading...</div>
      )}
    </div>
  );
}

function InfiniteList() {
  const [items, setItems] = useState([]);
  const bottomRef = useInfiniteScroll(() => {
    // Load more items
    loadMoreItems().then(newItems => {
      setItems([...items, ...newItems]);
    });
  });

  return (
    <div>
      {items.map(item => <Item key={item.id} {...item} />)}
      <div ref={bottomRef}>Loading more...</div>
    </div>
  );
}
```

---

## Best Practices

### 1. Import from index
```jsx
// ✅ Good - Import from index
import { useDebounce, useToggle, useForm } from '../hooks';

// ❌ Bad - Individual imports
import { useDebounce } from '../hooks/useDebounce';
import { useToggle } from '../hooks/useToggle';
```

### 2. Combine hooks when needed
```jsx
function SearchWithPagination() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [data, setData] = useState([]);
  
  const filteredData = data.filter(item =>
    item.name.includes(debouncedSearch)
  );
  
  const { currentData, ...pagination } = usePagination(filteredData, 10);
  
  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <DataTable data={currentData} />
      <Pagination {...pagination} />
    </>
  );
}
```

### 3. Use with contexts
```jsx
import { useAuth } from '../context';
import { useLocalStorage } from '../hooks';

function Component() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useLocalStorage(
    `preferences-${user.id}`,
    {}
  );
  
  // Preferences are automatically saved to localStorage
  // and unique per user
}
```

### 4. Cleanup properly
Most hooks handle cleanup automatically, but be aware:
```jsx
// useEffect cleanup is automatic in all hooks
// useClickOutside removes event listeners on unmount
// useKeyPress removes keyboard listeners on unmount
// useIntersectionObserver disconnects observer on unmount
```

---

## Performance Tips

1. **Use debounce for expensive operations**
   ```jsx
   const debouncedSearch = useDebounce(searchTerm, 500);
   ```

2. **Memoize async functions**
   ```jsx
   const fetchData = useCallback(async () => {
     return await api.getData();
   }, []);
   
   const { data } = useAsync(fetchData);
   ```

3. **Use pagination for large lists**
   ```jsx
   const { currentData } = usePagination(largeArray, 25);
   ```

4. **Lazy load images**
   ```jsx
   const [ref, isVisible] = useIntersectionObserver();
   return (
     <div ref={ref}>
       {isVisible && <HeavyComponent />}
     </div>
   );
   ```

---

## Common Patterns

### Search with Debounce
```jsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchAPI(debouncedSearch);
  }
}, [debouncedSearch]);
```

### Modal Management
```jsx
const [isOpen, { toggle, setFalse }] = useToggle(false);
const ref = useClickOutside(setFalse);

useKeyPress('Escape', setFalse);
```

### Form with Persistence
```jsx
const [draft, setDraft] = useLocalStorage('form-draft', {});

const { values, handleChange, handleSubmit } = useForm(
  draft,
  async (values) => {
    await submitForm(values);
    setDraft({}); // Clear draft on success
  }
);

// Auto-save draft
useEffect(() => {
  setDraft(values);
}, [values, setDraft]);
```

---

## File Structure

```
src/
├── hooks/
│   ├── useDebounce.js
│   ├── useLocalStorage.js
│   ├── useAsync.js
│   ├── useForm.js
│   ├── useClickOutside.js
│   ├── useWindowSize.js
│   ├── useToggle.js
│   ├── usePagination.js
│   ├── useCopyToClipboard.js
│   ├── useKeyPress.js
│   ├── useIntersectionObserver.js
│   ├── index.js
│   └── README.md
```

---

## Testing Hooks

When testing components that use these hooks:

```jsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useToggle } from '../hooks';

test('useToggle', () => {
  const { result } = renderHook(() => useToggle(false));
  
  expect(result.current[0]).toBe(false);
  
  act(() => {
    result.current[1].toggle();
  });
  
  expect(result.current[0]).toBe(true);
});
```

---

## Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)