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