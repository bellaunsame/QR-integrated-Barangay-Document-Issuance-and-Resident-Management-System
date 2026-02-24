import { generateQRData, generateQRCodeImage } from './qrCodeService';
import idBackground from '../assets/id-bg.png'; 

// --- HELPER: Load an image onto the canvas ---
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const generateResidentIDImage = async (resident) => {
  try {
    const canvas = document.createElement('canvas');
    // High-resolution Postcard Size (1200x800 pixels)
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // 1. Draw the background
    const bgImg = await loadImage(idBackground);
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Defines starting X position and the absolute max width the text can take
    // QR code starts at X=780, so a max width of 620 leaves plenty of blank space between them.
    const textStartX = 100;
    const strictMaxWidth = 620; 

    // 2. Add the Resident's Name
    ctx.font = 'bold 70px "Times New Roman", Times, serif';
    ctx.fillStyle = '#164e63'; // Dark slate/teal color
    const fullName = `${resident.first_name} ${resident.middle_name ? resident.middle_name.charAt(0) + '.' : ''} ${resident.last_name} ${resident.suffix || ''}`.trim();
    
    // 4th parameter (strictMaxWidth) squishes text ONLY if it's too long
    ctx.fillText(fullName, textStartX, 350, strictMaxWidth); 

    // 3. Add Address & Contact (FIXED: Smaller font size instead of wrapping)
    ctx.font = 'normal 22px Arial, sans-serif'; // Reduced from 30px to 22px
    ctx.fillStyle = '#334155'; // Dark gray
    
    const address = `${resident.full_address}, ${resident.barangay}`;
    
    // Draw Address
    ctx.fillText(address, textStartX, 420, strictMaxWidth);

    // Draw Contact Number below it
    ctx.fillText(resident.mobile_number || 'No contact provided', textStartX, 460, strictMaxWidth);

    // 4. Generate and place the QR Code
    const qrData = generateQRData(resident);
    const qrCodeBase64 = await generateQRCodeImage(qrData);
    const qrImg = await loadImage(qrCodeBase64);
    
    // Position the QR code on the right side.
    ctx.drawImage(qrImg, 780, 220, 320, 320); 

    // 5. Convert Canvas to a JPEG Blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    
    return {
      blob,
      fileName: `${resident.last_name}_Brgy_ID.jpg`
    };

  } catch (error) {
    console.error('Error generating ID image:', error);
    throw error;
  }
};

export const downloadResidentID = async (resident) => {
  const { blob, fileName } = await generateResidentIDImage(resident);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};