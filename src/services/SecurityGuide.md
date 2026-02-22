# 🔐 Security Implementation Guide - Barangay Document System

Complete guide to secure your barangay document issuance system.

---

## 🎯 Security Overview

Your system currently needs improvements in these areas:

### **Current Vulnerabilities:**
1. ❌ Plain text passwords in database
2. ❌ No password hashing
3. ❌ Missing CSRF protection
4. ❌ No rate limiting
5. ❌ XSS vulnerabilities possible
6. ❌ No input sanitization
7. ❌ Missing API key rotation
8. ❌ No audit logging for sensitive operations
9. ❌ Session management needs improvement
10. ❌ No file upload validation

### **Security Improvements We'll Implement:**
1. ✅ Password hashing with bcrypt
2. ✅ JWT authentication tokens
3. ✅ Input sanitization
4. ✅ XSS protection
5. ✅ CSRF tokens
6. ✅ Rate limiting
7. ✅ Secure session management
8. ✅ File upload validation
9. ✅ Audit logging
10. ✅ Environment variable protection

---

## 📋 Table of Contents

1. [Password Security](#password-security)
2. [Authentication Enhancement](#authentication-enhancement)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [XSS & CSRF Protection](#xss--csrf-protection)
5. [Rate Limiting](#rate-limiting)
6. [File Upload Security](#file-upload-security)
7. [Audit Logging](#audit-logging)
8. [Environment Variables](#environment-variables)
9. [API Security](#api-security)
10. [Session Security](#session-security)

---

## 1. Password Security

### Problem:
Currently storing passwords as plain text: `password_hash: 'Admin@123'`

### Solution:
Implement proper password hashing with bcrypt

### Implementation:

#### Install Dependencies:
```bash
npm install bcryptjs jsonwebtoken
```

#### Create Password Service:
`src/services/passwordService.js`

```javascript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // Higher = more secure but slower

/**
 * Hash a password
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
};
```

#### Update AuthContext to use hashing:
```javascript
// In AuthContext.jsx
import { hashPassword, verifyPassword } from '../services/passwordService';

const login = async (email, password) => {
  try {
    setLoading(true);
    setError(null);

    // Fetch user from database
    const user = await db.users.getByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password hash
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Create audit log
    await db.logs.create({
      user_id: user.id,
      action: 'login',
      details: { email, timestamp: new Date().toISOString() }
    });

  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
};
```

#### Migration Script for Existing Users:
`scripts/migratePasswords.js`

```javascript
import { db } from '../services/supabaseClient';
import { hashPassword } from '../services/passwordService';

async function migratePasswords() {
  try {
    // Get all users
    const users = await db.users.getAll();
    
    console.log(`Migrating ${users.length} user passwords...`);
    
    for (const user of users) {
      // Hash the existing plain text password
      const hashedPassword = await hashPassword(user.password_hash);
      
      // Update user with hashed password
      await db.users.update(user.id, {
        password_hash: hashedPassword
      });
      
      console.log(`✓ Migrated password for ${user.email}`);
    }
    
    console.log('✅ All passwords migrated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migratePasswords();
```

---

## 2. Authentication Enhancement

### Implement JWT Tokens

#### Create Token Service:
`src/services/tokenService.js`

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Verify token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Decode token without verification
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};
```

---

## 3. Input Validation & Sanitization

### Already Implemented!
Your `validationService.js` has good foundations. Let's enhance it:

#### Enhanced Validation Service:
```javascript
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize all object values
 */
export const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Validate against SQL injection
 */
export const validateNoSQLInjection = (input) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=|UNION|HAVING|JOIN)/i
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Comprehensive input validation
 */
export const validateInput = (value, rules = {}) => {
  const errors = [];
  
  // Required check
  if (rules.required && !value) {
    errors.push('This field is required');
  }
  
  if (!value) return { isValid: errors.length === 0, errors };
  
  // Min length
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength}`);
  }
  
  // Max length
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength}`);
  }
  
  // Pattern match
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format');
  }
  
  // SQL injection check
  if (rules.noSQL && !validateNoSQLInjection(value)) {
    errors.push('Invalid characters detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeHTML(value)
  };
};
```

---

## 4. XSS & CSRF Protection

### Install DOMPurify:
```bash
npm install dompurify
npm install @types/dompurify
```

### Create CSRF Service:
`src/services/csrfService.js`

```javascript
/**
 * Generate CSRF token
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store CSRF token
 */
export const setCSRFToken = (token) => {
  sessionStorage.setItem('csrf_token', token);
};

/**
 * Get CSRF token
 */
export const getCSRFToken = () => {
  let token = sessionStorage.getItem('csrf_token');
  
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
 * Add CSRF token to request
 */
export const addCSRFToRequest = (options = {}) => {
  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': getCSRFToken()
    }
  };
};

export default {
  generateCSRFToken,
  getCSRFToken,
  verifyCSRFToken,
  addCSRFToRequest
};
```

---

## 5. Rate Limiting

### Create Rate Limiter:
`src/services/rateLimiter.js`

```javascript
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Check if action is allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Filter out old attempts
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentAttempts.length >= this.maxAttempts) {
      return {
        allowed: false,
        retryAfter: Math.ceil((recentAttempts[0] + this.windowMs - now) / 1000)
      };
    }
    
    // Add new attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return {
      allowed: true,
      remaining: this.maxAttempts - recentAttempts.length
    };
  }

  /**
   * Reset attempts for a key
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Clear all attempts
   */
  clearAll() {
    this.attempts.clear();
  }
}

// Create rate limiters for different actions
export const loginRateLimiter = new RateLimiter(5, 900000); // 5 attempts per 15 min
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per min
export const fileUploadRateLimiter = new RateLimiter(10, 3600000); // 10 uploads per hour

export default RateLimiter;
```

### Use in Login:
```javascript
// In AuthContext.jsx
import { loginRateLimiter } from '../services/rateLimiter';

const login = async (email, password) => {
  // Check rate limit
  const rateCheck = loginRateLimiter.isAllowed(email);
  
  if (!rateCheck.allowed) {
    throw new Error(
      `Too many login attempts. Please try again in ${rateCheck.retryAfter} seconds.`
    );
  }
  
  try {
    // ... existing login logic ...
    
    // On successful login, reset rate limit
    loginRateLimiter.reset(email);
    
  } catch (err) {
    // Failed login - rate limit still applies
    throw err;
  }
};
```

---

## 6. File Upload Security

### Create Secure File Upload Service:
`src/services/secureFileUpload.js`

```javascript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate file upload
 */
export const validateFileUpload = (file) => {
  const errors = [];
  
  // Check file exists
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF');
  }
  
  // Check filename
  const filename = file.name;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    errors.push('Filename contains invalid characters');
  }
  
  // Check for double extensions
  if ((filename.match(/\./g) || []).length > 1) {
    errors.push('Multiple file extensions not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  const baseName = filename.replace(/^.*[\\\/]/, '');
  
  // Remove special characters except dot, dash, underscore
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Generate unique name
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = sanitized.split('.').pop();
  const nameWithoutExt = sanitized.replace(/\.[^/.]+$/, '');
  
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
};

/**
 * Secure file upload
 */
export const secureFileUpload = async (file, folder = 'uploads') => {
  // Validate file
  const validation = validateFileUpload(file);
  
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Sanitize filename
  const safeFilename = sanitizeFilename(file.name);
  
  // Create FormData
  const formData = new FormData();
  formData.append('file', file, safeFilename);
  formData.append('folder', folder);
  
  // Upload (implement your upload logic here)
  // This is a placeholder - replace with actual upload
  return {
    success: true,
    filename: safeFilename,
    url: `/uploads/${folder}/${safeFilename}`
  };
};

export default {
  validateFileUpload,
  sanitizeFilename,
  secureFileUpload
};
```

---

## 7. Audit Logging

### Enhanced Audit Logger:
`src/services/auditLogger.js`

```javascript
import { db } from './supabaseClient';

/**
 * Log security event
 */
export const logSecurityEvent = async (event) => {
  try {
    await db.logs.create({
      user_id: event.userId,
      action: event.action,
      table_name: event.tableName,
      record_id: event.recordId,
      old_values: event.oldValues,
      new_values: event.newValues,
      ip_address: event.ipAddress || await getClientIP(),
      severity: event.severity || 'info',
      details: {
        ...event.details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Log authentication attempt
 */
export const logAuthAttempt = async (email, success, reason = null) => {
  await logSecurityEvent({
    action: success ? 'login_success' : 'login_failed',
    severity: success ? 'info' : 'warning',
    details: {
      email,
      reason,
      success
    }
  });
};

/**
 * Log data access
 */
export const logDataAccess = async (userId, tableName, recordId, action) => {
  await logSecurityEvent({
    userId,
    action: `${action}_${tableName}`,
    tableName,
    recordId,
    severity: 'info'
  });
};

/**
 * Log sensitive operation
 */
export const logSensitiveOperation = async (userId, operation, details) => {
  await logSecurityEvent({
    userId,
    action: operation,
    severity: 'high',
    details
  });
};

/**
 * Get client IP (placeholder - implement server-side)
 */
const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

export default {
  logSecurityEvent,
  logAuthAttempt,
  logDataAccess,
  logSensitiveOperation
};
```

---

## 8. Environment Variables

### Secure .env file:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# JWT Secret (generate with: openssl rand -base64 32)
VITE_JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Encryption Key (generate with: openssl rand -base64 32)
VITE_ENCRYPTION_KEY=your_encryption_key_min_32_chars

# Session
VITE_SESSION_TIMEOUT=3600000
VITE_SESSION_SECRET=your_session_secret

# Rate Limiting
VITE_RATE_LIMIT_MAX=100
VITE_RATE_LIMIT_WINDOW=60000

# File Upload
VITE_MAX_FILE_SIZE=5242880
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Feature Flags
VITE_ENABLE_2FA=false
VITE_ENABLE_EMAIL_VERIFICATION=true

# Production
NODE_ENV=production
```

---

## 9. Session Security

### Secure Session Manager:
`src/services/sessionManager.js`

```javascript
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT = 5 * 60 * 1000; // 5 minutes before timeout

class SessionManager {
  constructor() {
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.timeoutId = null;
    this.warningId = null;
    
    this.startSession();
  }

  startSession() {
    this.updateActivity();
    this.setupListeners();
    this.startTimeout();
  }

  setupListeners() {
    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), true);
    });
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.startTimeout();
  }

  startTimeout() {
    // Clear existing timeouts
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);

    // Set warning timeout
    this.warningId = setTimeout(() => {
      if (!this.warningShown) {
        this.showWarning();
        this.warningShown = true;
      }
    }, SESSION_TIMEOUT - WARNING_TIMEOUT);

    // Set session timeout
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, SESSION_TIMEOUT);
  }

  showWarning() {
    // Show warning modal
    if (window.confirm('Your session will expire in 5 minutes. Continue?')) {
      this.updateActivity();
    }
  }

  handleTimeout() {
    // Clear session
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Redirect to login
    window.location.href = '/login?reason=session_expired';
  }

  extendSession() {
    this.updateActivity();
  }

  endSession() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);
  }
}

export const sessionManager = new SessionManager();

export default SessionManager;
```

---

## 10. Quick Security Checklist

### Immediate Actions:

```bash
# 1. Install security packages
npm install bcryptjs jsonwebtoken dompurify

# 2. Update .env with strong secrets
# Generate strong secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Hash existing passwords
# Run migration script

# 4. Enable HTTPS in production
# Use Vercel, Netlify, or configure your server

# 5. Add security headers
# Configure in vite.config.js or server
```

### Configuration Updates:

**vite.config.js:**
```javascript
export default defineConfig({
  // ... existing config
  server: {
    https: true, // Enable HTTPS in dev
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000'
    }
  }
});
```

---

## ✅ Implementation Priority

### Phase 1 (Critical - Do Now):
1. ✅ Hash passwords with bcrypt
2. ✅ Implement rate limiting on login
3. ✅ Sanitize all user inputs
4. ✅ Add CSRF tokens
5. ✅ Secure environment variables

### Phase 2 (Important - This Week):
6. ✅ Implement JWT tokens
7. ✅ Add session management
8. ✅ File upload validation
9. ✅ Audit logging
10. ✅ XSS protection

### Phase 3 (Enhancement - This Month):
11. ✅ Two-factor authentication
12. ✅ Email verification
13. ✅ Password reset flow
14. ✅ Security monitoring
15. ✅ Penetration testing

---

This guide provides enterprise-level security for your barangay system! 🔐