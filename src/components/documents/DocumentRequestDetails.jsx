import { 
  X,
  FileText,
  User,
  Calendar, // Unused but kept just in case
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Printer
} from 'lucide-react';
import './DocumentRequestDetails.css';

/**
 * DocumentRequestDetails Component
 * * Modal/Panel displaying full document request information
 */
const DocumentRequestDetails = ({ 
  request, 
  onClose,
  onApprove,
  onReject,
  onComplete,
  onDownload
}) => {
  if (!request) return null;

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Pending', color: '#f59e0b', icon: Clock },
      processing: { label: 'Processing', color: '#3b82f6', icon: Clock },
      approved: { label: 'Approved', color: '#10b981', icon: CheckCircle },
      rejected: { label: 'Rejected', color: '#ef4444', icon: XCircle },
      completed: { label: 'Completed', color: '#8b5cf6', icon: CheckCircle },
      released: { label: 'Released', color: '#10b981', icon: CheckCircle }
    };
    return configs[status?.toLowerCase()] || configs.pending;
  };

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ROBUSTNESS TWEAK: Prevents double spaces if middle name is missing
  const getResidentName = () => {
    if (request.resident) {
      return [
        request.resident.first_name, 
        request.resident.middle_name, 
        request.resident.last_name, 
        request.resident.suffix
      ].filter(Boolean).join(' ').trim();
    }
    return 'Unknown Resident';
  };

  // ROBUSTNESS TWEAK: Prevents hanging commas if street is missing
  const getFullAddress = () => {
    if (!request.resident) return 'N/A';
    return [
      request.resident.street,
      request.resident.barangay,
      request.resident.city_municipality
    ].filter(Boolean).join(', ');
  };

  // Safely get document type
  const docType = request.request_type || request.template?.template_name || 'Document Request';

  return (
    <div className="document-details-overlay">
      <div className="document-details-panel">
        {/* Header */}
        <div className="details-header">
          <div className="header-content">
            <div className="request-icon-large">
              <FileText size={32} />
            </div>
            <div>
              <h2>{docType}</h2>
              <div 
                className="status-badge-large"
                style={{ color: statusConfig.color }}
              >
                <StatusIcon size={20} />
                {statusConfig.label}
              </div>
            </div>
          </div>
          
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="details-content">
          {/* Request Information */}
          <section className="details-section">
            <h3>
              <FileText size={20} />
              Request Information
            </h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Request ID</span>
                <span className="value">{request.id?.slice(0, 8) || request.id}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Document Type</span>
                <span className="value">{docType}</span>
              </div>

              <div className="detail-item">
                <span className="label">Status</span>
                <span className="value">
                  <span 
                    className="status-text"
                    style={{ color: statusConfig.color, fontWeight: 'bold' }}
                  >
                    {statusConfig.label}
                  </span>
                </span>
              </div>

              <div className="detail-item">
                <span className="label">Submitted</span>
                <span className="value">{formatDateTime(request.created_at)}</span>
              </div>

              <div className="detail-item full-width">
                <span className="label">Purpose</span>
                <span className="value">{request.purpose || 'No purpose specified'}</span>
              </div>
            </div>
          </section>

          {/* Resident Information */}
          {request.resident && (
            <section className="details-section">
              <h3>
                <User size={20} />
                Resident Information
              </h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Name</span>
                  <span className="value">{getResidentName()}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Mobile Number</span>
                  <span className="value">{request.resident.mobile_number || 'N/A'}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Email</span>
                  <span className="value">{request.resident.email || 'N/A'}</span>
                </div>

                <div className="detail-item full-width">
                  <span className="label">Address</span>
                  <span className="value">{getFullAddress()}</span>
                </div>
              </div>
            </section>
          )}

          {/* Processing Information */}
          {(request.processed_by || request.released_by) && (
            <section className="details-section">
              <h3>
                <CheckCircle size={20} />
                Processing Information
              </h3>
              <div className="details-grid">
                {request.processed_by && (
                  <>
                    <div className="detail-item">
                      <span className="label">Processed By</span>
                      <span className="value">{request.processed_by_name || 'Staff Member'}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="label">Processed At</span>
                      <span className="value">{formatDateTime(request.processed_at)}</span>
                    </div>
                  </>
                )}

                {request.processing_notes && (
                  <div className="detail-item full-width">
                    <span className="label">Processing Notes</span>
                    <span className="value">{request.processing_notes}</span>
                  </div>
                )}

                {request.released_by && (
                  <>
                    <div className="detail-item">
                      <span className="label">Released By</span>
                      <span className="value">{request.released_by_name || 'Staff Member'}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="label">Released At</span>
                      <span className="value">{formatDateTime(request.released_at)}</span>
                    </div>
                  </>
                )}

                {request.release_notes && (
                  <div className="detail-item full-width">
                    <span className="label">Release Notes</span>
                    <span className="value">{request.release_notes}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Document File / Download */}
          {request.document_url && (
            <section className="details-section">
              <h3>
                <FileText size={20} />
                Generated Document
              </h3>
              <div className="document-actions">
                <button className="btn btn-primary" onClick={() => onDownload(request)}>
                  <Download size={20} />
                  Download Document
                </button>
                {/* Opens the PDF in a new tab to print, rather than printing the dashboard UI */}
                <button className="btn btn-secondary" onClick={() => window.open(request.document_url, '_blank')}>
                  <Printer size={20} />
                  Print
                </button>
              </div>
            </section>
          )}

          {/* Actions */}
          {(onApprove || onReject || onComplete) && (
            <section className="details-section actions-section">
              <h3>Actions</h3>
              <div className="action-buttons">
                {request.status === 'pending' && onApprove && (
                  <button className="btn btn-success" onClick={() => onApprove(request)}>
                    <CheckCircle size={20} />
                    Approve Request
                  </button>
                )}
                
                {request.status === 'pending' && onReject && (
                  <button className="btn btn-danger" onClick={() => onReject(request)}>
                    <XCircle size={20} />
                    Reject Request
                  </button>
                )}
                
                {request.status === 'approved' && onComplete && (
                  <button className="btn btn-primary" onClick={() => onComplete(request)}>
                    <CheckCircle size={20} />
                    Mark as Completed
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentRequestDetails;