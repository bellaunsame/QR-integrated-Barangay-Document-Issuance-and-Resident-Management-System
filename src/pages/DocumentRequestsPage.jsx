import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { prepareTemplateData, generatePDFDocument, downloadPDF, previewPDF } from '../services/documentGenerator';

import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import emailjs from '@emailjs/browser'; 

// Security & Audit Imports
import { logDataModification, ACTIONS } from '../services/security/auditLogger';

// UI Components & Hooks
import { Modal, Pagination } from '../components/common'; 
import { usePagination } from '../hooks'; 
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import DocumentRequestDetails from '../components/documents/DocumentRequestDetails';
import { 
  Search, Eye, Download, CheckCircle, XCircle, Send, Plus, Archive, CheckSquare, Printer, RefreshCw, Edit, Copy, Ban
} from 'lucide-react';
import './DocumentRequestsPage.css';

const DocumentRequestsPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation(); 

  // --- SECURITY CHECK: Restrict View Only & Captain ---
  const canEdit = !['view_only', 'barangay_captain'].includes(user?.role);
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [residents, setResidents] = useState([]);
  
  // UI States
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null); 

  // Batch Processing State
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { 
    currentPage, 
    totalPages, 
    currentData: currentRequests, 
    goToPage 
  } = usePagination(filteredRequests, 5); 

  const itemsPerPage = 5;

  const triggerSidebarUpdate = () => {
    window.dispatchEvent(new Event('docs_updated'));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam) {
      setSelectedStatus(filterParam);
    } else {
      setSelectedStatus('all');
    }
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('document-requests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
          setTimeout(() => loadData(), 1000); 
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    filterRequests();
    setSelectedRequests([]); 
  }, [selectedStatus, searchTerm, requests]);

  const loadData = async () => {
    try {
      const [requestsData, templatesData, residentsData] = await Promise.all([
        db.requests.getAll(),
        db.templates.getAll(),
        db.residents.getAll()
      ]);
      setRequests(requestsData);
      setTemplates(templatesData);
      setResidents(residentsData);
      triggerSidebarUpdate();
    } catch (error) {
      console.error('Data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];
    
    if (selectedStatus === 'all') {
      filtered = filtered.filter(req => !['archived', 'rejected', 'revoked'].includes(req.status));
    } else if (selectedStatus === 'archived') {
      filtered = filtered.filter(req => ['archived', 'rejected', 'revoked'].includes(req.status));
    } else {
      filtered = filtered.filter(req => req.status === selectedStatus);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.resident?.first_name.toLowerCase().includes(search) ||
        req.resident?.last_name.toLowerCase().includes(search) ||
        req.request_type.toLowerCase().includes(search)
      );
    }
    setFilteredRequests(filtered);
  };

  // --- ACTIONS (Secured by canEdit) ---

  const handleEditRequest = async (request) => {
    if (!canEdit) return;
    const newPurpose = window.prompt("Update the purpose for this request:", request.purpose || '');
    if (newPurpose === null || newPurpose === request.purpose) return;

    try {
      const toastId = toast.loading('Updating request...');
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, purpose: newPurpose } : r)); 
      await supabase.from('document_requests').update({ purpose: newPurpose }).eq('id', request.id);
      await logDataModification(user.id, 'document_requests', request.id, 'DOCUMENT_UPDATED', { purpose: request.purpose }, { purpose: newPurpose });
      toast.success('Request updated!', { id: toastId });
    } catch (error) {
      toast.error(`Edit failed: ${error.message}`);
    }
  };

  const handleRenewDocument = async (request) => {
    if (!canEdit) return;
    if (!window.confirm(`Renew this request for ${request.resident?.first_name}?`)) return;
    try {
      const toastId = toast.loading('Renewing document...');
      await db.requests.create({
        resident_id: request.resident_id || request.resident?.id,
        template_id: request.template_id || request.template?.id,
        request_type: request.request_type,
        purpose: request.purpose,
        status: 'pending',
        created_by: user.id, 
        created_at: new Date().toISOString()
      });
      toast.success('Renewed! Check the Pending tab.', { id: toastId });
      await loadData(); 
    } catch (error) {
      toast.error(`Renewal failed: ${error.message}`);
    }
  };

  const handleRevokeDocument = async (request) => {
    if (!canEdit) return;
    const reason = window.prompt('Enter reason for revoking this document:');
    if (reason === null) return; 
    try {
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'revoked' } : r));
      triggerSidebarUpdate();
      await db.requests.updateStatus(request.id, 'revoked', user.id, { rejection_reason: reason });
      await logDataModification(user.id, 'document_requests', request.id, 'DOCUMENT_REVOKED', { status: request.status }, { status: 'revoked', reason });
      toast.success('Document revoked.');
    } catch (error) {
      toast.error(`Revoke Error: ${error.message}`);
    }
  };

  const handleProcessRequest = async (request, skipConfirm = false) => {
    if (!canEdit) return false;
    if (!skipConfirm && !window.confirm('Accept and process this request?')) return;
    try {
      setProcessingRequest(request.id);
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'completed' } : r));
      triggerSidebarUpdate();

      const templateData = prepareTemplateData(request.resident, settings, { purpose: request.purpose });
      const { blob, fileName } = await generatePDFDocument(request.template.template_content, templateData, `${request.request_type}_${request.resident.last_name}.pdf`);
      
      const uniqueFileName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
      const filePath = `processed_requests/${uniqueFileName}`;
      await supabase.storage.from('documents').upload(filePath, blob, { contentType: 'application/pdf', upsert: false });
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const validityDays = request.template?.validity_days || 180;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + validityDays);

      await db.requests.updateStatus(request.id, 'completed', user.id, {
        document_url: urlData.publicUrl,
        storage_path: filePath,
        expiration_date: expDate.toISOString().split('T')[0]
      });

      if (!skipConfirm) {
        toast.success('Document Processed & Generated!');
        if (viewingRequest) setViewingRequest(null);
      }
      return true;
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      return false;
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReleaseDocument = async (request, skipConfirm = false) => {
    if (!canEdit) return false;
    if (!skipConfirm && !window.confirm('Mark this document as released?')) return;
    try {
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'released' } : r));
      triggerSidebarUpdate();

      await db.requests.updateStatus(request.id, 'released', user.id);

      if (request.resident?.email) {
        try {
          const docName = request.request_type || request.template?.template_name || "DOCUMENT";
          
          await emailjs.send(
            'service_178ko1n',     
            'template_qzkqkvf',    
            {
              to_email: request.resident.email,
              to_name: request.resident.first_name,
              barangay_name: "Dos, Calamba",
              email_subject_message: `Good news! Your requested document has been successfully processed and is now READY FOR PICKUP at the Barangay Hall. Please present your Digital Barangay ID from your Resident Portal upon claiming.`,
              otp_code: docName.toUpperCase() 
            },
            'pfTdQReY0nVV3CjnY'    
          );
        } catch (emailErr) {
          console.error("EmailJS failed to send:", emailErr);
        }
      }

      if (!skipConfirm) {
        toast.success('Marked as Released & Email Sent!');
        if (viewingRequest) setViewingRequest(null);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleArchiveDocument = async (request) => {
    if (!canEdit) return;
    if (!window.confirm('Move this request to the Archive?')) return;
    try {
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'archived' } : r));
      triggerSidebarUpdate();
      await db.requests.updateStatus(request.id, 'archived', user.id);
      toast.success('Archived successfully');
      if (viewingRequest) setViewingRequest(null);
    } catch (error) {
      toast.error('Archive failed');
    }
  };

  const handleRetrieveDocument = async (request) => {
    if (!canEdit) return;
    if (!window.confirm('Retrieve this document from archive/rejected?')) return;
    const newStatus = (request.document_url || request.storage_path) ? 'completed' : 'pending';
    const toastId = toast.loading('Retrieving...');
    try {
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: newStatus } : r));
      triggerSidebarUpdate();
      await db.requests.updateStatus(request.id, newStatus, user.id);
      toast.success(`Retrieved to ${newStatus.toUpperCase()}`, { id: toastId });
    } catch (error) {
      toast.error('Retrieve failed', { id: toastId });
    }
  };

  const handlePrintDocument = async (request) => {
    try {
      const tid = toast.loading('Opening Print Preview...');
      const templateData = prepareTemplateData(request.resident, settings, { purpose: request.purpose });
      const { blob } = await generatePDFDocument(request.template.template_content, templateData, `print_${request.id}.pdf`);
      previewPDF(blob);
      toast.dismiss(tid);
    } catch (error) {
      toast.error('Print failed');
    }
  };

  const handleDownloadDocument = async (request) => {
    try {
      const templateData = prepareTemplateData(request.resident, settings, { purpose: request.purpose });
      const { blob, fileName } = await generatePDFDocument(request.template.template_content, templateData, `${request.request_type}_${request.resident.last_name}.pdf`);
      downloadPDF(blob, fileName);
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleCreateRequest = async (formData) => {
    if (!canEdit) return;
    try {
      setLoading(true);
      let supportingDocUrl = null;
      if (formData.notarizedDocFile) {
        const file = formData.notarizedDocFile;
        const filePath = `supporting_docs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        await supabase.storage.from('documents').upload(filePath, file);
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        supportingDocUrl = urlData.publicUrl;
      }
      const payload = { ...formData };
      delete payload.notarizedDocFile; 
      await db.requests.create({ ...payload, supporting_doc_url: supportingDocUrl, status: 'pending', created_by: user.id });
      toast.success('Request Created!');
      setShowForm(false);
      await loadData(); 
    } catch (error) {
      toast.error('Create failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (!canEdit) return;
    if (e.target.checked) setSelectedRequests(currentRequests.map(req => req.id)); 
    else setSelectedRequests([]);
  };

  const toggleSelectRequest = (id) => {
    if (!canEdit) return;
    setSelectedRequests(prev => prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]);
  };

  const handleBatchProcess = async () => {
    if (!canEdit) return;
    if (!window.confirm(`Process ${selectedRequests.length} pending requests?`)) return;
    setIsBatchProcessing(true);
    const tid = toast.loading('Batch processing...');
    for (const id of selectedRequests) {
      const req = requests.find(r => r.id === id);
      if (req?.status === 'pending') await handleProcessRequest(req, true);
    }
    toast.success('Batch Processing Complete', { id: tid });
    setSelectedRequests([]); setIsBatchProcessing(false); 
  };

  const handleBatchRelease = async () => {
    if (!canEdit) return;
    if (!window.confirm(`Release ${selectedRequests.length} documents?`)) return;
    setIsBatchProcessing(true);
    const tid = toast.loading('Releasing documents...');
    for (const id of selectedRequests) {
      const req = requests.find(r => r.id === id);
      if (req?.status === 'completed') await handleReleaseDocument(req, true);
    }
    toast.success('Batch Release Complete', { id: tid });
    setSelectedRequests([]); setIsBatchProcessing(false); 
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', rejected: 'badge-danger', revoked: 'badge-danger', released: 'badge-success', archived: 'badge-secondary' };
    return statusMap[status] || 'badge-info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    let parsedString = dateString.replace(' ', 'T');
    if (!/(Z|[+-]\d{2}(:\d{2})?)$/.test(parsedString)) parsedString += 'Z';
    return new Date(parsedString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPageTitle = () => selectedStatus === 'all' ? 'All Document Requests' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Requests`;

  const renderActionButtons = (request) => (
    <div className="action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      <button className="btn-icon" onClick={() => setViewingRequest(request)} title="View Details">
        <Eye size={18} />
      </button>
      <button className="btn-icon" onClick={() => handleDownloadDocument(request)} title="Download PDF">
        <Download size={18} />
      </button>

      {canEdit ? (
        <>
          {request.status === 'pending' && (
            <>
              <button className="btn-icon" style={{ background: '#f3f4f6', color: '#374151' }} onClick={() => handleEditRequest(request)} title="Edit Request Details">
                <Edit size={18} />
              </button>
              <button className="btn-icon btn-success" onClick={() => handleProcessRequest(request)} disabled={processingRequest === request.id} title="Accept & Generate PDF">
                {processingRequest === request.id ? <div className="spinner-small"></div> : <CheckCircle size={18} />}
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleArchiveDocument(request)} title="Archive Document">
                <Archive size={18} />
              </button>
            </>
          )}

          {request.status === 'completed' && (
            <>
              <button className="btn-icon" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} onClick={() => handlePrintDocument(request)} title="Print Document">
                <Printer size={18} />
              </button>
              <button className="btn-icon btn-success" onClick={() => handleReleaseDocument(request)} title="Mark as Released">
                <Send size={18} />
              </button>
            </>
          )}

          {request.status === 'released' && (
            <>
              <button className="btn-icon btn-primary" onClick={() => handleRenewDocument(request)} title="Renew / Duplicate Request">
                <Copy size={18} />
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleRevokeDocument(request)} title="Revoke Document">
                <Ban size={18} />
              </button>
              <button className="btn-icon" style={{ background: '#e2e8f0', color: '#475569' }} onClick={() => handleArchiveDocument(request)} title="Archive Document">
                <Archive size={18} />
              </button>
            </>
          )}

          {['archived', 'rejected', 'revoked'].includes(request.status) && (
            <>
              <button className="btn-icon btn-primary" onClick={() => handleRetrieveDocument(request)} title="Retrieve Document">
                <RefreshCw size={18} />
              </button>
              <button className="btn-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }} onClick={() => handleRenewDocument(request)} title="Renew / Duplicate Request">
                <Copy size={18} />
              </button>
            </>
          )}
        </>
      ) : (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', marginLeft: '5px' }}>
          No Access
        </span>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .desktop-table-container { display: block; }
        .mobile-cards-container { display: none; }
        
        @media (max-width: 768px) {
          .desktop-table-container { display: none; }
          .mobile-cards-container { display: flex; flex-direction: column; gap: 1rem; }
          
          .document-requests-page .page-header { flex-direction: column !important; align-items: flex-start !important; gap: 1rem; }
          .document-requests-page .page-header button { width: 100%; justify-content: center; }
          
          .batch-actions-bar { flex-direction: column !important; align-items: stretch !important; gap: 1rem; text-align: center; }
          .batch-actions-bar .batch-buttons { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
          .batch-actions-bar .batch-buttons button { width: 100%; justify-content: center; }

          .pagination-controls { flex-direction: column !important; gap: 1rem; text-align: center; }
        }
      `}</style>

      <div className="document-requests-page">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>{getPageTitle()}</h1><p>Process and manage barangay document requests</p></div>
          
          {/* HIDE CREATE BUTTON IF VIEW ONLY */}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={20} /> New Request</button>
          )}
        </div>

        {selectedRequests.length > 0 && canEdit && (
          <div className="batch-actions-bar" style={{ backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-200)', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.2s ease-in-out' }}>
            <span style={{ fontWeight: '600', color: 'var(--primary-700)' }}>{selectedRequests.length} request(s) selected</span>
            <div className="batch-buttons" style={{ display: 'flex', gap: '10px' }}>
              {selectedStatus === 'pending' && (
                <button className="btn btn-primary" onClick={handleBatchProcess} disabled={isBatchProcessing}><CheckSquare size={18} style={{marginRight: '6px'}} /> Accept Selected</button>
              )}
              {selectedStatus === 'completed' && (
                <button className="btn btn-success" onClick={handleBatchRelease} disabled={isBatchProcessing}><Send size={18} style={{marginRight: '6px'}} /> Release Selected</button>
              )}
              {selectedStatus !== 'pending' && selectedStatus !== 'completed' && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Batch actions available in Pending/Completed</span>}
            </div>
          </div>
        )}

        <div className="requests-controls">
          <div className="search-box"><Search size={20} /><input type="text" placeholder="Search by name or type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>

        {loading && !showForm ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading data...</p></div>
        ) : (
          <>
            {/* DESKTOP VIEW */}
            <div className="card desktop-table-container">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      {/* HIDE BATCH CHECKBOX IF VIEW ONLY */}
                      {canEdit && (
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" onChange={toggleSelectAll} checked={currentRequests.length > 0 && selectedRequests.length === currentRequests.length} />
                        </th>
                      )}
                      <th>Resident</th>
                      <th>Document Type</th>
                      <th>Status</th>
                      <th>Date Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRequests.length === 0 ? (
                      <tr><td colSpan={canEdit ? "6" : "5"} className="empty-row" style={{ textAlign: 'center', padding: '20px' }}>No requests found matching your filters.</td></tr>
                    ) : (
                      currentRequests.map((request) => (
                        <tr key={request.id} style={{ backgroundColor: selectedRequests.includes(request.id) ? 'var(--primary-50)' : 'transparent' }}>
                          
                          {/* HIDE ROW CHECKBOX IF VIEW ONLY */}
                          {canEdit && (
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={selectedRequests.includes(request.id)} onChange={() => toggleSelectRequest(request.id)} />
                            </td>
                          )}

                          <td><strong>{request.resident?.first_name} {request.resident?.last_name}</strong></td>
                          <td><span className="document-badge">{request.request_type || request.template?.template_name}</span></td>
                          <td><span className={`badge ${getStatusBadgeClass(request.status)}`}>{request.status.toUpperCase()}</span></td>
                          <td>{formatDate(request.created_at)}</td>
                          <td>{renderActionButtons(request)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="mobile-cards-container">
              {canEdit && currentRequests.length > 0 && (
                <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" onChange={toggleSelectAll} checked={currentRequests.length > 0 && selectedRequests.length === currentRequests.length} />
                  <strong style={{ color: 'var(--text-secondary)' }}>Select All on Page</strong>
                </div>
              )}
              
              {currentRequests.length === 0 ? (
                <div className="empty-row" style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)' }}>No requests found.</div>
              ) : (
                currentRequests.map((request) => (
                  <div key={request.id} style={{ background: selectedRequests.includes(request.id) ? 'var(--primary-50)' : '#fff', border: selectedRequests.includes(request.id) ? '1px solid var(--primary-300)' : '1px solid var(--border)', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* HIDE MOBILE CHECKBOX IF VIEW ONLY */}
                        {canEdit && (
                          <input type="checkbox" checked={selectedRequests.includes(request.id)} onChange={() => toggleSelectRequest(request.id)} style={{ transform: 'scale(1.2)' }} />
                        )}
                        <span style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>{request.resident?.first_name} {request.resident?.last_name}</span>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(request.status)}`} style={{ fontSize: '0.7rem' }}>{request.status.toUpperCase()}</span>
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Document:</strong> <span className="document-badge" style={{ marginLeft: '5px' }}>{request.request_type || request.template?.template_name}</span>
                    </div>
                    <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                      <strong>Requested:</strong> {formatDate(request.created_at)}
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      {renderActionButtons(request)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- PAGINATION CONTROLS --- */}
            {filteredRequests.length > itemsPerPage && (
              <div className="pagination-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</strong> of <strong>{filteredRequests.length}</strong> requests
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            )}
          </>
        )}

        {viewingRequest && (
          <Modal isOpen={!!viewingRequest} onClose={() => setViewingRequest(null)} title="Document Details & Preview" size="xl">
            <DocumentRequestDetails 
              request={viewingRequest} 
              onClose={() => setViewingRequest(null)} 
              onApprove={(viewingRequest.status === 'pending' && canEdit) ? handleProcessRequest : null} 
              onReject={canEdit ? handleArchiveDocument : null} 
              onDownload={handleDownloadDocument} 
            />
          </Modal>
        )}

        {showForm && canEdit && (
          <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New Document Request" size="xl">
            <DocumentRequestForm templates={templates} residents={residents} allRequests={requests} onSubmit={handleCreateRequest} onCancel={() => setShowForm(false)} />
          </Modal>
        )}
      </div>
    </>
  );
};

export default DocumentRequestsPage;