import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { validateField } from '../../services/security/inputSanitizer';
import { Input } from '../common';
import RichTextTemplateEditor from './RichTextTemplateEditor'; // NEW: Import the Word-like editor
import { Save, X, Layout } from 'lucide-react';
import './TemplateForm.css';

const TemplateForm = ({ template = null, onSubmit, onCancel, submitting = false }) => {
  const { settings } = useSettings(); 
  
  // Since we are moving back to HTML text instead of JSON Arrays, we just load the string directly
  let initialContent = '';
  if (template?.template_content) {
    // Safety check: If the old template was saved as a JSON array from the Drag/Drop, clear it out.
    if (template.template_content.startsWith('[')) {
      initialContent = '<p><em>Template reset. Please re-type using the new editor.</em></p>';
    } else {
      initialContent = template.template_content;
    }
  }

  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    template_code: template?.template_code || '',
    description: template?.description || '',
    template_content: initialContent, // Now holds HTML string
    required_fields: template?.required_fields 
      ? (Array.isArray(template.required_fields) 
          ? template.required_fields.join(', ') 
          : template.required_fields)
      : '',
    is_active: template?.is_active ?? true
  });

  const [errors, setErrors] = useState({});

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

  // Callback for the Quill Editor
  const handleEditorChange = (newHtmlContent) => {
    setFormData(prev => ({
      ...prev,
      template_content: newHtmlContent
    }));
    
    if (errors.template_content) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.template_content;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nameValidation = validateField(formData.template_name, { required: true, minLength: 3, maxLength: 100 });
    if (!nameValidation.isValid) newErrors.template_name = nameValidation.errors[0];

    const codeValidation = validateField(formData.template_code, { required: true, pattern: /^[A-Z_]+$/, patternMessage: 'Code must be uppercase letters and underscores only (e.g., BRGY_CLEARANCE)' });
    if (!codeValidation.isValid) newErrors.template_code = codeValidation.errors[0];

    // Validate that the canvas isn't empty (Quill leaves <p><br></p> when empty)
    if (!formData.template_content || formData.template_content === '<p><br></p>') {
      newErrors.template_content = "Template content cannot be empty.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const fieldsArray = formData.required_fields
      ? formData.required_fields.split(',').map(f => f.trim()).filter(f => f.length > 0)
      : [];

    const finalPayload = {
      ...formData,
      required_fields: fieldsArray
    };

    await onSubmit(finalPayload);
  };

  return (
    <>
      <div className="workspace-header">
        <div className="workspace-header-left">
          <Layout size={20} />
          <span>{template ? 'Edit Document Template' : 'New Document Template'}</span>
        </div>
        <div className="workspace-dynamic-title">
          {formData.template_name ? formData.template_name.toUpperCase() : 'UNTITLED DOCUMENT'}
        </div>
        <div className="workspace-header-right">
          <button type="button" className="btn-icon" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="workspace-body" style={{ padding: '20px', overflowY: 'auto' }}>
        <form id="template-form" onSubmit={handleSubmit}>
          
          {/* Metadata Section */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
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
            <div style={{ flex: 1 }}>
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
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              Description
            </label>
            <input 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Brief description of this template" 
              className="form-control"
            />
          </div>

          {/* NEW Rich Text Editor */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              Document Editor <span style={{ color: '#ef4444' }}>*</span>
            </label>
            
            <RichTextTemplateEditor 
              value={formData.template_content} 
              onChange={handleEditorChange} 
            />
            
            {errors.template_content && <span style={{ color: '#ef4444', fontSize: '13px', display: 'block', marginTop: '10px' }}>{errors.template_content}</span>}
          </div>

          <div className="workspace-footer" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
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
    </>
  );
};

export default TemplateForm;