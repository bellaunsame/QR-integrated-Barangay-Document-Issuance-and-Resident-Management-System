import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

/**
 * Send QR code to resident via email
 */
// NOTE: We no longer need the qrCodeDataURL parameter because we generate a live link!
export const sendQRCodeEmail = async (resident) => {
  try {
    // 1. Create the simplified data object that matches our new scanner logic
    const qrData = JSON.stringify({
      id: resident.id,
      type: 'barangay_resident'
    });

    // 2. Generate a live, Gmail-friendly URL for the QR Code
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&margin=10`;

    const templateParams = {
      to_email: resident.email,
      subject: `Your ${resident.barangay || 'Barangay'} QR Code`,
      header_text: `Your official Barangay QR Code has been generated.`,
      name: `${resident.first_name} ${resident.last_name}`,
      time: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      message: `Please present this QR code at the Barangay Hall for fast document processing. You can long-press or right-click the image above to save it to your phone.`,
      
      // 3. We use the live URL here so email clients like Gmail render it perfectly
      qr_code_html: `<img src="${qrImageUrl}" style="max-width: 250px; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: white;" alt="Your Resident QR Code" />`
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('QR Email sent successfully!', response.status, response.text);
    return { success: true };
  } catch (error) {
    console.error('Error sending QR email:', error);
    throw error;
  }
};

/**
 * Send document ready notification
 */
export const sendDocumentReadyEmail = async (resident, documentType) => {
  try {
    const templateParams = {
      to_email: resident.email,
      subject: `Your ${documentType} is Ready`,
      header_text: `A document notification for ${resident.first_name} has been generated.`,
      name: `${resident.first_name} ${resident.last_name}`,
      time: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      message: `Your requested ${documentType} has been processed and is now ready for pickup at the barangay office. Please bring a valid ID when claiming your document.`,
      qr_code_html: "" // Leave blank for regular notifications so no broken image appears
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('Notification Email sent successfully!', response.status, response.text);
    return { success: true };
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
};

export const isEmailConfigured = () => {
  return !!(EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey);
};

export default {
  sendQRCodeEmail,
  sendDocumentReadyEmail,
  isEmailConfigured
};