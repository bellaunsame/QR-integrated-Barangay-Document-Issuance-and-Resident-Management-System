import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 
import jsQR from 'jsqr'; // <-- NEW: The ultimate digital file scanner
import { useNavigate } from 'react-router-dom';
import { db } from '../services/supabaseClient';
import { parseQRData } from '../services/qrCodeService';
import { 
  QrCode, 
  Camera, 
  User, 
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  LayoutDashboard,
  FileText,
  Upload 
} from 'lucide-react';
import './QRScannerPage.css';

const QRScannerPage = () => {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const isInitializing = useRef(false);
  
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  useEffect(() => {
    loadTemplates();
    return () => {
      stopScanner();
    };
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await db.templates.getActive();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

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
    setScannedData(null);
    setResident(null);
    setShowForm(false);
    setRequestSubmitted(false);
    isInitializing.current = true;

    setTimeout(() => {
      try {
        const scannerElement = document.getElementById('qr-reader');
        if (!scannerElement) {
          isInitializing.current = false;
          return;
        }

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
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

  // --- NEW: THE BULLETPROOF jsQR FILE UPLOADER ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    // Stop the live camera if it's currently running
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
      
      // Draw image to canvas to extract raw pixel data
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // jsQR directly parses the pixels, completely bypassing the bug in html5-qrcode
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        console.log("File decoded flawlessly by jsQR!");
        onScanSuccess(code.data);
      } else {
        console.error("jsQR could not find a code in the image.");
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
    e.target.value = ''; // Reset input so the user can upload the same file again if needed
  };

  const onScanSuccess = async (decodedText) => {
    try {
      setLoading(true);
      if (scannerRef.current) {
        await stopScanner();
        setScanning(false);
      }

      const data = parseQRData(decodedText);
      setScannedData(data);

      if (data && data.type === 'barangay_resident' && data.id) {
        const residentData = await db.residents.getById(data.id);
        
        if (!residentData) {
          setError('Resident not found in database. Please register first.');
          return;
        }

        console.log("Found Resident:", residentData);
        setResident(residentData);
        setShowForm(true);
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

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !purpose.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      await db.requests.create({
        resident_id: resident.id,
        template_id: selectedTemplate,
        request_type: template.template_name,
        purpose: purpose.trim(),
        status: 'pending'
      });
      setRequestSubmitted(true);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    stopScanner().then(() => {
      setScannedData(null);
      setResident(null);
      setSelectedTemplate('');
      setPurpose('');
      setShowForm(false);
      setRequestSubmitted(false);
      setError(null);
    });
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
    <div className="qr-scanner-page">
      {/* Hidden file input for custom upload button */}
      <input type="file" id="custom-qr-upload" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />

      <div className="scanner-header">
        <div className="header-content">
          <div className="header-icon"><QrCode size={32} /></div>
          <div className="header-text">
            <h1>QR Code Scanner</h1>
            <p>Scan resident QR code to verify identity</p>
          </div>
        </div>
      </div>

      <div className="scanner-container">
        {!scanning && !resident && !requestSubmitted && (
          <div className="start-section">
            <div className="start-card">
              <Camera size={64} className="start-icon" />
              <h2>Ready to Scan</h2>
              <div className="start-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-large" onClick={startScanner}>
                  <Camera size={24} /> Scan with Camera
                </button>
                
                {/* Custom Upload Button */}
                <button className="btn btn-secondary btn-large" onClick={() => document.getElementById('custom-qr-upload').click()}>
                  <Upload size={24} /> Upload Image File
                </button>

                <button className="btn btn-outline btn-large" onClick={() => navigate('/dashboard')}>
                   <LayoutDashboard size={24} /> Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {scanning && (
          <div className="scanning-section">
            <div className="scanner-card">
              <div className="scanner-instructions">
                <AlertCircle size={20} />
                <p>Position the QR code within the frame to scan</p>
              </div>
              
              <div className="scanner-wrapper">
                <div id="qr-reader"></div>
              </div>

              <div className="scanner-actions" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => document.getElementById('custom-qr-upload').click()}>
                  <Upload size={20} /> Upload File Instead
                </button>
                <button className="btn btn-secondary" onClick={() => { stopScanner(); setScanning(false); }}>
                  <XCircle size={20} /> Cancel
                </button>
                <button className="btn btn-outline" onClick={() => { stopScanner(); navigate('/dashboard'); }}>
                  <LayoutDashboard size={20} /> Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="loading-overlay"><div className="loading-spinner"></div><p>Processing...</p></div>}

        {error && (
          <div className="error-section">
            <div className="error-card">
              <XCircle size={48} className="error-icon" />
              <p>{error}</p>
              <button className="btn btn-primary" onClick={resetScanner}><RefreshCw size={20} /> Try Again</button>
            </div>
          </div>
        )}

        {/* --- EXPANDED VERIFIED RESIDENT CARD --- */}
        {resident && showForm && !requestSubmitted && (
          <div className="result-section">
            <div className="resident-card" style={{ maxWidth: '100%', overflow: 'hidden' }}>
              <div className="card-header">
                <CheckCircle size={24} className="success-icon" />
                <h2>Verified Resident Profile</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 1. Avatar & Quick Info Header */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {resident.photo_url ? (
                    <img src={resident.photo_url} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #eff6ff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <User size={48} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.8rem', color: '#1e3a8a', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                      {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
                    </h3>
                    <p style={{ color: '#64748b', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{resident.occupation || 'No occupation listed'}</p>
                  </div>
                </div>

                {/* 2. Detailed Grid Information */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="info-row" style={{ padding: '1rem' }}>
                    <div className="info-content">
                      <label>Age & Gender</label>
                      <span className="value">{calculateAge(resident.date_of_birth)} yrs / {resident.gender}</span>
                    </div>
                  </div>
                  
                  <div className="info-row" style={{ padding: '1rem' }}>
                    <div className="info-content">
                      <label>Date of Birth</label>
                      <span className="value">{resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="info-row" style={{ padding: '1rem' }}>
                    <div className="info-content">
                      <label>Contact Number</label>
                      <span className="value">{resident.mobile_number || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="info-row" style={{ padding: '1rem', gridColumn: '1 / -1' }}>
                    <div className="info-content">
                      <label>Complete Address</label>
                      <span className="value">{resident.full_address}, {resident.purok ? `${resident.purok}, ` : ''}{resident.barangay}, {resident.city_municipality}, {resident.province}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Request Section */}
            <div className="request-card">
              <div className="card-header"><FileText size={24} /><h2>Request Document</h2></div>
              <form onSubmit={handleSubmitRequest} className="request-form">
                <select className="form-control" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} required>
                  <option value="">Select document...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                </select>
                <textarea className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of Request..." required />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetScanner}>Close Result</button>
                  <button type="submit" className="btn btn-primary">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {requestSubmitted && (
          <div className="success-section">
            <div className="success-card">
              <CheckCircle size={80} className="success-icon-large" />
              <h2>Request Submitted!</h2>
              <p className="success-message">The document request for <strong>{resident.first_name}</strong> has been successfully added to the queue.</p>
              <div className="success-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => navigate('/documents')}>View All Requests</button>
                <button className="btn btn-primary" onClick={resetScanner}>Scan Another Resident</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScannerPage;