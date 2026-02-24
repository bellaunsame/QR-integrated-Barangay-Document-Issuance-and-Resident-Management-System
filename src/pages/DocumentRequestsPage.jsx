import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { prepareTemplateData, generatePDFDocument, downloadPDF, previewPDF } from '../services/documentGenerator';

import toast from 'react-hot-toast';

// Security & Audit Imports
import { logDataModification, ACTIONS } from '../services/security/auditLogger';

// UI Components
import { Modal } from '../components/common';
import DocumentRequestForm from '../components/documents/DocumentRequestForm';
import DocumentRequestDetails from '../components/documents/DocumentRequestDetails';
import { DocumentStatusFilter } from '../components/documents';
import { 
  Search, Eye, Download, CheckCircle, XCircle, Clock, Send, Plus 
} from 'lucide-react';
import './DocumentRequestsPage.css';

const DocumentRequestsPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  
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
    if (selectedStatus !== 'all') {
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
      await db.requests.create({
        ...formData,
        status: 'pending',
        created_by: user.id, 
        created_at: new Date().toISOString()
      });
      
      toast.success('Request created successfully!');
      setShowForm(false);
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

        const { data: uploadData, error: uploadError } = await supabase.storage
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

      // 3. Update Database Status to Completed
      await db.requests.updateStatus(request.id, 'completed', user.id, uploadParams);

      // 4. SAFE AUDIT LOG
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

    } catch (error) {
      toast.error(`Processing Error: ${error.message}`);
      console.error('Error processing request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; 
    
    const oldStatus = request.status;

    try {
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
      
    } catch (error) {
      toast.error(`Rejection Error: ${error.message}`);
      console.error('Reject error:', error);
    }
  };

  const handleReleaseDocument = async (request) => {
    if (!window.confirm('Mark this document as released to the resident?')) return;
    const oldStatus = request.status;

    try {
      await db.requests.updateStatus(request.id, 'released', user.id);
      
      try {
        await logDataModification(
          user.id, 'document_requests', request.id, 'DOCUMENT_RELEASED',
          { status: oldStatus }, { status: 'released' }
        );
      } catch (auditErr) {}

      toast.success('Document marked as released');
      if (viewingRequest) setViewingRequest(null);
      
    } catch (error) {
      toast.error(`Release Error: ${error.message}`);
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
    const statusMap = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', rejected: 'badge-danger', released: 'badge-success' };
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

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    released: requests.filter(r => r.status === 'released').length
  };

  return (
    <div className="document-requests-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Document Requests</h1>
          <p>Process and manage barangay document requests</p>
        </div>
        {/* HIDE NEW REQUEST BUTTON FROM VIEW ONLY */}
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

        <div className="status-filters">
          <button className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`} onClick={() => setSelectedStatus('all')}>
            All ({statusCounts.all})
          </button>
          <button className={`filter-btn ${selectedStatus === 'pending' ? 'active' : ''}`} onClick={() => setSelectedStatus('pending')}>
            <Clock size={16} /> Pending ({statusCounts.pending})
          </button>
          <button className={`filter-btn ${selectedStatus === 'completed' ? 'active' : ''}`} onClick={() => setSelectedStatus('completed')}>
            <CheckCircle size={16} /> Completed ({statusCounts.completed})
          </button>
          <button className={`filter-btn ${selectedStatus === 'released' ? 'active' : ''}`} onClick={() => setSelectedStatus('released')}>
            <Send size={16} /> Released ({statusCounts.released})
          </button>
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
                          
                          {/* HIDE PROCESS/REJECT FROM VIEW ONLY */}
                          {request.status === 'pending' && user?.role !== 'record_keeper' && user?.role !== 'view_only' && (
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

                          {/* HIDE RELEASE FROM VIEW ONLY */}
                          {request.status === 'completed' && user?.role !== 'record_keeper' && user?.role !== 'view_only' && (
                            <button className="btn-icon btn-success" onClick={() => handleReleaseDocument(request)} title="Mark as Released"><Send size={18} /></button>
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
          size="lg"
        >
          <DocumentRequestDetails 
            request={viewingRequest}
            onClose={() => setViewingRequest(null)}
            // Strip process/reject props if user is view_only or record_keeper
            onApprove={user?.role !== 'record_keeper' && user?.role !== 'view_only' ? handleProcessRequest : null}
            onReject={user?.role !== 'record_keeper' && user?.role !== 'view_only' ? handleRejectRequest : null}
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
          size="lg"
        >
          <DocumentRequestForm
            templates={templates}
            residents={residents}
            onSubmit={handleCreateRequest}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default DocumentRequestsPage;