import { useState } from 'react';
import { validateField } from '../../services/security/inputSanitizer';
import { Input } from '../common';
import { Save, X, Layout, Info } from 'lucide-react';
import './TemplateForm.css';

const MAX_CONTENT_LENGTH = 2000;

const TemplateForm = ({ template = null, onSubmit, onCancel, submitting = false }) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    template_code: template?.template_code || '',
    description: template?.description || '',
    template_content: template?.template_content || '',
    required_fields: template?.required_fields 
      ? (Array.isArray(template.required_fields) 
          ? template.required_fields.join(', ') 
          : template.required_fields)
      : '',
    is_active: template?.is_active ?? true
  });

  const [errors, setErrors] = useState({});

  // --- Template Variable Groups ---
  const templateVariableGroups = [
    {
      groupName: 'Resident Information',
      vars: [
        { name: 'full_name', description: 'Full name of resident' },
        { name: 'first_name', description: 'First name' },
        { name: 'middle_name', description: 'Middle name' },
        { name: 'last_name', description: 'Last name' },
        { name: 'age', description: 'Age' },
        { name: 'gender', description: 'Gender' },
        { name: 'civil_status', description: 'Civil status' },
        { name: 'occupation', description: 'Occupation' },
        { name: 'nationality', description: 'Nationality' }
      ]
    },
    {
      groupName: 'Location & Residency',
      vars: [
        { name: 'address', description: 'Complete address' },
        { name: 'barangay', description: 'Barangay name' },
        { name: 'city_municipality', description: 'City/Municipality' },
        { name: 'province', description: 'Province' },
        { name: 'residency_years', description: 'Years as resident' }
      ]
    },
    {
      groupName: 'Barangay Officials',
      vars: [
        { name: 'barangay_chairman', description: 'Chairman name' },
        { name: 'barangay_kagawad_list', description: 'List of Kagawads' },
        { name: 'barangay_name', description: 'Official barangay name' }
      ]
    },
    {
      groupName: 'Document Elements',
      vars: [
        { name: 'date_issued', description: 'Date issued (long format)' },
        { name: 'validation-date', description: 'Validation Date' },
        { name: 'purpose', description: 'Purpose of request' },
        { name: 'thumbprint_boxes', description: 'Thumbprint boxes (left & right)' }
      ]
    }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template_content');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.template_content || '';
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const placeholder = `{{${variable}}}`;
    
    if ((text.length + placeholder.length) <= MAX_CONTENT_LENGTH) {
      const newContent = before + placeholder + after;
      setFormData(prev => ({ ...prev, template_content: newContent }));

      setTimeout(() => {
        textarea.focus();
        const newPosition = start + placeholder.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nameValidation = validateField(formData.template_name, { required: true, minLength: 3, maxLength: 100 });
    if (!nameValidation.isValid) newErrors.template_name = nameValidation.errors[0];

    const codeValidation = validateField(formData.template_code, { required: true, pattern: /^[A-Z_]+$/, patternMessage: 'Code must be uppercase letters and underscores only (e.g., BRGY_CLEARANCE)' });
    if (!codeValidation.isValid) newErrors.template_code = codeValidation.errors[0];

    const contentValidation = validateField(formData.template_content, { required: true, minLength: 50, maxLength: MAX_CONTENT_LENGTH });
    if (!contentValidation.isValid) newErrors.template_content = contentValidation.errors[0];

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Parse required fields
    const fieldsArray = formData.required_fields
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    await onSubmit({
      ...formData,
      required_fields: fieldsArray
    });
  };

  // ============================================================================
  // FIXED PREVIEW RENDERING FUNCTION
  // ============================================================================
  const renderPreview = (content) => {
    if (!content) {
      return '<p style="color: #999; font-style: italic; text-align: center; padding: 40px 0;">No content to preview</p>';
    }
    
    let html = content;
    
    // 1. Convert newlines to <br> FIRST
    html = html.replace(/\n/g, '<br>');
    
    // 2. Replace thumbprint boxes with a Float-Right layout AND wrap it in a clearing div
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
    
    // 3. Highlight remaining variables
    html = html.replace(/\{\{(\w+)\}\}/g, 
      '<span style="background: #e3f2fd; padding: 2px 6px; border-radius: 3px; font-weight: 600; color: #1976d2; font-size: 0.95em;">{{$1}}</span>'
    );
    
    return html;
  };

  return (
    <>
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <Layout size={20} />
          <span>{template ? 'Edit Template' : 'New Template'}</span>
        </div>
        <div className="workspace-dynamic-title">
          {formData.template_name ? formData.template_name.toUpperCase() : 'UNTITLED DOCUMENT'}
        </div>
        <div className="workspace-header-right">
          <div className="workspace-tabs">
            <button type="button" className={activeTab === 'edit' ? 'active' : ''} onClick={() => setActiveTab('edit')}>
              Edit Source
            </button>
            <button type="button" className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>
              Live Preview
            </button>
          </div>
          <button type="button" className="btn-icon" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="workspace-body">
        {activeTab === 'edit' ? (
          <div className="workspace-split">
            {/* Variables Sidebar */}
            <aside className="workspace-sidebar">
              <div className="sidebar-info">
                <Info size={16} />
                <p>Click any variable to insert it at your cursor location.</p>
              </div>
              <div className="variables-accordion">
                {templateVariableGroups.map((group, idx) => (
                  <div key={idx} className="variable-group">
                    <h5>{group.groupName}</h5>
                    <div className="variable-badges">
                      {group.vars.map((variable) => (
                        <button
                          key={variable.name}
                          type="button"
                          className="variable-badge-btn"
                          onClick={() => insertVariable(variable.name)}
                          title={variable.description}
                          disabled={(formData.template_content.length + variable.name.length + 4) > MAX_CONTENT_LENGTH}
                        >
                          {`{{${variable.name}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Main Editor */}
            <div className="workspace-main">
              <form id="template-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <Input
                      label="Template Name"
                      name="template_name"
                      value={formData.template_name}
                      onChange={handleChange}
                      error={errors.template_name}
                      placeholder="e.g., Barangay Clearance"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <Input
                      label="System Code"
                      name="template_code"
                      value={formData.template_code}
                      onChange={handleChange}
                      error={errors.template_code}
                      placeholder="e.g., BRGY_CLEARANCE"
                      disabled={!!template}
                      required
                    />
                    {template && <span className="help-text" style={{fontSize: '12px', color: '#666'}}>Template code cannot be changed</span>}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" name="description" value={formData.description} 
                    onChange={handleChange} placeholder="Brief description of this template" className="form-control"
                  />
                </div>
                
                <div className="form-group editor-group">
                  <label>Document Content <span className="required">*</span></label>
                  <textarea
                    id="template_content"
                    name="template_content"
                    className={`modern-textarea ${errors.template_content ? 'error' : ''}`}
                    value={formData.template_content}
                    onChange={handleChange}
                    required
                    maxLength={MAX_CONTENT_LENGTH}
                    placeholder="Start drafting your document here..."
                    rows="15"
                  />
                  {errors.template_content && <span className="error-text">{errors.template_content}</span>}
                  <span className="char-count">
                    {formData.template_content.length} / {MAX_CONTENT_LENGTH} characters
                  </span>
                </div>

                {errors.submit && <div className="form-error">{errors.submit}</div>}

                <div className="workspace-footer">
                  <label className="checkbox-label">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                    <span>Set as Active Template</span>
                  </label>
                  <div className="footer-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><div className="spinner-small"></div>Saving...</> : <><Save size={18} /> {template ? 'Save Changes' : 'Create Template'}</>}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Preview Pane */
          <div className="workspace-preview" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '75vh' }}>
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '30px 20px', backgroundColor: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* --- FIXED PADDING HERE: Changed padding from 50mm 20mm to just 20mm --- */}
              <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '20mm', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: '2px', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.6', color: '#000', position: 'relative' }}>
                
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '3px solid #cc0000' }}>
                  <div style={{ position: 'absolute', left: '0', top: '0', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Brgy<br/>Logo</div>
                  <div style={{ position: 'absolute', right: '0', top: '0', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>City<br/>Seal</div>
                  <div style={{ paddingTop: '5px' }}>
                    <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Republic of the Philippines</div>
                    <div style={{ fontSize: '11pt', lineHeight: '1.3' }}>Province of Laguna</div>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '4px' }}>CITY OF CALAMBA</div>
                    <div style={{ fontSize: '11pt', marginTop: '4px' }}>Barangay Dos, Calamba City</div>
                  </div>
                  <div style={{ fontSize: '16pt', fontWeight: 'bold', marginTop: '30px', letterSpacing: '0.5px' }}>OFFICE OF THE BARANGAY CHAIRMAN</div>
                </div>
                
                <div style={{ textAlign: 'left', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(formData.template_content) }} />
                </div>
                
                <div style={{ position: 'absolute', bottom: '30px', left: '20mm', right: '20mm', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontStyle: 'italic', fontSize: '10pt', color: '#666', lineHeight: '1.4' }}>
                  <div>Not valid without official dry seal.</div>
                  <div style={{ marginTop: '4px' }}>Contact: [Contact Number] | [Email Address]</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '15px 20px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setActiveTab('edit')}>Back to Edit</button>
              <button className="btn btn-primary" onClick={onCancel}>Close Preview</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TemplateForm;