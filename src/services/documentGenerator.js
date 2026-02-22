import jsPDF from 'jspdf';
import { format } from 'date-fns';

import brgyLogo from '../assets/brgy.2-icon.png';
import calambaSeal from '../assets/Calamba,_Laguna_Seal.svg.png'; 

/**
 * Convert image URL to base64 data URL
 */
const getImageDataUrl = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '';
  try {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  } catch (error) {
    return '';
  }
};

/**
 * Replace template variables with actual data
 */
const replaceVariables = (template, data) => {
  if (!template) return '';
  let result = template;
  const variables = template.match(/\{\{([^}]+)\}\}/g);
  
  if (variables && variables.length > 0) {
    variables.forEach(variable => {
      const key = variable.replace(/\{\{|\}\}/g, '').trim();
      
      // FIX 1: Prevent this function from erasing our special thumbprint marker!
      if (key === 'thumbprint_boxes') return;
      
      const value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
      result = result.split(variable).join(value);
    });
  }
  return result;
};

/**
 * Format addresses and calculate residency
 */
const formatAddress = (resident) => {
  const parts = [];
  if (resident.house_number) parts.push(resident.house_number);
  if (resident.street) parts.push(resident.street);
  if (resident.purok) parts.push(`Purok ${resident.purok}`);
  if (resident.barangay) parts.push(`Barangay ${resident.barangay}`);
  return parts.join(', ');
};

const formatFullAddress = (resident) => {
  const baseAddress = formatAddress(resident);
  return `${baseAddress}, ${resident.city_municipality || 'Cabuyao'}, ${resident.province || 'Laguna'}`;
};

const calculateResidencyYears = (createdAt) => {
  if (!createdAt) return '0';
  try {
    const years = new Date().getFullYear() - new Date(createdAt).getFullYear();
    return Math.max(0, years).toString();
  } catch (error) {
    return '0';
  }
};

/**
 * Clean and process template content for PDF rendering
 */
const processTemplateContent = (content) => {
  if (!content) return '';
  let processed = content;
  
  // FIX 2: Translate HTML paragraphs into exact PDF line breaks
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  processed = processed.replace(/<\/(p|div|h[1-6])>/gi, '\n\n'); // End of paragraph = double space
  processed = processed.replace(/<[^>]*>/g, ''); // Strip remaining HTML
  processed = processed.replace(/&nbsp;/gi, ' ');
  
  // Trim spaces on each line and reduce massive gaps down to standard double-spacing
  const lines = processed.split('\n').map(line => line.trim());
  processed = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  
  return processed.trim();
};

/**
 * Prepare template data from resident and settings
 */
export const prepareTemplateData = (resident = {}, settings = {}, additionalData = {}) => {
  try {
    const nameParts = [resident.first_name, resident.middle_name, resident.last_name, resident.suffix].filter(Boolean);
    const fullName = nameParts.join(' ').trim() || 'N/A';
    
    return {
      id: resident.id || '',
      first_name: resident.first_name || '',
      middle_name: resident.middle_name || '',
      last_name: resident.last_name || '',
      suffix: resident.suffix || '',
      full_name: fullName,
      age: calculateAge(resident.date_of_birth),
      date_of_birth: resident.date_of_birth ? format(new Date(resident.date_of_birth), 'MMMM dd, yyyy') : '',
      place_of_birth: resident.place_of_birth || '',
      gender: resident.gender || '',
      civil_status: resident.civil_status || '',
      nationality: resident.nationality || 'Filipino',
      house_number: resident.house_number || '',
      street: resident.street || '',
      purok: resident.purok || '',
      barangay: resident.barangay || '',
      city_municipality: resident.city_municipality || 'Cabuyao',
      province: resident.province || 'Laguna',
      zip_code: resident.zip_code || '',
      address: formatAddress(resident),
      full_address: formatFullAddress(resident),
      mobile_number: resident.mobile_number || '',
      email: resident.email || '',
      occupation: resident.occupation || '',
      monthly_income: resident.monthly_income || '',
      voter_status: resident.voter_status ? 'Yes' : 'No',
      pwd_status: resident.pwd_status ? 'Yes' : 'No',
      senior_citizen: resident.senior_citizen ? 'Yes' : 'No',
      barangay_name: settings.barangay_name || resident.barangay || '',
      barangay_chairman: settings.barangay_chairman || '',
      barangay_kagawad_list: settings.barangay_kagawad_list || '',
      city: settings.city_municipality || resident.city_municipality || 'Cabuyao',
      province_name: settings.province || resident.province || 'Laguna',
      region: settings.region || 'Region IV-A',
      contact_number: settings.contact_number || '',
      email_address: settings.email_address || '',
      date_issued: format(new Date(), 'MMMM dd, yyyy'),
      date_issued_short: format(new Date(), 'MM/dd/yyyy'),
      year: format(new Date(), 'yyyy'),
      residency_years: calculateResidencyYears(resident.created_at),
      ...additionalData
    };
  } catch (error) {
    console.error('Error preparing data:', error);
    throw new Error('Failed to prepare template data');
  }
};

/**
 * Generate PDF document from template
 */
export const generatePDFDocument = async (templateContent, data, documentName = 'document.pdf') => {
  try {
    const processedContent = replaceVariables(templateContent, data);
    const [logoBase64, calambaBase64] = await Promise.all([
      getImageDataUrl(brgyLogo),
      getImageDataUrl(calambaSeal)
    ]);
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // --- HEADER ---
    let currentY = 15;
    const logoSize = 28;
    
    doc.addImage(logoBase64, 'PNG', 25, currentY, logoSize, logoSize);
    doc.addImage(calambaBase64, 'PNG', pageWidth - 25 - logoSize, currentY, logoSize, logoSize);
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    doc.text('Republic of the Philippines', pageWidth / 2, currentY + 5, { align: 'center' });
    doc.text(`Province of ${data.province_name || 'Laguna'}`, pageWidth / 2, currentY + 10, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`CITY OF ${(data.city || 'CABUYAO').toUpperCase()}`, pageWidth / 2, currentY + 16, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const barangayText = data.barangay_name ? `Barangay ${data.barangay_name}` : 'Barangay';
    doc.text(barangayText, pageWidth / 2, currentY + 21, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('OFFICE OF THE BARANGAY CHAIRMAN', pageWidth / 2, currentY + 35, { align: 'center' });
    
    currentY += 40;
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    // --- CONTENT ---
    currentY += 15;
    let cleanContent = processTemplateContent(processedContent);
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    const lineHeight = 6;
    
    // Custom renderer to apply paragraph spacing accurately
    const drawFormattedText = (text, startY) => {
      let y = startY;
      const paragraphs = text.split('\n');
      paragraphs.forEach(p => {
        if (p === '') {
          y += lineHeight; // Empty line = paragraph gap
        } else {
          const lines = doc.splitTextToSize(p, contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * lineHeight; 
        }
      });
      return y;
    };

    // FIX 3: Accurately calculate Right-aligned Boxes & Left-aligned Text
    if (cleanContent.includes('{{thumbprint_boxes}}')) {
      const parts = cleanContent.split('{{thumbprint_boxes}}');
      
      // 1. Draw all text BEFORE the thumbprints
      if (parts[0]) {
        currentY = drawFormattedText(parts[0], currentY);
      }
      
      // 2. Draw Thumbprints locked to the RIGHT margin
      currentY += 5; // Add a small gap before boxes
      const boxY = currentY; 
      const boxSize = 25;
      const rightMarginLimit = pageWidth - margin;
      
      const rightBoxX = rightMarginLimit - boxSize;
      const leftBoxX = rightBoxX - boxSize - 10; // 10mm gap between boxes

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      // Left Box
      doc.rect(leftBoxX, boxY, boxSize, boxSize);
      doc.setFontSize(8);
      doc.setFont('times', 'bold');
      doc.text('LEFT THUMB', leftBoxX + (boxSize/2), boxY + boxSize + 4, { align: 'center' });

      // Right Box
      doc.rect(rightBoxX, boxY, boxSize, boxSize);
      doc.text('RIGHT THUMB', rightBoxX + (boxSize/2), boxY + boxSize + 4, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('times', 'normal');

      // 3. Draw text AFTER the thumbprints locked to the LEFT margin (starting at same height as boxes)
      if (parts[1]) {
        const textAfterY = drawFormattedText(parts[1], boxY); 
        // Set the final Y position to whichever is lower: the signature text, or the bottom of the boxes
        currentY = Math.max(textAfterY, boxY + boxSize + 15);
      } else {
        currentY = boxY + boxSize + 15;
      }
      
    } else {
      // If no boxes are requested, draw normally
      currentY = drawFormattedText(cleanContent, currentY);
    }
    
    // --- FOOTER ---
    const footerY = pageHeight - 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Not valid without official dry seal.', pageWidth / 2, footerY, { align: 'center' });
    
    if (data.contact_number || data.email_address) {
      const contactParts = [];
      if (data.contact_number) contactParts.push(data.contact_number);
      if (data.email_address) contactParts.push(data.email_address);
      doc.text(`Contact: ${contactParts.join(' | ')}`, pageWidth / 2, footerY + 5, { align: 'center' });
    }
    
    return { blob: doc.output('blob'), dataURL: doc.output('dataurlstring'), fileName: documentName };
  } catch (error) {
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

/**
 * Download PDF to user's device
 */
export const downloadPDF = (pdfBlob, fileName = 'document.pdf') => {
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    throw error;
  }
};

/**
 * Preview PDF in new tab with fallback to download if popups are blocked
 */
export const previewPDF = (pdfBlob, fallbackFileName = 'Document_Preview.pdf') => {
  try {
    const url = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.download = fallbackFileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } else {
      newWindow.onload = () => setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    throw new Error('Failed to open preview or download document.');
  }
};

export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
};

export const validateTemplate = (templateContent) => {
  if (!templateContent || templateContent.trim().length === 0) return { valid: false, error: 'Template content is empty' };
  return { valid: true, error: null };
};

export const validateResidentData = (resident) => {
  const required = ['first_name', 'last_name', 'barangay'];
  const missing = required.filter(field => !resident[field]);
  if (missing.length > 0) return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  return { valid: true, error: null };
};

export default {
  prepareTemplateData, generatePDFDocument, downloadPDF, previewPDF, 
  blobToBase64, replaceVariables, validateTemplate, validateResidentData
};