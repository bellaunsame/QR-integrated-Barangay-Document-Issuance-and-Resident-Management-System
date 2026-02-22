/**
 * Services Index
 * Central export point for all service modules
 */

export { supabase, db } from './supabaseClient';

export {
  generateQRData,
  generateQRCodeImage,
  parseQRData,
  validateQRData,
  downloadQRCode,
  dataURLtoBlob,
  generateQRCanvas
} from './qrCodeService';

export {
  sendQRCodeEmail,
  sendDocumentReadyEmail,
  isEmailConfigured
} from './emailService';

export {
  prepareTemplateData,
  generatePDFDocument,
  downloadPDF,
  previewPDF,
  blobToBase64
} from './documentGenerator';

export {
  uploadToGoogleDrive,
  createGDriveFolder,
  deleteFromGoogleDrive,
  getGDriveFile,
  listGDriveFiles,
  isGDriveConfigured
} from './gdriveService';

export {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateResident,
  validateUser,
  validateTemplate,
  sanitizeInput,
  validateDateRange,
  validateFileUpload
} from './validationService';

export {
  getDashboardStats,
  getRequestsByDateRange,
  getMostRequestedDocuments,
  getAverageProcessingTime,
  getMonthlyStats,
  getUserActivitySummary,
  generateAnalyticsReport,
  exportToCSV
} from './analyticsService';