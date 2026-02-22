/**
 * Security Services Index
 * Central export point for all security-related services
 */

// Import everything first to build the default export object
import * as passwordService from './passwordService';
import * as rateLimiter from './rateLimiter';
import * as csrfService from './csrfService';
import { sessionManager } from './sessionManager';
import * as inputSanitizer from './inputSanitizer';
import * as auditLogger from './auditLogger';

// 1. Named Exports (Allows: import { hashPassword } from './security')
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateRandomPassword
} from './passwordService';

export {
  loginRateLimiter,
  apiRateLimiter,
  fileUploadRateLimiter,
  passwordResetRateLimiter,
  qrGenerationRateLimiter,
  documentRequestRateLimiter
} from './rateLimiter';

export {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  verifyCSRFToken,
  addCSRFToRequest,
  addCSRFToFormData,
  getCSRFMetaTag, // Ensure this exists in csrfService.js!
  initializeCSRF,
  rotateCSRFToken,
  clearCSRFToken,
  axiosCSRFInterceptor,
  CSRF_HEADER_NAME
} from './csrfService';

export { sessionManager } from './sessionManager';

export {
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
} from './inputSanitizer';

export {
  logAuditEvent,
  logAuth,
  logDataAccess,
  logDataModification,
  logSecurityEvent,
  logCriticalEvent,
  queryAuditLogs,
  getSecuritySummary,
  exportAuditLogs,
  SEVERITY,
  ACTIONS
} from './auditLogger';

// 2. Default Export (Allows: import security from './security')
export default {
  password: {
    hash: passwordService.hashPassword,
    verify: passwordService.verifyPassword,
    validateStrength: passwordService.validatePasswordStrength,
    generateRandom: passwordService.generateRandomPassword
  },
  rateLimit: {
    login: rateLimiter.loginRateLimiter,
    api: rateLimiter.apiRateLimiter,
    fileUpload: rateLimiter.fileUploadRateLimiter,
    passwordReset: rateLimiter.passwordResetRateLimiter,
    qrGeneration: rateLimiter.qrGenerationRateLimiter,
    documentRequest: rateLimiter.documentRequestRateLimiter
  },
  csrf: {
    generate: csrfService.generateCSRFToken,
    get: csrfService.getCSRFToken,
    set: csrfService.setCSRFToken,
    verify: csrfService.verifyCSRFToken,
    initialize: csrfService.initializeCSRF,
    rotate: csrfService.rotateCSRFToken,
    clear: csrfService.clearCSRFToken,
    getMetaTag: csrfService.getCSRFMetaTag
  },
  session: sessionManager,
  input: {
    sanitize: inputSanitizer.sanitizeInput,
    sanitizeObject: inputSanitizer.sanitizeObject,
    validateEmail: inputSanitizer.validateEmail,
    validatePhone: inputSanitizer.validatePhone,
    validateName: inputSanitizer.validateName,
    validateAddress: inputSanitizer.validateAddress,
    validateDate: inputSanitizer.validateDate,
    validateField: inputSanitizer.validateField,
    validateForm: inputSanitizer.validateForm
  },
  audit: {
    log: auditLogger.logAuditEvent,
    logAuth: auditLogger.logAuth,
    logDataAccess: auditLogger.logDataAccess,
    logDataModification: auditLogger.logDataModification,
    logSecurityEvent: auditLogger.logSecurityEvent,
    logCriticalEvent: auditLogger.logCriticalEvent,
    query: auditLogger.queryAuditLogs,
    getSummary: auditLogger.getSecuritySummary,
    export: auditLogger.exportAuditLogs,
    SEVERITY: auditLogger.SEVERITY,
    ACTIONS: auditLogger.ACTIONS
  }
};