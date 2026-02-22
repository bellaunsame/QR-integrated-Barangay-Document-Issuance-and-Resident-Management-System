/**
 * CSRF (Cross-Site Request Forgery) Protection Service
 * Generates and validates CSRF tokens to prevent CSRF attacks
 */

const CSRF_TOKEN_KEY = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Generate a secure random CSRF token
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store CSRF token in session storage
 */
export const setCSRFToken = (token) => {
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
};

/**
 * Get CSRF token from session storage
 * If no token exists, generate a new one
 */
export const getCSRFToken = () => {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = generateCSRFToken();
    setCSRFToken(token);
  }
  
  return token;
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (token) => {
  const storedToken = getCSRFToken();
  return token === storedToken;
};

/**
 * Create CSRF meta tag for HTML
 * (This was the missing function causing your SyntaxError)
 */
export const getCSRFMetaTag = () => {
  return `<meta name="csrf-token" content="${getCSRFToken()}">`;
};

/**
 * Add CSRF token to request headers
 */
export const addCSRFToRequest = (options = {}) => {
  return {
    ...options,
    headers: {
      ...options.headers,
      [CSRF_HEADER_NAME]: getCSRFToken()
    }
  };
};

/**
 * Add CSRF token to form data
 */
export const addCSRFToFormData = (formData) => {
  formData.append('csrf_token', getCSRFToken());
  return formData;
};

/**
 * Initialize CSRF protection
 * Call this when the app starts (App.jsx)
 */
export const initializeCSRF = () => {
  const token = getCSRFToken();
  
  // Add to meta tag if in browser for easier access by other scripts
  if (typeof document !== 'undefined') {
    let meta = document.querySelector('meta[name="csrf-token"]');
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);
    }
    
    meta.content = token;
  }

  console.log("🔐 CSRF Protection Initialized");
  return token;
};

/**
 * Rotate CSRF token
 * Recommended after sensitive operations like login
 */
export const rotateCSRFToken = () => {
  const newToken = generateCSRFToken();
  setCSRFToken(newToken);
  
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) meta.content = newToken;
  }
  
  return newToken;
};

/**
 * Clear CSRF token on logout
 */
export const clearCSRFToken = () => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Axios interceptor helper
 */
export const axiosCSRFInterceptor = (config) => {
  const token = getCSRFToken();
  
  if (config.headers) {
    config.headers[CSRF_HEADER_NAME] = token;
  }
  
  if (config.data instanceof FormData) {
    config.data.append('csrf_token', token);
  }
  
  return config;
};

// Default export including all named exports
export default {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  verifyCSRFToken,
  getCSRFMetaTag, // Included here for default export users
  addCSRFToRequest,
  addCSRFToFormData,
  initializeCSRF,
  rotateCSRFToken,
  clearCSRFToken,
  axiosCSRFInterceptor,
  CSRF_HEADER_NAME
};