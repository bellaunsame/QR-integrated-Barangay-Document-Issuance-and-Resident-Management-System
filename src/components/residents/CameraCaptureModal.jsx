import React from 'react';
import Webcam from 'react-webcam';
import { X, Camera } from 'lucide-react';

const CameraCaptureModal = ({ activeCamera, webcamRef, onClose, onCapture }) => {
  if (!activeCamera) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>
            {activeCamera === 'photo' ? 'Take Resident Photo' : activeCamera === 'proof' ? 'Take Photo of Proof of Residency' : 'Take Photo of Valid ID'}
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: "user" 
            }}
            onUserMediaError={(err) => {
              console.error("Webcam error:", err);
              alert("Could not access the camera. Please check your browser permissions.");
            }}
            style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onCapture}>
            <Camera size={18} style={{ marginRight: '8px' }} /> Snap Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;