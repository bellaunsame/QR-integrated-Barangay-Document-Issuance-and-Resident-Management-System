import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { prepareTemplateData, generatePDFDocument, downloadPDF, previewPDF } from '../services/documentGenerator';

import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

// Security & Audit Imports
import { logDataModification, ACTIONS } from '../services/security/auditLogger';

// UI Components
import { Modal } from '../components/common';
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import DocumentRequestDetails from '../components/documents/DocumentRequestDetails';
import { 
  Search, Eye, Download, CheckCircle, XCircle, Send, Plus, Archive
} from 'lucide-react';
import './DocumentRequestsPage.css';

const DocumentRequestsPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation(); 
  
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

  // Read URL parameters to auto-select the filter tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    
    if (filterParam) {
      setSelectedStatus(filterParam);
    } else {
      setSelectedStatus('all');
    }
  }, [location.search]);

  // 1. Initial Data Load
  useEffect(() => {
    loadData();
  }, []);

  // 2. Real-time Listener: Updates table instantly on any DB change
  useEffect(() => {
    const channel = supabase
      .channel('document-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_requests' },
        () => {
          loadData(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterRequests();
  }, [selectedStatus, searchTerm, requests]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, templatesData, residentsData] = await Promise.all([
        db.requests.getAll(),
        db.templates.getAll(),
        db.residents.getAll()
      ]);
      
      setRequests(requestsData);
      setTemplates(templatesData);
      setResidents(residentsData);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];
    
    // --- UPDATED LOGIC FOR ALL AND ARCHIVE ---
    if (selectedStatus === 'all') {
      // Hide both archived AND rejected from the "All" view
      filtered = filtered.filter(req => req.status !== 'archived' && req.status !== 'rejected');
    } else if (selectedStatus === 'archived') {
      // Show BOTH manually archived AND rejected documents in the Archive tab
      filtered = filtered.filter(req => req.status === 'archived' || req.status === 'rejected');
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

  // --- ACTIONS ---

  const handleCreateRequest = async (formData) => {
    try {
      setLoading(true);
      let supportingDocUrl = null;

      // 1. If it's a duplicate request, upload the notarized document to Supabase Storage
      if (formData.notarizedDocFile) {
        const file = formData.notarizedDocFile;
        // Clean filename and create a path
        const filePath = `supporting_docs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents') 
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        supportingDocUrl = urlData.publicUrl;
      }

      // 2. Prepare database payload
      const payload = { ...formData };
      delete payload.notarizedDocFile; 

      await db.requests.create({
        ...payload,
        supporting_doc_url: supportingDocUrl,
        status: 'pending',
        created_by: user.id, 
        created_at: new Date().toISOString()
      });
      
      toast.success('Request created successfully!');
      setShowForm(false);
      await loadData(); // Force sync
    } catch (error) {
      toast.error(`Create failed: ${error.message}`);
      console.error('Create error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (request) => {
    if (!window.confirm('Process this document request? This will generate the PDF and update the status.')) return;

    const oldStatus = request.status;

    try {
      setProcessingRequest(request.id);
      
      // INSTANT UI UPDATE
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'completed' } : r));

      // 1. Prepare data & Generate PDF
      const templateData = prepareTemplateData(request.resident, settings, { purpose: request.purpose });
      const { blob, fileName } = await generatePDFDocument(
        request.template.template_content,
        templateData,
        `${request.request_type || 'Document'}_${request.resident.last_name}.pdf`
      );

      // 2. SUPABASE STORAGE UPLOAD 
      let uploadParams = {};
      try {
        const uniqueFileName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
        const filePath = `processed_requests/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, blob, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        if (urlData) {
          uploadParams = { 
            document_url: urlData.publicUrl, 
            storage_path: filePath 
          };
          toast.success('Saved to Supabase Storage');
        }
      } catch (storageError) {
        console.warn('Storage upload skipped/failed:', storageError);
        toast.error('Could not upload to Storage, but will still process document.', { icon: '⚠️' });
      }

      // 3. CALCULATE EXPIRATION DATE
      const validityDays = request.template?.validity_days || 180;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + validityDays);
      
      uploadParams.expiration_date = expirationDate.toISOString().split('T')[0];

      // 4. Update Database Status to Completed
      await db.requests.updateStatus(request.id, 'completed', user.id, uploadParams);

      // 5. SAFE AUDIT LOG
      try {
        await logDataModification(
          user.id,
          'document_requests',
          request.id,
          ACTIONS?.DOCUMENT_APPROVED || 'DOCUMENT_APPROVED', 
          { status: oldStatus },
          { status: 'completed' }
        );
      } catch (auditErr) {
        console.warn("Audit log skipped", auditErr);
      }

      toast.success('Document processed successfully!');
      if (viewingRequest) setViewingRequest(null);
      
      previewPDF(blob); 
      await loadData(); // Force sync to get accurate URLs

    } catch (error) {
      toast.error(`Processing Error: ${error.message}`);
      console.error('Error processing request:', error);
      await loadData(); // Revert on fail
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; 
    
    const oldStatus = request.status;

    try {
      // INSTANT UI UPDATE
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'rejected' } : r));

      await db.requests.updateStatus(request.id, 'rejected', user.id, { rejection_reason: reason });

      try {
        await logDataModification(
          user.id, 'document_requests', request.id, 'DOCUMENT_REJECTED',
          { status: oldStatus }, { status: 'rejected', reason }
        );
      } catch (auditErr) {
        console.warn("Audit log skipped", auditErr);
      }

      toast.success('Request rejected');
      if (viewingRequest) setViewingRequest(null);
      
      await loadData(); // Sync DB

    } catch (error) {
      toast.error(`Rejection Error: ${error.message}`);
      console.error('Reject error:', error);
      await loadData(); // Revert on fail
    }
  };

  const handleReleaseDocument = async (request) => {
    if (!window.confirm('Mark this document as released to the resident?')) return;
    const oldStatus = request.status;

    try {
      // INSTANT UI UPDATE
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'released' } : r));

      await db.requests.updateStatus(request.id, 'released', user.id);
      
      try {
        await logDataModification(
          user.id, 'document_requests', request.id, 'DOCUMENT_RELEASED',
          { status: oldStatus }, { status: 'released' }
        );
      } catch (auditErr) {}

      toast.success('Document marked as released');
      if (viewingRequest) setViewingRequest(null);
      
      await loadData(); // Sync DB
    } catch (error) {
      toast.error(`Release Error: ${error.message}`);
      await loadData(); // Revert on fail
    }
  };

  const handleArchiveDocument = async (request) => {
    if (!window.confirm('Are you sure you want to archive this document? It will be removed from the main list.')) return;
    const oldStatus = request.status;

    try {
      // INSTANT UI UPDATE
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'archived' } : r));

      await db.requests.updateStatus(request.id, 'archived', user.id);
      
      try {
        await logDataModification(
          user.id, 'document_requests', request.id, 'DOCUMENT_ARCHIVED',
          { status: oldStatus }, { status: 'archived' }
        );
      } catch (auditErr) {}

      toast.success('Document archived successfully');
      if (viewingRequest) setViewingRequest(null);
      
      await loadData(); // Sync DB
    } catch (error) {
      toast.error(`Archive Error: ${error.message}`);
      await loadData(); // Revert on fail
    }
  };

  const handleDownloadDocument = async (request) => {
    try {
      const templateData = prepareTemplateData(request.resident, settings, { purpose: request.purpose });
      const { blob, fileName } = await generatePDFDocument(request.template.template_content, templateData, `${request.request_type}_${request.resident.last_name}.pdf`);
      downloadPDF(blob, fileName);
      toast.success('Download started');
    } catch (error) {
      toast.error(`Download failed: ${error.message}`);
    }
  };

  // --- HELPERS ---

  const getStatusBadgeClass = (status) => {
    const statusMap = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', rejected: 'badge-danger', released: 'badge-success', archived: 'badge-secondary' };
    return statusMap[status] || 'badge-info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    let parsedString = dateString.replace(' ', 'T');
    if (!/(Z|[+-]\d{2}(:\d{2})?)$/.test(parsedString)) {
      parsedString += 'Z';
    }
    return new Date(parsedString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const canProcessDocs = !['record_keeper', 'view_only', 'clerk'].includes(user?.role);

  // Dynamic Title Generator
  const getPageTitle = () => {
    if (selectedStatus === 'all') return 'All Document Requests';
    return `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Requests`;
  };

  return (
    <div className="document-requests-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {/* UPDATED DYNAMIC TITLE */}
          <h1>{getPageTitle()}</h1>
          <p>Process and manage barangay document requests</p>
        </div>
        {user?.role !== 'view_only' && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            New Request
          </button>
        )}
      </div>

      <div className="requests-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by resident name or doc type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && !showForm ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Date Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row" style={{ textAlign: 'center', padding: '20px' }}>No requests found matching your filters.</td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.resident?.first_name} {request.resident?.last_name}</strong>
                      </td>
                      <td><span className="document-badge">{request.request_type || request.template?.template_name}</span></td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => setViewingRequest(request)} title="View Details">
                            <Eye size={18} />
                          </button>
                          
                          <button className="btn-icon" onClick={() => handleDownloadDocument(request)} title="Download PDF">
                            <Download size={18} />
                          </button>
                          
                          {canProcessDocs && (
                            <>
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    className="btn-icon btn-success"
                                    onClick={() => handleProcessRequest(request)}
                                    disabled={processingRequest === request.id}
                                    title="Process & Upload"
                                  >
                                    {processingRequest === request.id ? <div className="spinner-small"></div> : <CheckCircle size={18} />}
                                  </button>
                                  <button className="btn-icon btn-danger" onClick={() => handleRejectRequest(request)} title="Reject"><XCircle size={18} /></button>
                                </>
                              )}

                              {request.status === 'completed' && (
                                <button className="btn-icon btn-success" onClick={() => handleReleaseDocument(request)} title="Mark as Released"><Send size={18} /></button>
                              )}

                              {/* --- UPDATED ARCHIVE BUTTON (HIDDEN FOR REJECTED) --- */}
                              {['completed', 'released'].includes(request.status) && (
                                <button className="btn-icon btn-danger" style={{ color: '#ef4444' }} onClick={() => handleArchiveDocument(request)} title="Archive Document">
                                  <Archive size={18} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {viewingRequest && (
        <Modal
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          title="Document Details & Preview"
          size="xl" 
        >
          <DocumentRequestDetails 
            request={viewingRequest}
            onClose={() => setViewingRequest(null)}
            onApprove={canProcessDocs ? handleProcessRequest : null}
            onReject={canProcessDocs ? handleRejectRequest : null}
            onDownload={handleDownloadDocument}
          />
        </Modal>
      )}

      {/* Create Request Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Create New Document Request"
          size="xl" 
        >
          <DocumentRequestForm
            templates={templates}
            residents={residents}
            allRequests={requests} 
            onSubmit={handleCreateRequest}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default DocumentRequestsPage;