import QRCode from 'qrcode';

/**
 * QR Code Service
 * Handles all QR code generation and parsing operations
 */

/**
 * Generate QR code data object for a resident
 * BEST PRACTICE: Only store the ID and type to keep blocks big and scannable.
 */
export const generateQRData = (resident) => {
  const qrData = {
    id: resident.id,
    type: 'barangay_resident'
  };
  
  return JSON.stringify(qrData);
};

/**
 * Generate QR code image as data URL
 */
export const generateQRCodeImage = async (data, options = {}) => {
  const defaultOptions = {
    errorCorrectionLevel: 'L', // <-- FIX 1: 'L' makes the dots much bigger
    type: 'image/jpeg',        // <-- FIX 2: JPEG prevents transparency bugs in the web scanner
    quality: 1.0,
    margin: 2,                 // <-- FIX 3: Perfect quiet zone width for html5-qrcode
    color: {
      dark: '#000000', 
      light: '#ffffff'
    },
    width: 300,                // <-- FIX 4: Perfect resolution so the browser canvas doesn't blur it
    ...options
  };

  try {
    const qrDataURL = await QRCode.toDataURL(data, defaultOptions);
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Parse QR code data string
 */
export const parseQRData = (qrString) => {
  try {
    const parsed = JSON.parse(qrString);
    return parsed;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

/**
 * Validate QR code data structure
 */
export const validateQRData = (qrData) => {
  if (!qrData || typeof qrData !== 'object') {
    return { valid: false, error: 'Invalid QR data format' };
  }

  if (qrData.type !== 'barangay_resident') {
    return { valid: false, error: 'Invalid QR code type' };
  }

  // UPDATED: We only check for ID now since we removed the dense text
  if (!qrData.id) {
    return { valid: false, error: 'Missing required fields' };
  }

  return { valid: true };
};

/**
 * Download QR code as image file
 */
export const downloadQRCode = async (data, filename = 'resident-qr.jpg') => { // Default to .jpg
  try {
    // Generate a perfectly sized image strictly for downloading
    const qrDataURL = await generateQRCodeImage(data, { width: 300, margin: 2 });
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = filename.replace('.png', '.jpg'); // Ensure it saves as jpg
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw error;
  }
};

/**
 * Convert data URL to Blob
 */
export const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

/**
 * Generate QR code as canvas element
 */
export const generateQRCanvas = async (data, options = {}) => {
  const canvas = document.createElement('canvas');
  
  try {
    await QRCode.toCanvas(canvas, data, {
      errorCorrectionLevel: 'L', // Applied fixes here as well
      margin: 2, 
      color: {
        dark: '#000000', 
        light: '#ffffff'
      },
      width: 300,
      ...options
    });
    
    return canvas;
  } catch (error) {
    console.error('Error generating QR canvas:', error);
    throw error;
  }
};

export default {
  generateQRData,
  generateQRCodeImage,
  parseQRData,
  validateQRData,
  downloadQRCode,
  dataURLtoBlob,
  generateQRCanvas
};