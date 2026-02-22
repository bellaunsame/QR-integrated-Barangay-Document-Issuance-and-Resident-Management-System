import DOMPurify from 'dompurify';

/**
 * --- SECURITY & SANITIZATION ---
 */

// Basic text-only sanitize (Prevents XSS)
export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []  // Strip all attributes
  });
};

// Recursively sanitize all strings in an object
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

// Check for common SQL injection patterns
export const validateNoSQLInjection = (input) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=|UNION|HAVING|JOIN)/i
  ];
  return !sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * --- COMPREHENSIVE INPUT VALIDATION ---
 */

export const validateInput = (value, rules = {}) => {
  const errors = [];
  
  if (rules.required && !value) {
    errors.push('This field is required');
  }
  
  if (!value) return { isValid: errors.length === 0, errors };
  
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength}`);
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength}`);
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format');
  }
  
  if (rules.noSQL && !validateNoSQLInjection(value)) {
    errors.push('Invalid characters detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeHTML(value)
  };
};

/**
 * --- SPECIFIC DATA VALIDATORS ---
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone) => {
  // Philippine mobile: 09XX-XXX-XXXX or +639XXXXXXXXX
  const phoneRegex = /^(\+63|0)9\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

export const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  
  return { isValid: errors.length === 0, errors };
};

/**
 * --- DOMAIN-SPECIFIC VALIDATORS ---
 */

export const validateResident = (residentData) => {
  const errors = {};
  const required = ['first_name', 'last_name', 'date_of_birth', 'gender', 'civil_status', 'street', 'barangay'];
  
  required.forEach(field => {
    if (!residentData[field]) errors[field] = `${field.replace('_', ' ')} is required`;
  });

  if (residentData.date_of_birth) {
    const age = new Date().getFullYear() - new Date(residentData.date_of_birth).getFullYear();
    if (age < 0 || age > 150) errors.date_of_birth = 'Invalid date of birth';
  }

  if (residentData.email && !validateEmail(residentData.email)) errors.email = 'Invalid email format';
  if (residentData.mobile_number && !validatePhoneNumber(residentData.mobile_number)) errors.mobile_number = 'Invalid phone number format';

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateUser = (userData) => {
  const errors = {};
  if (!userData.email || !validateEmail(userData.email)) errors.email = 'Valid email is required';
  if (!userData.full_name) errors.full_name = 'Full name is required';
  if (!['admin', 'clerk', 'record_keeper'].includes(userData.role)) errors.role = 'Invalid role';
  
  if (userData.password) {
    const passVal = validatePassword(userData.password);
    if (!passVal.isValid) errors.password = passVal.errors.join(', ');
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * --- UTILITIES ---
 */

export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { isValid: false, error: 'Invalid dates' };
  if (start > end) return { isValid: false, error: 'Start date must be before end date' };
  return { isValid: true };
};

export const validateFileUpload = (file, options = {}) => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'] } = options;
  if (!file) return { isValid: false, error: 'No file provided' };
  if (file.size > maxSize) return { isValid: false, error: 'File size too large' };
  if (!allowedTypes.includes(file.type)) return { isValid: false, error: 'File type not allowed' };
  return { isValid: true };
};

export default {
  sanitizeHTML,
  sanitizeObject,
  validateInput,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateResident,
  validateUser,
  validateDateRange,
  validateFileUpload
};