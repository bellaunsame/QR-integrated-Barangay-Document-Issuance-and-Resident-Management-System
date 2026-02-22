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
 * 
 * Display resident information in a card format
 */
const ResidentCard = ({ 
  resident, 
  onEdit, 
  onDelete, 
  onView,
  onGenerateQR 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getFullName = () => {
    return `${resident.first_name} ${resident.middle_name || ''} ${resident.last_name} ${resident.suffix || ''}`.trim();
  };

  const getAddress = () => {
    const parts = [
      resident.house_number,
      resident.street,
      resident.purok && `Purok ${resident.purok}`,
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
        <div className="resident-avatar">
          <User size={32} />
        </div>
        
        <div className="resident-info">
          <h3 className="resident-name">{getFullName()}</h3>
          <div className="resident-meta">
            <span className="age">
              <Calendar size={14} />
              {calculateAge(resident.date_of_birth)} years old
            </span>
            <span className="gender">{resident.gender}</span>
            <span className="civil-status">{resident.civil_status}</span>
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
              <button onClick={() => { onView(resident); setShowMenu(false); }}>
                <Eye size={16} />
                View Details
              </button>
              <button onClick={() => { onEdit(resident); setShowMenu(false); }}>
                <Edit size={16} />
                Edit
              </button>
              <button onClick={() => { onGenerateQR(resident); setShowMenu(false); }}>
                <QrCode size={16} />
                Generate QR
              </button>
              <button 
                onClick={() => { onDelete(resident); setShowMenu(false); }}
                className="danger"
              >
                <Trash2 size={16} />
                Delete
              </button>
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
          <MapPin size={16} />
          <span>{getAddress()}</span>
        </div>

        {resident.mobile_number && (
          <div className="info-row">
            <Phone size={16} />
            <span>{resident.mobile_number}</span>
          </div>
        )}

        {resident.email && (
          <div className="info-row">
            <Mail size={16} />
            <span>{resident.email}</span>
          </div>
        )}

        {resident.occupation && (
          <div className="info-row">
            <User size={16} />
            <span>{resident.occupation}</span>
          </div>
        )}
      </div>

      {/* QR Code Status */}
      {resident.qr_code_url && (
        <div className="card-footer">
          <div className="qr-status">
            <QrCode size={16} />
            <span>QR Code Generated</span>
          </div>
        </div>
      )}

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

export default ResidentCard;