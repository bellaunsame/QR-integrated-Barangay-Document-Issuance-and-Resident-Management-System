/**
 * String Utilities
 * Common string manipulation and formatting functions
 */

/**
 * Capitalize first letter of string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Convert to title case
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to'];
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !smallWords.includes(word)) {
        return capitalize(word);
      }
      return word;
    })
    .join(' ');
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str, length = 50, suffix = '...') => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

/**
 * Truncate string to word boundary
 */
export const truncateWords = (str, wordCount = 10, suffix = '...') => {
  if (!str) return '';
  const words = str.split(' ');
  if (words.length <= wordCount) return str;
  return words.slice(0, wordCount).join(' ') + suffix;
};

/**
 * Convert to slug (URL-friendly string)
 */
export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Remove extra whitespace
 */
export const normalizeWhitespace = (str) => {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Remove all whitespace
 */
export const removeWhitespace = (str) => {
  if (!str) return '';
  return str.replace(/\s/g, '');
};

/**
 * Camel case to sentence case
 */
export const camelToSentence = (str) => {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Snake case to sentence case
 */
export const snakeToSentence = (str) => {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());
};

/**
 * Kebab case to sentence case
 */
export const kebabToSentence = (str) => {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());
};

/**
 * Format phone number (Philippine format)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  // Format: 09XX-XXX-XXXX
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Format: +639XX-XXX-XXXX
  if (cleaned.length === 12 && cleaned.startsWith('63')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  
  return phone;
};

/**
 * Format currency (Philippine Peso)
 */
export const formatCurrency = (amount, includeSymbol = true) => {
  if (amount === null || amount === undefined) return '';
  
  const formatted = Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return includeSymbol ? `₱${formatted}` : formatted;
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return Number(num).toLocaleString('en-PH');
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/[₱,\s]/g, '')) || 0;
};

/**
 * Generate initials from name
 */
/**
 * Generates a consistent hex color string from a text input
 * Useful for avatar backgrounds based on names
 */
export const stringToColor = (string) => {
  if (!string) return '#1e40af'; // Default Barangay Blue
  
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }
  
  return color;
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Highlight search term in text
 */
export const highlightText = (text, search) => {
  if (!text || !search) return text;
  const regex = new RegExp(`(${search})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

/**
 * Count words in string
 */
export const countWords = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).length;
};

/**
 * Count characters (excluding whitespace)
 */
export const countCharacters = (str) => {
  if (!str) return 0;
  return str.replace(/\s/g, '').length;
};

/**
 * Check if string contains only numbers
 */
export const isNumeric = (str) => {
  if (!str) return false;
  return /^\d+$/.test(str);
};

/**
 * Check if string contains only letters
 */
export const isAlpha = (str) => {
  if (!str) return false;
  return /^[a-zA-Z]+$/.test(str);
};

/**
 * Check if string is alphanumeric
 */
export const isAlphanumeric = (str) => {
  if (!str) return false;
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Generate random string
 */
export const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate random ID
 */
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
};

/**
 * Mask email
 */
export const maskEmail = (email) => {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  
  const maskedName = name.length > 2 
    ? `${name.charAt(0)}${'*'.repeat(name.length - 2)}${name.charAt(name.length - 1)}`
    : name;
  
  return `${maskedName}@${domain}`;
};

/**
 * Mask phone number
 */
export const maskPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  
  return `${cleaned.slice(0, 4)}${'*'.repeat(cleaned.length - 7)}${cleaned.slice(-3)}`;
};

/**
 * Extract numbers from string
 */
export const extractNumbers = (str) => {
  if (!str) return '';
  return str.replace(/\D/g, '');
};

/**
 * Remove HTML tags
 */
export const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Pluralize word
 */
export const pluralize = (count, singular, plural) => {
  if (!plural) plural = singular + 's';
  return count === 1 ? singular : plural;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default {
  capitalize,
  capitalizeWords,
  toTitleCase,
  truncate,
  truncateWords,
  slugify,
  normalizeWhitespace,
  removeWhitespace,
  camelToSentence,
  snakeToSentence,
  kebabToSentence,
  formatPhoneNumber,
  formatCurrency,
  formatNumber,
  parseCurrency,
  getInitials,
  highlightText,
  countWords,
  countCharacters,
  isNumeric,
  isAlpha,
  isAlphanumeric,
  generateRandomString,
  generateId,
  maskEmail,
  maskPhone,
  extractNumbers,
  stripHtml,
  pluralize,
  formatFileSize
};