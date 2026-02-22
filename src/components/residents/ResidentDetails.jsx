import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Briefcase,
  Home,
  Shield,
  X,
  QrCode as QrCodeIcon,
  Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './ResidentDetails.css';

/**
 * ResidentDetails Component
 * 
 * Modal/Panel displaying full resident information
 */
const ResidentDetails = ({ resident, onClose, onGenerateQR }) => {
  if (!resident) return null;

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

  const getFullAddress = () => {
    const parts = [
      resident.house_number,
      resident.street,
      resident.purok && `Purok ${resident.purok}`,
      resident.barangay,
      resident.city_municipality,
      resident.province,
      resident.zip_code
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('resident-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${resident.last_name}_${resident.first_name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="resident-details-overlay">
      <div className="resident-details-panel">
        {/* Header */}
        <div className="details-header">
          <div className="header-content">
            <div className="resident-avatar-large">
              <User size={48} />
            </div>
            <div>
              <h2>{getFullName()}</h2>
              <p className="resident-subtitle">
                {calculateAge(resident.date_of_birth)} years old • {resident.gender} • {resident.civil_status}
              </p>
            </div>
          </div>
          
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="details-content">
          {/* Personal Information */}
          <section className="details-section">
            <h3>
              <User size={20} />
              Personal Information
            </h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Full Name</span>
                <span className="value">{getFullName()}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Date of Birth</span>
                <span className="value">
                  {new Date(resident.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="detail-item">
                <span className="label">Age</span>
                <span className="value">{calculateAge(resident.date_of_birth)} years old</span>
              </div>

              <div className="detail-item">
                <span className="label">Place of Birth</span>
                <span className="value">{resident.place_of_birth || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="label">Gender</span>
                <span className="value">{resident.gender}</span>
              </div>

              <div className="detail-item">
                <span className="label">Civil Status</span>
                <span className="value">{resident.civil_status}</span>
              </div>

              <div className="detail-item">
                <span className="label">Nationality</span>
                <span className="value">{resident.nationality}</span>
              </div>
            </div>
          </section>

          {/* Address Information */}
          <section className="details-section">
            <h3>
              <MapPin size={20} />
              Address Information
            </h3>
            <div className="details-grid">
              <div className="detail-item full-width">
                <span className="label">Complete Address</span>
                <span className="value">{getFullAddress()}</span>
              </div>

              <div className="detail-item">
                <span className="label">Barangay</span>
                <span className="value">{resident.barangay}</span>
              </div>

              <div className="detail-item">
                <span className="label">City/Municipality</span>
                <span className="value">{resident.city_municipality}</span>
              </div>

              <div className="detail-item">
                <span className="label">Province</span>
                <span className="value">{resident.province}</span>
              </div>

              <div className="detail-item">
                <span className="label">ZIP Code</span>
                <span className="value">{resident.zip_code || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="details-section">
            <h3>
              <Phone size={20} />
              Contact Information
            </h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Mobile Number</span>
                <span className="value">{resident.mobile_number || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="label">Email Address</span>
                <span className="value">{resident.email || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Employment Information */}
          <section className="details-section">
            <h3>
              <Briefcase size={20} />
              Employment Information
            </h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Occupation</span>
                <span className="value">{resident.occupation || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="label">Monthly Income</span>
                <span className="value">
                  {resident.monthly_income 
                    ? `₱${parseFloat(resident.monthly_income).toLocaleString()}` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </section>

          {/* Status Information */}
          <section className="details-section">
            <h3>
              <Shield size={20} />
              Status Information
            </h3>
            <div className="status-list">
              <div className={`status-item ${resident.voter_status ? 'active' : ''}`}>
                <span className="status-indicator"></span>
                <span>Registered Voter</span>
              </div>
              
              <div className={`status-item ${resident.pwd_status ? 'active' : ''}`}>
                <span className="status-indicator"></span>
                <span>Person with Disability (PWD)</span>
              </div>
              
              <div className={`status-item ${resident.senior_citizen ? 'active' : ''}`}>
                <span className="status-indicator"></span>
                <span>Senior Citizen</span>
              </div>
            </div>
          </section>

          {/* QR Code */}
          {resident.qr_code_data && (
            <section className="details-section qr-section">
              <h3>
                <QrCodeIcon size={20} />
                QR Code
              </h3>
              <div className="qr-container">
                <div className="qr-code-wrapper">
                  <QRCodeSVG
                    id="resident-qr-code"
                    value={resident.qr_code_data}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <button className="btn btn-secondary" onClick={downloadQRCode}>
                  <Download size={20} />
                  Download QR Code
                </button>
              </div>
            </section>
          )}

          {!resident.qr_code_data && onGenerateQR && (
            <section className="details-section">
              <button 
                className="btn btn-primary btn-block"
                onClick={() => onGenerateQR(resident)}
              >
                <QrCodeIcon size={20} />
                Generate QR Code
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentDetails;