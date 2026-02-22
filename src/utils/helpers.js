/**
 * Helper Utilities
 * Miscellaneous utility functions
 */

/**
 * Delay execution (async sleep)
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await sleep(delay * attempt);
    }
  }
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Deep merge objects
 */
export const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

/**
 * Check if value is object
 */
export const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (isObject(obj)) return Object.keys(obj).length === 0;
  return false;
};

/**
 * Pick properties from object
 */
export const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

/**
 * Omit properties from object
 */
export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Get nested property safely
 */
export const get = (obj, path, defaultValue = undefined) => {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return defaultValue;
  }

  return result;
};

/**
 * Set nested property
 */
export const set = (obj, path, value) => {
  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {};
    return acc[key];
  }, obj);
  target[lastKey] = value;
  return obj;
};

/**
 * Generate UUID v4
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

/**
 * Download file from URL
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download JSON as file
 */
export const downloadJSON = (data, filename = 'data.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  URL.revokeObjectURL(url);
};

/**
 * Parse JSON safely
 */
export const parseJSON = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Get query parameters from URL
 */
export const getQueryParams = (url = window.location.href) => {
  const params = {};
  const queryString = url.split('?')[1];
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  
  return params;
};

/**
 * Build query string from object
 */
export const buildQueryString = (params) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

/**
 * Detect device type
 */
export const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Detect browser
 */
export const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE';
  return 'Unknown';
};

/**
 * Check if online
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Get scroll position
 */
export const getScrollPosition = () => {
  return {
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop
  };
};

/**
 * Scroll to top
 */
export const scrollToTop = (smooth = true) => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  });
};

/**
 * Scroll to element
 */
export const scrollToElement = (element, offset = 0) => {
  const top = element.getBoundingClientRect().top + window.pageYOffset + offset;
  window.scrollTo({
    top,
    behavior: 'smooth'
  });
};

/**
 * Check if element is in viewport
 */
export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Generate color from string
 */
export const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 1) * 16777215);
  return '#' + color.toString(16).padStart(6, '0');
};

/**
 * Format percentage
 */
export const formatPercentage = (value, total, decimals = 0) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Clamp number between min and max
 */
export const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Map number from one range to another
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Round to decimal places
 */
export const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Check if value is between min and max
 */
export const isBetween = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Safe divide (returns 0 if divisor is 0)
 */
export const safeDivide = (dividend, divisor, defaultValue = 0) => {
  return divisor === 0 ? defaultValue : dividend / divisor;
};

export default {
  sleep,
  retry,
  debounce,
  throttle,
  deepClone,
  deepMerge,
  isObject,
  isEmpty,
  pick,
  omit,
  get,
  set,
  generateUUID,
  copyToClipboard,
  downloadFile,
  downloadJSON,
  parseJSON,
  getQueryParams,
  buildQueryString,
  getDeviceType,
  getBrowser,
  isOnline,
  getScrollPosition,
  scrollToTop,
  scrollToElement,
  isInViewport,
  stringToColor,
  formatPercentage,
  clamp,
  mapRange,
  roundTo,
  isBetween,
  safeDivide
};