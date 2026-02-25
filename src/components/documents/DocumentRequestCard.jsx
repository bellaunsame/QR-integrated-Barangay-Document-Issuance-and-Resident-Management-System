import { 
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import { useState } from 'react';
import './DocumentRequestCard.css';

/**
 * DocumentRequestCard Component
 * * Display document request in a card format
 */
const DocumentRequestCard = ({ 
  request,
  onView,
  onApprove,
  onReject,
  onComplete,
  onDelete,
  onDownload,
  showActions = true
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        label: 'Pending',
        icon: Clock,
        color: '#f59e0b',
        bgColor: '#fef3c7',
        textColor: '#92400e'
      },
      processing: {
        label: 'Processing',
        icon: AlertCircle,
        color: '#3b82f6',
        bgColor: '#dbeafe',
        textColor: '#1e40af'
      },
      approved: {
        label: 'Approved',
        icon: CheckCircle,
        color: '#10b981',
        bgColor: '#d1fae5',
        textColor: '#065f46'
      },
      rejected: {
        label: 'Rejected',
        icon: XCircle,
        color: '#ef4444',
        bgColor: '#fee2e2',
        textColor: '#991b1b'
      },
      completed: {
        label: 'Completed',
        icon: CheckCircle,
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        textColor: '#5b21b6'
      },
      released: {
        label: 'Released',
        icon: CheckCircle,
        color: '#10b981',
        bgColor: '#d1fae5',
        textColor: '#065f46'
      }
    };

    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getResidentName = () => {
    if (request.resident) {
      return `${request.resident.first_name} ${request.resident.middle_name || ''} ${request.resident.last_name}`.trim();
    }
    return 'Unknown Resident';
  };

  return (
    <div className="document-request-card">
      {/* Header */}
      <div className="card-header">
        <div className="request-icon">
          <FileText size={24} />
        </div>
        
        <div className="request-info">
          <h3 className="request-type">{request.request_type}</h3>
          
          {/* UPDATED: Request Meta Data with Expiration Logic */}
          <div className="request-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="request-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} />
              Requested: {formatDate(request.created_at)}
            </span>

            {/* --- NEW: EXPIRATION DATE DISPLAY --- */}
            {request.expiration_date && (request.status === 'completed' || request.status === 'released') && (
              <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                {new Date(request.expiration_date) < new Date() ? (
                  <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '500' }}>
                    Expired on: {formatDate(request.expiration_date)}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '500' }}>
                    Valid until: {formatDate(request.expiration_date)}
                  </span>
                )}
              </div>
            )}
            {/* --- END EXPIRATION LOGIC --- */}

          </div>
        </div>

        {showActions && (
          <div className="card-actions">
            <button
              className="action-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <div className="action-menu">
                <button onClick={() => { onView(request); setShowMenu(false); }}>
                  <Eye size={16} />
                  View Details
                </button>
                
                {request.status === 'pending' && onApprove && (
                  <button onClick={() => { onApprove(request); setShowMenu(false); }}>
                    <CheckCircle size={16} />
                    Approve
                  </button>
                )}
                
                {request.status === 'pending' && onReject && (
                  <button onClick={() => { onReject(request); setShowMenu(false); }} className="danger">
                    <XCircle size={16} />
                    Reject
                  </button>
                )}
                
                {request.status === 'approved' && onComplete && (
                  <button onClick={() => { onComplete(request); setShowMenu(false); }}>
                    <CheckCircle size={16} />
                    Mark Complete
                  </button>
                )}
                
                {request.document_url && onDownload && (
                  <button onClick={() => { onDownload(request); setShowMenu(false); }}>
                    <Download size={16} />
                    Download
                  </button>
                )}
                
                {onDelete && (
                  <button onClick={() => { onDelete(request); setShowMenu(false); }} className="danger">
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="status-badge-wrapper">
        <div 
          className="status-badge"
          style={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.textColor
          }}
        >
          <StatusIcon size={16} />
          {statusConfig.label}
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        {/* Resident Info */}
        <div className="info-row">
          <User size={16} />
          <div className="info-content">
            <span className="info-label">Resident</span>
            <span className="info-value">{getResidentName()}</span>
          </div>
        </div>

        {/* Purpose */}
        {request.purpose && (
          <div className="info-row">
            <FileText size={16} />
            <div className="info-content">
              <span className="info-label">Purpose</span>
              <span className="info-value">{request.purpose}</span>
            </div>
          </div>
        )}

        {/* Processed By */}
        {request.processed_by && (
          <div className="info-row">
            <User size={16} />
            <div className="info-content">
              <span className="info-label">Processed By</span>
              <span className="info-value">
                {request.processed_by_name || 'Staff Member'}
              </span>
            </div>
          </div>
        )}

        {/* Processing Notes */}
        {request.processing_notes && (
          <div className="info-row">
            <AlertCircle size={16} />
            <div className="info-content">
              <span className="info-label">Notes</span>
              <span className="info-value">{request.processing_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="footer-info">
          <Clock size={14} />
          <span>Updated {formatDate(request.updated_at)}</span>
        </div>
      </div>

      {/* Backdrop for menu */}
      {showMenu && (
        <div 
          className="menu-backdrop" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default DocumentRequestCard;