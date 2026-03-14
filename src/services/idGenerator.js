import { generateQRData, generateQRCodeImage } from './qrCodeService';

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

    // ==========================================
    // 1. DRAW A BEAUTIFUL DIGITAL BACKGROUND
    // (No external image file needed, preventing 500 errors!)
    // ==========================================
    // Main Card Background (Subtle Gradient)
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Header Banner (Barangay Blue)
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, canvas.width, 160);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 55px "Arial", sans-serif';
    ctx.fillText('BARANGAY DOS', 100, 90);
    ctx.font = 'normal 30px "Arial", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('DIGITAL RESIDENT IDENTIFICATION', 100, 135);

    // Bottom Footer Banner
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 750, canvas.width, 50);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'normal 20px "Arial", sans-serif';
    ctx.fillText('This is an official digital record. Scan QR code to verify authenticity.', 100, 782);

    // ==========================================
    // 2. ADD RESIDENT DETAILS
    // ==========================================
    const textStartX = 100;
    const strictMaxWidth = 620; 

    ctx.font = 'bold 70px "Times New Roman", Times, serif';
    ctx.fillStyle = '#0f172a'; // Very dark blue/black
    const fullName = `${resident.first_name} ${resident.middle_name ? resident.middle_name.charAt(0) + '.' : ''} ${resident.last_name} ${resident.suffix || ''}`.trim();
    
    // Draw Name
    ctx.fillText(fullName, textStartX, 350, strictMaxWidth); 

    ctx.font = 'normal 26px Arial, sans-serif'; 
    ctx.fillStyle = '#475569'; // Slate gray
    
    // Draw Address
    const address = `${resident.full_address}, ${resident.barangay}`;
    ctx.fillText(address, textStartX, 430, strictMaxWidth);

    // Draw Contact
    ctx.fillText(`Contact: ${resident.mobile_number || 'N/A'}`, textStartX, 480, strictMaxWidth);
    
    // Draw Status
    ctx.fillStyle = '#059669'; // Green
    ctx.font = 'bold 24px Arial, sans-serif'; 
    ctx.fillText('STATUS: VERIFIED RESIDENT', textStartX, 540, strictMaxWidth);

    // ==========================================
    // 3. GENERATE AND PLACE THE QR CODE
    // ==========================================
    const qrData = generateQRData(resident);
    const qrCodeBase64 = await generateQRCodeImage(qrData, { width: 600, margin: 4 });
    const qrImg = await loadImage(qrCodeBase64);
    
    // Draw a white rounded box behind the QR code (The "Quiet Zone")
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.roundRect(760, 240, 360, 360, 20); 
    ctx.fill();

    // Reset shadow for the image
    ctx.shadowColor = 'transparent';

    // Position the QR code securely inside the white box
    ctx.drawImage(qrImg, 780, 260, 320, 320); 

    // ==========================================
    // 4. CONVERT TO DOWNLOADABLE BLOB
    // ==========================================
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.98));
    
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