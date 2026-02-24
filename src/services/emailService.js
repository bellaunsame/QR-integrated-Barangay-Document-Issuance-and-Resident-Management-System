import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

export const sendQRCodeEmail = async (resident, idImageUrl = null) => {
  try {
    let emailHtml = '';

    if (idImageUrl) {
      // FIXED: Added a direct URL download button because many mobile email apps block long-pressing on HTML images.
      emailHtml = `
        <div style="text-align: center; background-color: #f8fafc; padding: 20px; border-radius: 12px; font-family: Arial, sans-serif;">
          <h3 style="color: #334155; margin-bottom: 15px;">Your Digital Barangay ID</h3>
          
          <img src="${idImageUrl}" style="width: 100%; max-width: 550px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;" alt="Resident ID Card" />
          
          <br/>
          
          <a href="${idImageUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            📥 Tap Here to Download ID
          </a>
          
          <p style="color: #64748b; font-size: 13px; margin-top: 15px; line-height: 1.5;">
            (Depending on your email app, you may need to tap the blue button above to open the image in your browser before saving it to your phone's gallery.)
          </p>
        </div>
      `;
    } else {
      const qrData = JSON.stringify({ id: resident.id, type: 'barangay_resident' });
      const basicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&margin=10`;
      emailHtml = `<img src="${basicQrUrl}" style="max-width: 250px; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px;" alt="QR Code" />`;
    }

    const templateParams = {
      to_email: resident.email,
      subject: `Your ${resident.barangay || 'Barangay'} ID Card & QR Code`,
      header_text: `Your official Barangay credentials are ready.`,
      name: `${resident.first_name} ${resident.last_name}`,
      time: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      message: `Please present this ID at the Barangay Hall for fast document processing.`,
      qr_code_html: emailHtml
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending QR email:', error);
    throw error;
  }
};

export const sendDocumentReadyEmail = async (resident, documentType) => {
  try {
    const templateParams = {
      to_email: resident.email,
      subject: `Your ${documentType} is Ready`,
      header_text: `A document notification for ${resident.first_name} has been generated.`,
      name: `${resident.first_name} ${resident.last_name}`,
      time: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      message: `Your requested ${documentType} has been processed and is now ready for pickup at the barangay office. Please bring a valid ID when claiming your document.`,
      qr_code_html: "" 
    };

    const response = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams, EMAILJS_CONFIG.publicKey);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const isEmailConfigured = () => !!(EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey);
export default { sendQRCodeEmail, sendDocumentReadyEmail, isEmailConfigured };