import QRCode from 'qrcode';

/**
 * QR Code Service
 * Handles all QR code generation and parsing operations
 */

/**
 * Generate QR code data for a resident
 * BEST PRACTICE: Only store the ID and type. The scanner will use this ID to fetch the full profile.
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
    errorCorrectionLevel: 'L', // 'L' ensures dots are bigger and easier to scan!
    type: 'image/png',
    quality: 1.0,
    margin: 4, // Keeps your required white border 'Quiet Zone'
    color: {
      dark: '#000000', // Pure black for maximum scanner contrast
      light: '#ffffff'
    },
    width: 300,
    ...options
  };

  try {
    const qrDataURL = await QRCode.toDataURL(data, defaultOptions);
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Parse QR code data
 */
export const parseQRData = (qrString) => {
  try {
    return JSON.parse(qrString);
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

/**
 * Validate QR code data
 */
export const validateQRData = (qrData) => {
  if (!qrData || typeof qrData !== 'object') {
    return false;
  }

  // Updated to only check for the fields we are actually generating now
  return (
    qrData.type === 'barangay_resident' &&
    !!qrData.id
  );
};

/**
 * Generate downloadable QR code
 */
export const downloadQRCode = async (data, filename = 'qr-code.png') => {
  try {
    // CRITICAL FIX: Decreased width to 400px so web-based scanners can read it perfectly without browser downscaling blur
    const qrDataURL = await generateQRCodeImage(data, { width: 400 });
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

export default {
  generateQRData,
  generateQRCodeImage,
  parseQRData,
  validateQRData,
  downloadQRCode,
  dataURLtoBlob
};