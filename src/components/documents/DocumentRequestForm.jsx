import { useState } from 'react';
import { validateField } from '../../services/security/inputSanitizer';
import { Save, X, FileText, User, AlignLeft } from 'lucide-react';

// 1. Import your official logos (Updated)
import calambaSeal from '../../assets/Calamba,_Laguna_Seal.svg.png';
import brgyLogo from '../../assets/brgy.2-icon.png';

import './DocumentRequestForm.css';

/**
 * DocumentRequestForm Component
 * Form for creating document requests
 */
const DocumentRequestForm = ({ 
  resident = null,
  residents = [],
  templates = [],
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    resident_id: resident?.id || '',
    template_id: '',
    request_type: '',
    purpose: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // --- ADDED: Handle input changes ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-fill request_type based on the template selected
    if (name === 'template_id') {
      const selectedTemp = templates.find(t => t.id === value);
      setFormData(prev => ({
        ...prev,
        template_id: value,
        request_type: selectedTemp ? selectedTemp.template_name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.resident_id) {
      newErrors.resident_id = 'Please select a resident';
    }

    if (!formData.template_id) {
      newErrors.template_id = 'Please select a document type';
    }

    // Correctly using validateField by passing 'text' as the validation type
    const purposeValidation = validateField(formData.purpose, 'text', {
      required: true,
      minLength: 10,
      maxLength: 500
    });

    if (!purposeValidation.isValid) {
      newErrors.purpose = purposeValidation.errors[0];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return; 
    }

    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        status: 'pending'
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // --- The same renderPreview logic from the Template Editor ---
  const renderPreview = (content) => {
    if (!content) return '';
    let html = content;
    html = html.replace(/\n/g, '<br>');
    const thumbprintHTML = `
      <div style="float: right; display: flex; gap: 20px; margin-top: -65px;">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; border: 1.5px solid #000; display: block;"></div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 10px; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1;">LEFT THUMB</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 80px; height: 80px; border: 1.5px solid #000; display: block;"></div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 10px; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1;">RIGHT THUMB</div>
        </div>
      </div>
      <div style="clear: both; margin-bottom: 20px;"></div>
    `;
    html = html.replace(/\{\{thumbprint_boxes\}\}/g, thumbprintHTML);
    html = html.replace(/\{\{(\w+)\}\}/g, '<span style="background: #e3f2fd; padding: 2px 6px; border-radius: 3px; font-weight: 600; color: #1976d2; font-size: 0.95em;">{{$1}}</span>');
    return html;
  };

  const selectedTemplateContent = templates.find(t => t.id === formData.template_id)?.template_content || '';

  return (
    <form onSubmit={handleSubmit} className="document-request-form">
      {/* Resident Information */}
      {resident ? (
        <div className="form-section resident-info">
          <div className="section-header">
            <User size={20} />
            <h3>Resident Information</h3>
          </div>
          <div className="resident-details">
            <div className="detail-item">
              <span className="label">Name:</span>
              <span className="value">
                {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Address:</span>
              <span className="value">
                {resident.street}, {resident.barangay}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-section">
          <div className="section-header">
            <User size={20} />
            <h3>Select Resident</h3>
          </div>
          <div className="form-group full-width">
            <select
              name="resident_id"
              value={formData.resident_id}
              onChange={handleChange}
              className={`form-control ${errors.resident_id ? 'error' : ''}`}
              required
            >
              <option value="">-- Choose a Resident --</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                </option>
              ))}
            </select>
            {errors.resident_id && (
              <span className="error-message">{errors.resident_id}</span>
            )}
          </div>
        </div>
      )}

      {/* Document Request Form */}
      <div className="form-section">
        <div className="section-header">
          <FileText size={20} />
          <h3>Document Request</h3>
        </div>

        <div className="form-grid">
          {/* Template Selection */}
          <div className="form-group full-width">
            <label htmlFor="template_id">
              Document Type <span className="required">*</span>
            </label>
            <select
              id="template_id"
              name="template_id"
              value={formData.template_id}
              onChange={handleChange}
              className={`form-control ${errors.template_id ? 'error' : ''}`}
              required
            >
              <option value="">Select document type...</option>
              {templates
                .filter(t => t.is_active)
                .map(template => (
                  <option key={template.id} value={template.id}>
                    {template.template_name}
                  </option>
                ))}
            </select>
            {errors.template_id && (
              <span className="error-message">{errors.template_id}</span>
            )}
          </div>

          {/* Purpose */}
          <div className="form-group full-width">
            <label htmlFor="purpose">
              <AlignLeft size={18} />
              Purpose <span className="required">*</span>
            </label>
            <textarea
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className={`form-control ${errors.purpose ? 'error' : ''}`}
              placeholder="Please state the purpose of this document request..."
              rows="5"
              required
            />
            <div className="field-info">
              <span className="char-count">
                {formData.purpose.length}/500 characters
              </span>
              <span className="hint">
                Minimum 10 characters required
              </span>
            </div>
            {errors.purpose && (
              <span className="error-message">{errors.purpose}</span>
            )}
          </div>

          {/* A4 Template Preview */}
          {formData.template_id && (
            <div className="form-group full-width">
              <div className="template-preview" style={{ background: '#e2e8f0', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="preview-header" style={{ width: '100%', marginBottom: '15px', color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} />
                  <span style={{ fontWeight: '600' }}>Document Layout Preview</span>
                </div>
                
                {/* A4 Paper Preview */}
                <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '210mm', padding: '20mm', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: '2px', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.6', color: '#000', position: 'relative' }}>
                  
                  <div style={{ position: 'relative', textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '3px solid #cc0000' }}>
                    <img src={brgyLogo} alt="Barangay Logo" style={{ position: 'absolute', left: '0', top: '0', width: '80px', height: '80px', objectFit: 'contain' }} />
                    <img src={calambaSeal} alt="City Seal" style={{ position: 'absolute', right: '0', top: '0', width: '80px', height: '80px', objectFit: 'contain' }} />

                    <div style={{ paddingTop: '5px' }}>
                      <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Republic of the Philippines</div>
                      <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Province of Laguna</div>
                      <div style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '4px' }}>CITY OF CALAMBA</div>
                      <div style={{ fontSize: '11pt', marginTop: '4px' }}>Barangay Dos, Calamba City</div>
                    </div>

                    <div style={{ fontSize: '16pt', fontWeight: 'bold', marginTop: '30px', letterSpacing: '0.5px' }}>
                      OFFICE OF THE BARANGAY CHAIRMAN
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'left', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                    <div dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplateContent) }} />
                  </div>
                  
                  <div style={{ marginTop: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', fontSize: '10pt', color: '#666', lineHeight: '1.4' }}>
                    <div>Not valid without official dry seal.</div>
                    <div style={{ marginTop: '4px' }}>Contact: [Contact Number] | [Email Address]</div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="form-error">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={20} />
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Submitting...
            </>
          ) : (
            <>
              <Save size={20} />
              Submit Request
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default DocumentRequestForm;