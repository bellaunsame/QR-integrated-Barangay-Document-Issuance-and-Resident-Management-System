import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import jsQR from 'jsqr';
import { db } from '../../services/supabaseClient';
import { parseQRData } from '../../services/qrCodeService';
import {
  QrCode,
  Camera,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Upload,
  FileText
} from 'lucide-react';
import './QRScannerModal.css';

/**
 * QRScannerModal
 * 
 * A reusable QR scanning tool that can be embedded inside any page via <Modal>.
 * Supports live camera scanning and file upload.
 * 
 * Props:
 * - onResidentScanned(resident): callback when a resident is successfully scanned & verified
 * - onClose(): callback to close the modal
 */
const QRScannerModal = ({ onResidentScanned, onClose }) => {
  const scannerRef = useRef(null);
  const isInitializing = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.warn('Scanner cleanup warning:', err);
      }
    }
  };

  const startScanner = () => {
    if (isInitializing.current || scannerRef.current) return;

    setScanning(true);
    setError(null);
    setResident(null);
    isInitializing.current = true;

    setTimeout(() => {
      try {
        const scannerElement = document.getElementById('qr-modal-reader');
        if (!scannerElement) {
          isInitializing.current = false;
          return;
        }

        const scanner = new Html5QrcodeScanner(
          'qr-modal-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoConstraints: {
              facingMode: "environment"
            },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true
          },
          false
        );

        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
      } catch (err) {
        console.error('Scanner initialization error:', err);
        setError('Camera is busy or access was denied.');
        setScanning(false);
      } finally {
        isInitializing.current = false;
      }
    }, 400);
  };

  // File upload handler using jsQR
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    // Stop camera if running
    if (scannerRef.current) {
      await stopScanner();
      setScanning(false);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        onScanSuccess(code.data);
      } else {
        setError("Could not read the QR code from this file. Please ensure it is a clear Resident QR.");
        setLoading(false);
      }

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      setError("Failed to load image file.");
      setLoading(false);
      URL.revokeObjectURL(url);
    };

    img.src = url;
    e.target.value = '';
  };

  const onScanSuccess = async (decodedText) => {
    try {
      setLoading(true);
      if (scannerRef.current) {
        await stopScanner();
        setScanning(false);
      }

      const data = parseQRData(decodedText);

      if (data && data.type === 'barangay_resident' && data.id) {
        const residentData = await db.residents.getById(data.id);

        if (!residentData) {
          setError('Resident not found in database. Please register first.');
          return;
        }

        setResident(residentData);
        setError(null);
      } else {
        setError('Invalid QR Code format. Please scan a valid resident QR code.');
      }
    } catch (err) {
      console.error('Error processing scan:', err);
      setError('Failed to process QR code.');
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (error) => {
    const errStr = typeof error === 'string' ? error : (error?.message || String(error));
    if (!errStr.includes('NotFoundException') && !errStr.includes('No MultiFormat Readers')) {
      console.warn('Camera scan warning:', errStr);
    }
  };

  const resetScanner = () => {
    stopScanner().then(() => {
      setResident(null);
      setError(null);
      setScanning(false);
    });
  };

  const handleProceedWithResident = () => {
    if (resident && onResidentScanned) {
      onResidentScanned(resident);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="qr-scanner-modal">
      {/* Hidden file input */}
      <input
        type="file"
        id="qr-modal-upload"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* === IDLE STATE: Ready to Scan === */}
      {!scanning && !resident && !loading && !error && (
        <div className="qr-modal-start">
          <div className="start-icon-wrap">
            <QrCode size={36} />
          </div>
          <h3>Scan Resident QR Code</h3>
          <p>
            Scan a resident's QR code to quickly identify them and auto-fill the document request form.
          </p>
          <div className="qr-modal-actions">
            <button className="btn btn-primary" onClick={startScanner}>
              <Camera size={20} /> Scan with Camera
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => document.getElementById('qr-modal-upload').click()}
            >
              <Upload size={20} /> Upload QR Image
            </button>
          </div>
        </div>
      )}

      {/* === SCANNING STATE: Camera Active === */}
      {scanning && (
        <div className="qr-scanning-section">
          <div className="qr-scan-instructions">
            <AlertCircle size={18} />
            <span>Position the QR code within the frame to scan</span>
          </div>

          <div className="qr-camera-wrapper">
            <div id="qr-modal-reader"></div>
          </div>

          <div className="qr-scan-actions">
            <button
              className="btn btn-primary"
              onClick={() => document.getElementById('qr-modal-upload').click()}
            >
              <Upload size={18} /> Upload File Instead
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { stopScanner(); setScanning(false); }}
            >
              <XCircle size={18} /> Cancel Scan
            </button>
          </div>
        </div>
      )}

      {/* === LOADING STATE === */}
      {loading && (
        <div className="qr-loading-state">
          <div className="spinner"></div>
          <p>Processing QR Code...</p>
        </div>
      )}

      {/* === ERROR STATE === */}
      {error && (
        <div className="qr-error-state">
          <div className="error-icon-wrap">
            <XCircle size={32} />
          </div>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={resetScanner}>
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      )}

      {/* === VERIFIED RESIDENT CARD === */}
      {resident && !loading && !error && (
        <div className="qr-resident-card">
          <div className="qr-resident-header">
            <CheckCircle size={22} />
            <h3>Resident Verified</h3>
          </div>

          <div className="qr-resident-body">
            {resident.photo_url ? (
              <img
                src={resident.photo_url}
                alt="Profile"
                className="qr-resident-avatar"
              />
            ) : (
              <div className="qr-resident-avatar-placeholder">
                <User size={32} />
              </div>
            )}
            <div className="qr-resident-info">
              <p className="resident-name">
                {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
              </p>
              <p className="resident-details">
                {resident.occupation || 'No occupation listed'}
              </p>
            </div>
          </div>

          <div className="qr-resident-grid">
            <div className="info-cell">
              <label>Age & Gender</label>
              <span>{calculateAge(resident.date_of_birth)} yrs / {resident.gender}</span>
            </div>
            <div className="info-cell">
              <label>Date of Birth</label>
              <span>{resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="info-cell">
              <label>Contact</label>
              <span>{resident.mobile_number || 'N/A'}</span>
            </div>
            <div className="info-cell" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <span>
                {resident.full_address}{resident.purok ? `, ${resident.purok}` : ''}, {resident.barangay}, {resident.city_municipality}, {resident.province}
              </span>
            </div>
          </div>

          <div className="qr-resident-actions">
            <button className="btn btn-secondary" onClick={resetScanner}>
              <RefreshCw size={18} /> Scan Another
            </button>
            <button className="btn btn-primary" onClick={handleProceedWithResident}>
              <FileText size={18} /> Create Document Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScannerModal;
