/**
 * Enhanced Input Sanitization & Validation Service
 * Protects against XSS, SQL injection, and other attacks
 */

/**
 * Sanitize string input to prevent XSS attacks
 * 
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Encode special characters
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => map[char]);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized.trim();
};

/**
 * Deep sanitize object (all string values)
 * 
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validate against SQL injection patterns
 * 
 * @param {string} input - Input to validate
 * @returns {boolean} True if safe
 */
export const isNoSQLInjection = (input) => {
  if (typeof input !== 'string') return true;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(xp_|sp_)/i,
    /(\bHAVING\b|\bGROUP\s+BY\b)/i
  ];

  return !sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate email format
 * 
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  } else if (email.length > 254) {
    errors.push('Email is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(email)
  };
};

/**
 * Validate phone number (Philippine format)
 * 
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
export const validatePhone = (phone) => {
  const errors = [];
  
  // Remove common separators
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Philippine mobile: 09XX-XXX-XXXX or +639XX-XXX-XXXX
  const mobileRegex = /^(09|\+639)\d{9}$/;
  
  // Landline: (0XX) XXX-XXXX or 0XX-XXX-XXXX
  const landlineRegex = /^0\d{1,2}\d{7}$/;
  
  if (!phone) {
    errors.push('Phone number is required');
  } else if (!mobileRegex.test(cleaned) && !landlineRegex.test(cleaned)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: cleaned,
    formatted: formatPhoneNumber(cleaned)
  };
};

/**
 * Format phone number for display
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Mobile: 0917-123-4567
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  // International: +63 917 123 4567
  if (cleaned.startsWith('+639') && cleaned.length === 13) {
    return cleaned.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  
  return phone;
};

/**
 * Validate name (letters, spaces, hyphens only)
 * 
 * @param {string} name - Name to validate
 * @returns {Object} Validation result
 */
export const validateName = (name) => {
  const errors = [];
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-'.]+$/;
  
  if (!name) {
    errors.push('Name is required');
  } else if (!nameRegex.test(name)) {
    errors.push('Name contains invalid characters');
  } else if (name.length < 2) {
    errors.push('Name is too short');
  } else if (name.length > 100) {
    errors.push('Name is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(name)
  };
};

/**
 * Validate address
 * 
 * @param {string} address - Address to validate
 * @returns {Object} Validation result
 */
export const validateAddress = (address) => {
  const errors = [];
  
  if (!address) {
    errors.push('Address is required');
  } else if (address.length < 5) {
    errors.push('Address is too short');
  } else if (address.length > 500) {
    errors.push('Address is too long');
  } else if (!isNoSQLInjection(address)) {
    errors.push('Address contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(address)
  };
};

/**
 * Validate date (not in future, reasonable age)
 * 
 * @param {string} date - Date to validate
 * @returns {Object} Validation result
 */
export const validateDate = (date) => {
  const errors = [];
  const dateObj = new Date(date);
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 150, 0, 1);
  
  if (!date) {
    errors.push('Date is required');
  } else if (isNaN(dateObj.getTime())) {
    errors.push('Invalid date format');
  } else if (dateObj > today) {
    errors.push('Date cannot be in the future');
  } else if (dateObj < minDate) {
    errors.push('Date is too far in the past');
  }

  return {
    isValid: errors.length === 0,
    errors,
    date: dateObj
  };
};

/**
 * Comprehensive field validator
 * 
 * @param {any} value - Value to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export const validateField = (value, rules = {}) => {
  const errors = [];
  let sanitized = value;

  // Required check
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(rules.requiredMessage || 'This field is required');
    return { isValid: false, errors, sanitized };
  }

  // If not required and empty, skip other validations
  if (!value && !rules.required) {
    return { isValid: true, errors: [], sanitized: '' };
  }

  // Sanitize string inputs
  if (typeof value === 'string') {
    sanitized = sanitizeInput(value);
  }

  // Type-specific validation
  if (rules.type) {
    switch (rules.type) {
      case 'email':
        const emailResult = validateEmail(value);
        errors.push(...emailResult.errors);
        sanitized = emailResult.sanitized;
        break;

      case 'phone':
        const phoneResult = validatePhone(value);
        errors.push(...phoneResult.errors);
        sanitized = phoneResult.sanitized;
        break;

      case 'name':
        const nameResult = validateName(value);
        errors.push(...nameResult.errors);
        sanitized = nameResult.sanitized;
        break;

      case 'address':
        const addressResult = validateAddress(value);
        errors.push(...addressResult.errors);
        sanitized = addressResult.sanitized;
        break;

      case 'date':
        const dateResult = validateDate(value);
        errors.push(...dateResult.errors);
        break;
    }
  }

  // Length validation
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format');
  }

  // Custom validation
  if (rules.custom && typeof rules.custom === 'function') {
    const customResult = rules.custom(value);
    if (customResult !== true) {
      errors.push(customResult || 'Validation failed');
    }
  }

  // SQL injection check
  if (rules.noSQL !== false && !isNoSQLInjection(value)) {
    errors.push('Input contains potentially dangerous characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate entire form
 * 
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} Validation results
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  const sanitizedData = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(validationRules)) {
    const result = validateField(formData[field], rules);
    
    if (!result.isValid) {
      errors[field] = result.errors;
      isValid = false;
    }
    
    sanitizedData[field] = result.sanitized;
  }

  return {
    isValid,
    errors,
    sanitizedData
  };
};

export default {
  sanitizeInput,
  sanitizeObject,
  isNoSQLInjection,
  validateEmail,
  validatePhone,
  validateName,
  validateAddress,
  validateDate,
  validateField,
  validateForm,
  formatPhoneNumber
};