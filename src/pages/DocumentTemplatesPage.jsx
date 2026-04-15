import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { TemplateForm } from '../components/documents';
import { FileText, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import './DocumentTemplatesPage.css';

const DocumentTemplatesPage = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await db.templates.getAll();
      setTemplates(data || []);
    } catch (error) {
      toast.error('Failed to load templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    setSubmitting(true);
    try {
      if (editingTemplate) {
        await db.templates.update(editingTemplate.id, templateData);
        toast.success('Template updated successfully!');
      } else {
        await db.templates.create(templateData);
        toast.success('Template created successfully!');
      }
      await loadTemplates();
      closeModal();
    } catch (error) {
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        toast.error('Template code already exists. Please use a different code.');
      } else {
        toast.error('Failed to save template: ' + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Are you sure you want to delete "${template.template_name}"?`)) return;

    try {
      await db.templates.delete(template.id);
      toast.success('Template deleted successfully!');
      await loadTemplates();
    } catch (error) {
      const errorString = JSON.stringify(error).toLowerCase();
      const isForeignKeyError = errorString.includes('foreign key') || error.code === '23503';

      if (isForeignKeyError) {
        setTimeout(async () => {
          const confirmDeactivate = window.confirm(
            `"${template.template_name}" cannot be deleted because it has existing document requests tied to it.\n\nWould you like to DEACTIVATE it instead so it stops showing up in forms?`
          );
          if (confirmDeactivate) {
            await db.templates.update(template.id, { is_active: false });
            toast.success('Template deactivated successfully!');
            await loadTemplates();
          }
        }, 100);
      } else {
        toast.error('Failed to delete template: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const newStatus = !template.is_active;
      await db.templates.update(template.id, { is_active: newStatus });
      toast.success(`Template ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      await loadTemplates();
    } catch (error) {
      toast.error('Failed to update template status');
    }
  };

  const openAddModal = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  return (
    <div className="templates-page">
      
      {/* HEADER SECTION */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0' }}>Document Templates</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage and design customizable document templates</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openAddModal}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} /> Add New Template
        </button>
      </div>

      {/* CONTENT SECTION */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '4rem 2rem', background: 'white', borderRadius: '12px', marginTop: '2rem',
          border: '2px dashed #cbd5e1', textAlign: 'center'
        }}>
          <FileText size={64} style={{ color: '#94a3b8', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: '#334155', margin: '0 0 10px 0' }}>No templates yet</h3>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>Create your first document template to get started.</p>
          <button 
            onClick={openAddModal} 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px' }}
          >
            <Plus size={20} /> Create Template
          </button>
        </div>

      ) : (
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <div className="template-info">
                  <h3>{template.template_name}</h3>
                  <code>{template.template_code}</code>
                </div>
                <span className={`badge ${template.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="template-description">
                {template.description || 'No description provided'}
              </p>
              <div className="template-actions">
                <button className="btn-icon" onClick={() => handleEdit(template)} title="Edit Template">
                  <Edit2 size={18} />
                </button>
                <button 
                  className={`btn-icon ${template.is_active ? 'btn-secondary' : 'btn-success'}`} 
                  onClick={() => handleToggleActive(template)} 
                  title={template.is_active ? 'Deactivate' : 'Activate'}
                >
                  {template.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                </button>
                <button className="btn-icon btn-danger" onClick={() => handleDelete(template)} title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL WRAPPER */}
      {showModal && (
        <div 
          className="modal-overlay workspace-overlay" 
          onClick={closeModal}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            zIndex: 2147483647, /* The absolute maximum z-index allowed by browsers. Guaranteed to cover sidebar. */
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px' 
          }}
        >
          <div 
            className="workspace-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '850px', 
              maxHeight: 'calc(100vh - 40px)', 
              overflowY: 'auto',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <TemplateForm 
              template={editingTemplate} 
              onSubmit={handleSaveTemplate} 
              onCancel={closeModal} 
              submitting={submitting} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTemplatesPage;