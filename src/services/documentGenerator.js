import jsPDF from 'jspdf';
import { format } from 'date-fns';

import brgyLogo from '../assets/brgy.2-icon.png';
import calambaSeal from '../assets/Calamba,_Laguna_Seal.svg.png'; 

const getImageDataUrl = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
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

const replaceVariables = (templateText, data) => {
  if (!templateText) return '';
  let result = templateText;
  const variables = templateText.match(/\{\{([^}]+)\}\}/g);
  
  if (variables && variables.length > 0) {
    variables.forEach(variable => {
      const key = variable.replace(/\{\{|\}\}/g, '').trim();
      if (key === 'thumbprint_boxes') return; 
      const value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
      result = result.split(variable).join(value);
    });
  }
  return result;
};

// --- ADDRESS LOGIC ---
const formatAddress = (resident) => {
  const parts = [];
  if (resident?.full_address) parts.push(resident.full_address);
  if (resident?.purok) {
    const purokText = resident.purok.toLowerCase().includes('purok') ? resident.purok : `Purok ${resident.purok}`;
    parts.push(purokText);
  }
  return parts.join(', ');
};

const formatFullAddress = (resident, city, province) => {
  const baseAddress = formatAddress(resident);
  let brgy = resident?.barangay || '';
  if (brgy && !brgy.toLowerCase().startsWith('brgy') && !brgy.toLowerCase().startsWith('barangay')) {
      brgy = `Barangay ${brgy}`;
  }
  
  const prov = province || resident?.province || '';
  const zip = resident?.zip_code ? ` ${resident.zip_code}` : '';
  const provinceWithZip = `${prov}${zip}`.trim();

  return [
    baseAddress, 
    brgy, 
    city || resident?.city_municipality, 
    provinceWithZip
  ].filter(Boolean).join(', ');
};

// --- PERFECT RESIDENCY LOGIC ---
// Extracts just the year (e.g. "2008") from "2008-12-23"
const getResidentSinceYear = (resident) => {
  if (resident?.residency_start_date) {
    try {
      return new Date(resident.residency_start_date).getFullYear().toString();
    } catch (e) {
      return resident.residency_start_date.substring(0, 4); // Fallback string slice
    }
  }
  
  // Fallback to the year the account was registered
  if (resident?.created_at) {
    return new Date(resident.created_at).getFullYear().toString();
  }
  return new Date().getFullYear().toString();
};

// Calculates the duration (e.g. "17") based on the start date
const calculateResidencyDuration = (resident) => {
  const startYear = Number(getResidentSinceYear(resident));
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - startYear).toString();
};

export const prepareTemplateData = (resident = {}, settings = {}, additionalData = {}) => {
  try {
    const getSet = (key, fallback) => {
      let val = null;
      if (Array.isArray(settings)) {
        const found = settings.find(s => s.setting_key === key);
        if (found && found.setting_value) val = found.setting_value;
      } else if (settings[key]) {
        val = settings[key];
      }
      return val && String(val).trim() !== '' ? String(val) : fallback;
    };

    const nameParts = [resident.first_name, resident.middle_name, resident.last_name, resident.suffix].filter(Boolean);
    const fullName = nameParts.join(' ').trim() || 'N/A';
    
    const city = getSet('city_municipality', resident.city_municipality || 'Calamba City');
    const province = getSet('province', resident.province || 'Laguna');
    const brgy = getSet('barangay_name', resident.barangay || '');

    const rawKagawads = getSet('barangay_kagawads', '');
    const kagawadList = rawKagawads.split('\n').filter(name => name.trim() !== '');

    const fullAddressString = resident.complete_address || resident.full_address || '';

    // Calculate EXACTLY from your database column
    const startYear = getResidentSinceYear(resident);
    const duration = calculateResidencyDuration(resident);

    const templateData = {
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
      
      complete_address: fullAddressString,
      full_address: fullAddressString, 
      address: fullAddressString,
      
      mobile_number: resident.mobile_number || '',
      email: resident.email || '',
      occupation: resident.occupation || '',
      monthly_income: resident.monthly_income || '',
      voter_status: resident.voter_status ? 'Yes' : 'No',
      pwd_status: resident.pwd_status ? 'Yes' : 'No',
      senior_citizen: resident.senior_citizen ? 'Yes' : 'No',
      
      barangay_name: brgy,
      barangay: brgy,
      barangay_chairman: getSet('barangay_chairman', ''),
      sk_chairman: getSet('sk_chairman', ''),
      
      all_kagawads_list: kagawadList.join('<br>'),
      barangay_kagawad_list: kagawadList.join('<br>'),

      city: city,
      city_municipality: city,
      province_name: province,
      province: province, 
      region: getSet('region', 'Region IV-A'),
      contact_number: getSet('contact_number', ''),
      email_address: getSet('email_address', ''),
      
      date_issued: format(new Date(), 'MMMM dd, yyyy'),
      date_issued_short: format(new Date(), 'MM/dd/yyyy'),
      year: format(new Date(), 'yyyy'),
      purpose: additionalData?.purpose || 'whatever legal purpose it may serve',
      
      // FINALLY! These will map perfectly based on "residency_start_date"
      resident_since: startYear, // Outputs: "2008"
      residency_duration: duration, // Outputs: "18" (or 17)
      residency_years: duration, // Keeping this so your old template doesn't break
      
      ...additionalData
    };

    kagawadList.forEach((name, index) => {
      templateData[`kagawad_${index + 1}`] = name;
    });

    return templateData;
  } catch (error) {
    console.error('Error preparing data:', error);
    throw new Error('Failed to prepare template data');
  }
};

export const generatePDFDocument = async (templateContent, data, documentName = 'document.pdf') => {
  try {
    const [logoBase64, calambaBase64] = await Promise.all([
      getImageDataUrl(brgyLogo),
      getImageDataUrl(calambaSeal)
    ]);
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let currentY = 15;
    const logoSize = 28;
    
    doc.addImage(logoBase64, 'PNG', margin, currentY, logoSize, logoSize);
    doc.addImage(calambaBase64, 'PNG', pageWidth - margin - logoSize, currentY, logoSize, logoSize);
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Republic of the Philippines', pageWidth / 2, currentY + 5, { align: 'center' });
    doc.text(`Province of ${data.province_name || 'Laguna'}`, pageWidth / 2, currentY + 10, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    
    const cleanCity = (data.city || 'CABUYAO').replace(/ City$/i, '').toUpperCase();
    doc.text(`CITY OF ${cleanCity}`, pageWidth / 2, currentY + 16, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let cleanBrgy = data.barangay_name || 'Barangay';
    if (!cleanBrgy.toLowerCase().startsWith('brgy') && !cleanBrgy.toLowerCase().startsWith('barangay')) {
        cleanBrgy = `Barangay ${cleanBrgy}`;
    }
    doc.text(cleanBrgy, pageWidth / 2, currentY + 21, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('OFFICE OF THE BARANGAY CHAIRMAN', pageWidth / 2, currentY + 35, { align: 'center' });
    
    currentY += 40;
    doc.setDrawColor(204, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY); 
    
    currentY += 15; 

    const htmlWithData = replaceVariables(templateContent, data);
    const preppedHtml = htmlWithData.replace(/\{\{thumbprint_boxes\}\}/g, '<thumbprints></thumbprints>');

    const parser = new DOMParser();
    const dom = parser.parseFromString(preppedHtml, 'text/html');

    const lineHeight = 6;
    doc.setFontSize(12);

    Array.from(dom.body.children).forEach(block => {
        if (block.tagName === 'THUMBPRINTS') {
            currentY += 10;
            const boxSize = 25;
            const rightBoxX = pageWidth - margin - boxSize;
            const leftBoxX = rightBoxX - boxSize - 10;

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);

            doc.rect(leftBoxX, currentY, boxSize, boxSize);
            doc.setFontSize(8);
            doc.setFont('times', 'bold');
            doc.text('LEFT THUMB', leftBoxX + (boxSize/2), currentY + boxSize + 4, { align: 'center' });

            doc.rect(rightBoxX, currentY, boxSize, boxSize);
            doc.text('RIGHT THUMB', rightBoxX + (boxSize/2), currentY + boxSize + 4, { align: 'center' });

            currentY += boxSize + 15;
            doc.setFontSize(12); 
            return;
        }

        if (block.textContent.trim() === '' && !block.querySelector('br') && !block.innerHTML.includes('&nbsp;')) return;
        if (block.innerHTML.trim() === '<br>' || block.innerHTML.trim() === '<br/>') {
            currentY += lineHeight;
            return;
        }

        let align = 'left';
        if (block.className.includes('ql-align-center') || block.style.textAlign === 'center' || block.align === 'center') align = 'center';
        if (block.className.includes('ql-align-right') || block.style.textAlign === 'right' || block.align === 'right') align = 'right';
        if (block.className.includes('ql-align-justify') || block.style.textAlign === 'justify' || block.align === 'justify') align = 'justify';

        let indentX = margin;
        if (block.className.includes('ql-indent-1')) indentX += 10;
        if (block.className.includes('ql-indent-2')) indentX += 20;

        let isList = block.tagName === 'UL' || block.tagName === 'OL';
        let items = isList ? Array.from(block.children) : [block];

        items.forEach((item, itemIndex) => {
            let tokens = []; 
            
            const extractTokens = (node, styles) => {
                if (node.nodeType === 3) { 
                    const text = node.textContent.replace(/\u00A0/g, ' '); 
                    const words = text.split(/(\s+)/);
                    words.forEach(w => {
                        if (w.length > 0) tokens.push({ text: w, ...styles });
                    });
                } else if (node.nodeType === 1) { 
                    if (node.tagName === 'BR') {
                        tokens.push({ isBreak: true });
                        return;
                    }
                    let newStyles = { ...styles };
                    if (['STRONG', 'B'].includes(node.tagName)) newStyles.bold = true;
                    if (['EM', 'I'].includes(node.tagName)) newStyles.italic = true;
                    if (['U'].includes(node.tagName)) newStyles.underline = true;
                    node.childNodes.forEach(c => extractTokens(c, newStyles));
                }
            };
            extractTokens(item, { bold: false, italic: false, underline: false });

            let prefix = '';
            let prefixWidth = 0;
            let currentIndent = indentX;

            if (isList) {
                prefix = block.tagName === 'UL' ? '• ' : `${itemIndex + 1}. `;
                doc.setFont('times', 'normal');
                prefixWidth = doc.getTextWidth(prefix);
                currentIndent += 10; 
            }

            const allowedWidth = contentWidth - (currentIndent - margin);
            let currentLineTokens = [];
            let currentLineWidth = 0;
            let isFirstLine = true;

            const renderLine = () => {
                if (currentLineTokens.length === 0) return;

                let xPos = currentIndent;
                let displayWidth = currentLineWidth;
                
                const lastToken = currentLineTokens[currentLineTokens.length - 1];
                if (lastToken && lastToken.text.trim() === '') {
                    doc.setFont('times', (lastToken.bold && lastToken.italic) ? 'bolditalic' : lastToken.bold ? 'bold' : lastToken.italic ? 'italic' : 'normal');
                    displayWidth -= doc.getTextWidth(lastToken.text);
                }

                if (align === 'center') xPos += (allowedWidth - displayWidth) / 2;
                if (align === 'right') xPos += (allowedWidth - displayWidth);

                if (isFirstLine && isList) {
                    doc.setFont('times', 'normal');
                    doc.text(prefix, xPos - prefixWidth, currentY);
                }

                currentLineTokens.forEach(t => {
                    let style = 'normal';
                    if (t.bold && t.italic) style = 'bolditalic';
                    else if (t.bold) style = 'bold';
                    else if (t.italic) style = 'italic';

                    doc.setFont('times', style);
                    doc.text(t.text, xPos, currentY);

                    let w = doc.getTextWidth(t.text);
                    if (t.underline) {
                        doc.setLineWidth(0.2);
                        doc.line(xPos, currentY + 1, xPos + w, currentY + 1);
                    }
                    xPos += w;
                });

                currentY += lineHeight;
                currentLineTokens = [];
                currentLineWidth = 0;
                isFirstLine = false;
            };

            tokens.forEach(t => {
                if (t.isBreak) {
                    renderLine();
                    return;
                }

                let style = 'normal';
                if (t.bold && t.italic) style = 'bolditalic';
                else if (t.bold) style = 'bold';
                else if (t.italic) style = 'italic';
                doc.setFont('times', style);

                let w = doc.getTextWidth(t.text);
                
                if (currentLineWidth + w > allowedWidth && t.text.trim() !== '') {
                    renderLine();
                }
                currentLineTokens.push(t);
                currentLineWidth += w;
            });
            
            renderLine();
        });
        
        currentY += 4; 
    });
    
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