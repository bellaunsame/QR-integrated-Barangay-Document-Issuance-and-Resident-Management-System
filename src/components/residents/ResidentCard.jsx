import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Edit,
  Trash2,
  QrCode,
  Eye,
  MoreVertical
} from 'lucide-react';
import { useState } from 'react';
import './ResidentCard.css';

/**
 * ResidentCard Component
 * * Display resident information in a card format
 */
const ResidentCard = ({ 
  resident, 
  onEdit, 
  onDelete, 
  onView,
  onGenerateQR 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Return nothing if resident data hasn't loaded yet
  if (!resident) return null;

  // FIX: Safe age calculation prevents 'NaN' or crashes if DOB is missing
  const calculateAgeSafe = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    
    if (isNaN(birth.getTime())) return 'N/A';

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // FIX: Filter out nulls so we don't get double spaces for missing middle names
  const getFullName = () => {
    return [
      resident.first_name, 
      resident.middle_name, 
      resident.last_name, 
      resident.suffix
    ].filter(Boolean).join(' ');
  };

  // FIX: Smart address formatting
  const getAddress = () => {
    const parts = [
      resident.house_number,
      resident.street,
      resident.purok && (resident.purok.toLowerCase().includes('purok') ? resident.purok : `Purok ${resident.purok}`),
      resident.barangay
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const getStatusBadges = () => {
    const badges = [];
    
    if (resident.voter_status) {
      badges.push({ label: 'Voter', color: 'blue' });
    }
    if (resident.pwd_status) {
      badges.push({ label: 'PWD', color: 'purple' });
    }
    if (resident.senior_citizen) {
      badges.push({ label: 'Senior', color: 'orange' });
    }
    
    return badges;
  };

  return (
    <div className="resident-card">
      {/* Header */}
      <div className="card-header">
        <div className="resident-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
          {/* FIX: Show actual resident photo if available */}
          {resident.photo_url ? (
             <img src={resident.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
             <User size={24} color="#94a3b8" />
          )}
        </div>
        
        <div className="resident-info">
          <h3 className="resident-name">{getFullName()}</h3>
          <div className="resident-meta">
            <span className="age">
              <Calendar size={14} style={{ marginRight: '4px' }} />
              {calculateAgeSafe(resident.date_of_birth)} yrs
            </span>
            <span className="gender">{resident.gender || 'N/A'}</span>
            <span className="civil-status">{resident.civil_status || 'N/A'}</span>
          </div>
        </div>

        <div className="card-actions">
          <button
            className="action-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className="action-menu">
              {/* FIX: Only render buttons if the parent component actually passed the function (prevents view-only staff crashes) */}
              
              {onView && (
                <button onClick={() => { onView(resident); setShowMenu(false); }}>
                  <Eye size={16} /> View Details
                </button>
              )}
              
              {onEdit && (
                <button onClick={() => { onEdit(resident); setShowMenu(false); }}>
                  <Edit size={16} /> Edit
                </button>
              )}
              
              {onGenerateQR && (
                <button onClick={() => { onGenerateQR(resident); setShowMenu(false); }}>
                  <QrCode size={16} /> Generate QR
                </button>
              )}
              
              {onDelete && (
                <button onClick={() => { onDelete(resident); setShowMenu(false); }} className="danger">
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Badges */}
      {getStatusBadges().length > 0 && (
        <div className="status-badges">
          {getStatusBadges().map(badge => (
            <span key={badge.label} className={`badge badge-${badge.color}`}>
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Contact Info */}
      <div className="card-body">
        <div className="info-row">
          <MapPin size={16} color="#64748b" />
          <span>{getAddress()}</span>
        </div>

        <div className="info-row">
          <Phone size={16} color="#64748b" />
          <span>{resident.mobile_number || resident.contact_number || 'N/A'}</span>
        </div>

        {resident.email && (
          <div className="info-row">
            <Mail size={16} color="#64748b" />
            <span>{resident.email}</span>
          </div>
        )}

        {resident.occupation && (
          <div className="info-row">
            <User size={16} color="#64748b" />
            <span>{resident.occupation}</span>
          </div>
        )}
      </div>

      {/* QR Code Status */}
      <div className="card-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
        {resident.qr_code_url ? (
          <div className="qr-status" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <QrCode size={16} /> QR Code Active
          </div>
        ) : (
          <div className="qr-status" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <QrCode size={16} /> No QR Code
          </div>
        )}
      </div>

      {/* Backdrop for menu */}
      {showMenu && (
        <div 
          className="menu-backdrop" 
          onClick={() => setShowMenu(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
        />
      )}
    </div>
  );
};

export default ResidentCard;