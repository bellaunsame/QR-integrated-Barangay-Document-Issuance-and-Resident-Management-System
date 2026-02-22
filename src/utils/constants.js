/**
 * Application Constants
 * Centralized constants for the Barangay Document System
 */

/**
 * User Roles
 */
export const ROLES = {
  ADMIN: 'admin',
  CLERK: 'clerk',
  RECORD_KEEPER: 'record_keeper'
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.CLERK]: 'Barangay Clerk',
  [ROLES.RECORD_KEEPER]: 'Record Keeper'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'manage_users',
    'manage_settings',
    'manage_templates',
    'manage_residents',
    'process_documents',
    'view_audit_logs',
    'export_data'
  ],
  [ROLES.CLERK]: [
    'process_documents',
    'view_residents',
    'view_requests',
    'release_documents'
  ],
  [ROLES.RECORD_KEEPER]: [
    'manage_residents',
    'generate_qr',
    'view_requests',
    'send_qr_codes'
  ]
};

/**
 * Document Request Statuses
 */
export const REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  RELEASED: 'released'
};

export const STATUS_LABELS = {
  [REQUEST_STATUS.PENDING]: 'Pending',
  [REQUEST_STATUS.PROCESSING]: 'Processing',
  [REQUEST_STATUS.COMPLETED]: 'Completed',
  [REQUEST_STATUS.REJECTED]: 'Rejected',
  [REQUEST_STATUS.RELEASED]: 'Released'
};

export const STATUS_COLORS = {
  [REQUEST_STATUS.PENDING]: '#f59e0b',
  [REQUEST_STATUS.PROCESSING]: '#3b82f6',
  [REQUEST_STATUS.COMPLETED]: '#10b981',
  [REQUEST_STATUS.REJECTED]: '#ef4444',
  [REQUEST_STATUS.RELEASED]: '#059669'
};

/**
 * Civil Status Options
 */
export const CIVIL_STATUS = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
  ANNULLED: 'Annulled'
};

/**
 * Gender Options
 */
export const GENDER = {
  MALE: 'Male',
  FEMALE: 'Female'
};

/**
 * Validation Rules
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^(\+63|0)9\d{9}$/,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
};

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100
};

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_LONG: 'MMMM dd, yyyy',
  DISPLAY_SHORT: 'MM/dd/yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy h:mm a',
  TIME: 'h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss"
};

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  USER: 'user',
  AUTH_TOKEN: 'auth_token',
  SETTINGS: 'barangay_settings',
  THEME: 'theme',
  FONT_SIZE: 'fontSize',
  COMPACT_MODE: 'compactMode',
  RECENT_SEARCHES: 'recent_searches'
};

/**
 * API Endpoints (for future backend integration)
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify'
  },
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    UPDATE: '/api/users/:id',
    DELETE: '/api/users/:id'
  },
  RESIDENTS: {
    LIST: '/api/residents',
    CREATE: '/api/residents',
    UPDATE: '/api/residents/:id',
    DELETE: '/api/residents/:id',
    SEARCH: '/api/residents/search',
    QR: '/api/residents/:id/qr'
  },
  DOCUMENTS: {
    LIST: '/api/documents',
    CREATE: '/api/documents',
    UPDATE: '/api/documents/:id',
    PROCESS: '/api/documents/:id/process',
    RELEASE: '/api/documents/:id/release'
  },
  TEMPLATES: {
    LIST: '/api/templates',
    CREATE: '/api/templates',
    UPDATE: '/api/templates/:id',
    DELETE: '/api/templates/:id'
  }
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number format',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_DATE: 'Invalid date',
  FILE_TOO_LARGE: `File size must not exceed ${VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_FILE_TYPE: 'Invalid file type',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_ENTRY: 'This entry already exists'
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful',
  LOGOUT: 'Logged out successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
  SENT: 'Sent successfully',
  UPLOADED: 'Uploaded successfully',
  COPIED: 'Copied to clipboard'
};

/**
 * Feature Flags
 */
export const FEATURES = {
  EMAIL_QR: 'enable_email_qr',
  GOOGLE_DRIVE: 'enable_google_drive',
  SMS_NOTIFICATIONS: 'enable_sms',
  AUDIT_LOGS: 'enable_audit_logs',
  ANALYTICS: 'enable_analytics',
  EXPORT_DATA: 'enable_data_export'
};

/**
 * Theme Colors
 */
export const COLORS = {
  PRIMARY: '#3b82f6',
  PRIMARY_DARK: '#2563eb',
  PRIMARY_LIGHT: '#60a5fa',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
  GRAY: '#6b7280'
};

/**
 * Breakpoints (matching CSS)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
};

/**
 * Z-Index Layers
 */
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  NOTIFICATION: 1080
};

/**
 * Animation Durations (ms)
 */
export const ANIMATION = {
  FAST: 150,
  BASE: 300,
  SLOW: 500
};

/**
 * Default Settings
 */
export const DEFAULT_SETTINGS = {
  barangay_name: 'Barangay Sample',
  city_municipality: 'Sample City',
  province: 'Sample Province',
  contact_number: '123-4567',
  email_address: 'barangay@sample.local',
  enable_email_qr: 'true',
  documents_per_day_limit: '100',
  qr_expiry_days: '365'
};

/**
 * QR Code Configuration
 */
export const QR_CONFIG = {
  ERROR_CORRECTION: 'H',
  TYPE: 'image/png',
  QUALITY: 0.95,
  MARGIN: 1,
  WIDTH: 300,
  COLOR_DARK: '#1e40af',
  COLOR_LIGHT: '#ffffff'
};

/**
 * Document Template Variables
 */
export const TEMPLATE_VARIABLES = [
  { key: 'full_name', label: 'Full Name', description: 'Complete name of resident' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'suffix', label: 'Suffix', description: 'Jr., Sr., III, etc.' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'civil_status', label: 'Civil Status' },
  { key: 'address', label: 'Complete Address' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city_municipality', label: 'City/Municipality' },
  { key: 'province', label: 'Province' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'date_issued', label: 'Date Issued', description: 'Long format' },
  { key: 'date_issued_short', label: 'Date Issued Short', description: 'MM/DD/YYYY' },
  { key: 'purpose', label: 'Purpose', description: 'Purpose of document request' },
  { key: 'barangay_name', label: 'Official Barangay Name' },
  { key: 'contact_number', label: 'Barangay Contact Number' },
  { key: 'email_address', label: 'Barangay Email' }
];

/**
 * Route Paths
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  RESIDENTS: '/residents',
  DOCUMENTS: '/documents',
  TEMPLATES: '/templates',
  USERS: '/users',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  QR_SCAN: '/scan'
};

export default {
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  REQUEST_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  CIVIL_STATUS,
  GENDER,
  VALIDATION,
  PAGINATION,
  DATE_FORMATS,
  STORAGE_KEYS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURES,
  COLORS,
  BREAKPOINTS,
  Z_INDEX,
  ANIMATION,
  DEFAULT_SETTINGS,
  QR_CONFIG,
  TEMPLATE_VARIABLES,
  ROUTES
};