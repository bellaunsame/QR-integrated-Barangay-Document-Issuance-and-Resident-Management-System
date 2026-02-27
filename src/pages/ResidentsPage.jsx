import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { generateQRData, generateQRCodeImage } from '../services/qrCodeService';
import { generateResidentIDImage, downloadResidentID } from '../services/idGenerator'; 
import { sendQRCodeEmail } from '../services/emailService';
import toast from 'react-hot-toast';
<<<<<<< HEAD
import Webcam from 'react-webcam';
=======
import Webcam from 'react-webcam'; 
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d

import { validateForm } from '../services/security/inputSanitizer';
import { logDataModification, ACTIONS } from '../services/security/auditLogger';

import { 
  Users, Plus, Search, Edit2, Trash2, QrCode, 
  Mail, Download, X, Save, Eye, User, Upload, FileText, CheckCircle, CreditCard, Camera
} from 'lucide-react';
import './ResidentsPage.css';

const ResidentsPage = () => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [viewingResident, setViewingResident] = useState(null); 
  const [editingResident, setEditingResident] = useState(null);
  
  const [formData, setFormData] = useState(getEmptyFormData());
  const [errors, setErrors] = useState({});

  // --- CAMERA STATES & REFS ---
  const [activeCamera, setActiveCamera] = useState(null); // 'photo', 'proof', or 'valid_id'
  const webcamRef = useRef(null);

<<<<<<< HEAD
  // --- DATE RESTRICTIONS ---
=======
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
  const todayDateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const maxDate = todayDateStr; 
  
  const date16 = new Date();
  date16.setFullYear(date16.getFullYear() - 16);
  const maxDate16 = date16.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  
  const minDate = "1870-01-01"; 

  const currentResidentAge = calculateAge(formData.date_of_birth);
  const isUnderage = currentResidentAge !== 'N/A' && currentResidentAge !== 'Invalid' && currentResidentAge < 16;

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    filterResidents();
  }, [searchTerm, residents]);

  function getEmptyFormData() {
    return {
      photo_url: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      date_of_birth: '',
      place_of_birth: '',
      gender: '',
      civil_status: '',
      nationality: 'Filipino',
      religion: '', 
      educational_attainment: '', 
      full_address: '',
      purok: '',
      barangay: getSetting('barangay_name', 'Barangay'),
      city_municipality: getSetting('city_municipality', ''),
      province: getSetting('province', ''),
      zip_code: '',
      residency_start_date: '', 
      proof_of_residency_url: '',
      mobile_number: '',
      email: '',
      occupation: '',
      monthly_income: '',
      spouse_name: '',
      spouse_occupation: '',
      spouse_birthdate: '', 
      spouse_age: '',       
      number_of_children: '', 
      guardian_name: '',
      guardian_relationship: '',
      emergency_contact_name: '', 
      emergency_contact_number: '', 

      father_first_name: '',
      father_middle_name: '',
      father_last_name: '',
      father_suffix: '',
      father_name: '',
      father_deceased: false,
      father_occupation: '',
      father_phone_number: '',
      father_birthdate: '',
      father_age: '',
      father_address: '',
      father_religion: '',
      father_nationality: 'Filipino',

      mother_first_name: '',
      mother_middle_name: '',
      mother_last_name: '',
      mother_suffix: '',
      mother_name: '',
      mother_deceased: false,
      mother_occupation: '',
      mother_phone_number: '',
      mother_birthdate: '',
      mother_age: '',
      mother_address: '',
      mother_religion: '',
      mother_nationality: 'Filipino',

      voter_status: false,
      pwd_status: false,
      senior_citizen: false,
      other_id_status: false,
      valid_id_url: ''
    };
  }

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await db.residents.getAll();
      setResidents(data);
      setFilteredResidents(data);
    } catch (error) {
      toast.error('Failed to load residents');
      console.error('Error loading residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    if (!searchTerm) {
      setFilteredResidents(residents);
      return;
    }
    const search = searchTerm.toLowerCase();
    const filtered = residents.filter(resident => 
      resident.first_name.toLowerCase().includes(search) ||
      resident.last_name.toLowerCase().includes(search) ||
      resident.email?.toLowerCase().includes(search) ||
      resident.mobile_number?.includes(search)
    );
    setFilteredResidents(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    const capitalizeFields = [
      'first_name', 'middle_name', 'last_name', 'place_of_birth', 'religion', 
      'full_address', 'purok', 'father_address', 'mother_address', 'spouse_name', 
      'spouse_occupation', 'guardian_name', 'emergency_contact_name',
      'father_first_name', 'father_middle_name', 'father_last_name',
      'mother_first_name', 'mother_middle_name', 'mother_last_name',
    ];
    
    if (capitalizeFields.includes(name) && typeof newValue === 'string') {
      newValue = newValue.replace(/\b\w/g, char => char.toUpperCase());
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      if (['father_birthdate', 'mother_birthdate', 'spouse_birthdate', 'date_of_birth'].includes(name)) {
        if (newValue && newValue.length >= 10) {
           const age = calculateAge(newValue);
           
           if (name === 'father_birthdate') updated.father_age = age !== 'Invalid' ? age : '';
           if (name === 'mother_birthdate') updated.mother_age = age !== 'Invalid' ? age : '';
           if (name === 'spouse_birthdate') updated.spouse_age = age !== 'Invalid' ? age : '';

           if (name === 'date_of_birth') {
             if (age !== 'N/A' && age !== 'Invalid' && age < 16) {
               updated.civil_status = 'Single';
               updated.spouse_name = '';
               updated.spouse_occupation = '';
               updated.spouse_birthdate = '';
               updated.spouse_age = '';
             }
           }
        } else {
           if (name === 'father_birthdate') updated.father_age = '';
           if (name === 'mother_birthdate') updated.mother_age = '';
           if (name === 'spouse_birthdate') updated.spouse_age = '';
        }
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // --- FILE UPLOADS ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast.error("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast.error("Proof file must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, proof_of_residency_url: reader.result }));
        toast.success("Proof of Residency attached!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleValidIdUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast.error("ID file must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, valid_id_url: reader.result }));
        toast.success("Valid ID attached!");
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LIVE CAMERA CAPTURE FUNCTION ---
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (activeCamera === 'photo') {
      setFormData(prev => ({ ...prev, photo_url: imageSrc }));
      toast.success("Profile Photo captured!");
    } else if (activeCamera === 'proof') {
      setFormData(prev => ({ ...prev, proof_of_residency_url: imageSrc }));
      toast.success("Proof of Residency captured!");
    } else if (activeCamera === 'valid_id') {
      setFormData(prev => ({ ...prev, valid_id_url: imageSrc }));
      toast.success("Valid ID captured!");
    }
    
<<<<<<< HEAD
    setActiveCamera(null); 
  }, [webcamRef, activeCamera]);

=======
    setActiveCamera(null); // Close camera modal
  }, [webcamRef, activeCamera]);


>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const mainAge = calculateAge(formData.date_of_birth);
    if (mainAge === 'Invalid') {
      toast.error('The Resident Date of Birth is invalid (Future date or too old).');
      return;
    }

    const validationRules = {
      first_name: { required: true, type: 'name' },
      last_name: { required: true, type: 'name' },
      middle_name: { type: 'name' },
      email: { type: 'email' },
      mobile_number: { required: true, type: 'phone' },
      date_of_birth: { required: true, type: 'date' },
      full_address: { required: true, type: 'address' }, 
      barangay: { required: true, type: 'address' }
    };

    const validation = validateForm(formData, validationRules);

    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const sanitizedData = {
        ...formData,
        ...validation.sanitizedData, 
      };

      sanitizedData.father_name = [sanitizedData.father_first_name, sanitizedData.father_middle_name, sanitizedData.father_last_name, sanitizedData.father_suffix].filter(Boolean).join(' ') || sanitizedData.father_name;
      sanitizedData.mother_name = [sanitizedData.mother_first_name, sanitizedData.mother_middle_name, sanitizedData.mother_last_name, sanitizedData.mother_suffix].filter(Boolean).join(' ') || sanitizedData.mother_name;

      // --- BULLETPROOF PAYLOAD EXTRACTOR ---
      // Strictly extracts ONLY the columns defined in getEmptyFormData()
      // Completely ignores nested arrays like 'document_requests' that cause the 400 Error
      const safeKeys = Object.keys(getEmptyFormData());
      const payload = {};
      
      safeKeys.forEach(key => {
        if (sanitizedData[key] !== undefined) {
          payload[key] = sanitizedData[key];
        }
      });

      // Convert empty strings to nulls to prevent database crashes
      Object.keys(payload).forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });

      // Parse numbers safely
      payload.number_of_children = (payload.number_of_children === null) ? null : parseInt(payload.number_of_children, 10);
      payload.father_age = (payload.father_age === null) ? null : parseInt(payload.father_age, 10);
      payload.mother_age = (payload.mother_age === null) ? null : parseInt(payload.mother_age, 10);
      payload.spouse_age = (payload.spouse_age === null) ? null : parseInt(payload.spouse_age, 10);
      payload.monthly_income = (payload.monthly_income === null) ? null : parseFloat(payload.monthly_income);

      let residentResult;

      if (editingResident) {
        residentResult = await db.residents.update(editingResident.id, payload);
        await logDataModification(user.id, 'residents', editingResident.id, ACTIONS.RESIDENT_UPDATED, editingResident, payload);
        await generateQRForResident({ id: editingResident.id, ...payload });
        toast.success('Resident updated successfully');
      } else {
        payload.created_by = user.id; // Only add created_by on new inserts
        residentResult = await db.residents.create(payload);
        await logDataModification(user.id, 'residents', residentResult.id, ACTIONS.RESIDENT_CREATED, null, payload);
        await generateQRForResident(residentResult);
        toast.success('Resident added successfully');
      }

      await loadResidents();
      closeModal();
    } catch (error) {
      toast.error('Failed to save resident');
      console.error('Error saving resident:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRForResident = async (resident) => {
    try {
      const qrData = generateQRData(resident);
      const qrCodeUrl = await generateQRCodeImage(qrData);

      await db.residents.update(resident.id, {
        qr_code_data: qrData,
        qr_code_url: qrCodeUrl
      });

      if (resident.email) {
        try {
          const { blob } = await generateResidentIDImage(resident);
          const filePath = `id_cards/${resident.id}_id_card.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

          await sendQRCodeEmail(resident, urlData.publicUrl);
          await db.residents.update(resident.id, { qr_sent_at: new Date().toISOString() });
          
          toast.success('ID Card sent to email!');
        } catch (emailError) {
          console.error('Email/Storage error:', emailError);
          toast('QR generated but email failed to send', { icon: '⚠️' });
        }
      }
      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const handleResendQR = async (resident) => {
    if (!resident.email) {
      toast.error('Resident has no email address');
      return;
    }
    try {
      setLoading(true);
      toast.loading('Generating ID & sending email...', { id: 'resend-toast' });
      
      const { blob } = await generateResidentIDImage(resident);
      const filePath = `id_cards/${resident.id}_id_card.jpg`;
      
      await supabase.storage.from('documents').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      
      await sendQRCodeEmail(resident, urlData.publicUrl);
      await db.residents.update(resident.id, { qr_sent_at: new Date().toISOString() });
      
      toast.success('ID Card sent successfully!', { id: 'resend-toast' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to send email', { id: 'resend-toast' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (resident) => {
    try {
      const toastId = toast.loading('Generating ID Card...');
      await downloadResidentID(resident); 
      toast.success('ID Card downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate ID Card');
    }
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    const formSafeData = { ...resident };
    
    formSafeData.father_first_name = resident.father_first_name || '';
    formSafeData.father_middle_name = resident.father_middle_name || '';
    formSafeData.father_last_name = resident.father_last_name || '';
    formSafeData.father_suffix = resident.father_suffix || '';
    
    formSafeData.mother_first_name = resident.mother_first_name || '';
    formSafeData.mother_middle_name = resident.mother_middle_name || '';
    formSafeData.mother_last_name = resident.mother_last_name || '';
    formSafeData.mother_suffix = resident.mother_suffix || '';
    
    formSafeData.proof_of_residency_url = resident.proof_of_residency_url || '';
    formSafeData.valid_id_url = resident.valid_id_url || '';
    formSafeData.other_id_status = resident.other_id_status || false;

    Object.keys(formSafeData).forEach(key => {
      if (formSafeData[key] === null) {
        formSafeData[key] = '';
      }
    });

    setFormData(formSafeData);
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (resident) => {
    if (!window.confirm(`Are you sure you want to delete ${resident.first_name} ${resident.last_name}?`)) return;

    try {
      setLoading(true);
      await db.residents.delete(resident.id);
      await logDataModification(user.id, 'residents', resident.id, ACTIONS.RESIDENT_DELETED, resident, null);
      toast.success('Resident deleted successfully');
      await loadResidents();
    } catch (error) {
      toast.error('Failed to delete resident');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingResident(null);
    setFormData(getEmptyFormData());
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingResident(null);
    setFormData(getEmptyFormData());
    setErrors({});
  };

  const InputHint = ({ text }) => (
    <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
      {text}
    </small>
  );

  const renderParentName = (prefix) => {
    if (!viewingResident) return 'N/A';
    const first = viewingResident[`${prefix}_first_name`];
    const middle = viewingResident[`${prefix}_middle_name`];
    const last = viewingResident[`${prefix}_last_name`];
    const suffix = viewingResident[`${prefix}_suffix`];
    const legacy = viewingResident[`${prefix}_name`];

    if (first || last) return [first, middle, last, suffix].filter(Boolean).join(' ');
    return legacy || 'N/A';
  };

  return (
    <div className="residents-page">
      <div className="page-header">
        <div>
          <h1>Residents Management</h1>
          <p>Manage barangay residents, update info, and generate QR codes</p>
        </div>
        {['admin', 'clerk'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={20} /> Add New Resident
          </button>
        )}
      </div>

      <div className="residents-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search residents by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="residents-count">
          <Users size={18} />
          <span>{filteredResidents.length} residents</span>
        </div>
      </div>

      {loading && !showModal && !viewingResident ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading residents...</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'center' }}>No. of Docs Req/s.</th>
                  <th>Age / Gender</th>
                  <th>QR Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <div className="empty-state">
                        <Users size={48} />
                        <h3>No residents found</h3>
                        <p>Add your first resident to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <div className="resident-name" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row' }}>
                          {resident.photo_url ? (
                            <img src={resident.photo_url} alt="pic" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94a3b8"/></div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong>{resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}</strong>
                            <small>{resident.civil_status}</small>
                          </div>
                        </div>
                      </td>
                      
                      <td>{resident.full_address}, {resident.barangay}</td>
                      <td>
                        <div className="contact-cell">
                          <span>{resident.mobile_number || 'N/A'}</span>
                          <small>{resident.email || 'No email'}</small>
                        </div>
                      </td>
                      
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                          {resident.document_requests?.length || 0} 
                        </span>
                      </td>

                      <td>{calculateAge(resident.date_of_birth)} yrs / {resident.gender}</td>
                      <td>
                        {resident.qr_code_url ? (
                          <span className="badge badge-success"><QrCode size={14} /> Generated</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => setViewingResident(resident)} title="View Info">
                            <Eye size={18} />
                          </button>
                          
                          {['admin', 'clerk'].includes(user?.role) && (
                            <>
                              <button className="btn-icon" onClick={() => handleDownloadQR(resident)} title="Download QR">
                                <Download size={18} />
                              </button>
                              <button className="btn-icon" onClick={() => handleResendQR(resident)} title="Send QR via Email" disabled={!resident.email}>
                                <Mail size={18} />
                              </button>
                              <button className="btn-icon" onClick={() => handleEdit(resident)} title="Edit">
                                <Edit2 size={18} />
                              </button>
                              {user?.role === 'admin' && ( // Only Admin can delete!
                                <button className="btn-icon btn-danger" onClick={() => handleDelete(resident)} title="Delete">
                                  <Trash2 size={18} />
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

      {/* VIEW PREVIEW MODAL */}
      {viewingResident && (
        <div className="modal-overlay" onClick={() => setViewingResident(null)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Resident Profile</h2>
              <button className="btn-icon" onClick={() => setViewingResident(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body preview-body" style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                
                {/* Avatar & QR Side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '250px' }}>
                  {viewingResident.photo_url ? (
                    <img src={viewingResident.photo_url} alt="Resident Profile" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-md)' }} />
                  ) : (
                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', boxShadow: 'var(--shadow-md)' }} >
                      <User size={80} />
                    </div>
                  )}
                  
                  {viewingResident.qr_code_url ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={viewingResident.qr_code_url} alt="QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Resident QR Code</p>
                    </div>
                  ) : (
                    <span className="badge badge-warning">QR Pending</span>
                  )}
                  
                  {/* Status Badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {viewingResident.voter_status && <span className="badge badge-primary">Voter</span>}
                    {viewingResident.pwd_status && <span className="badge badge-warning">PWD</span>}
                    {viewingResident.senior_citizen && <span className="badge badge-success">Senior</span>}
                    {viewingResident.other_id_status && <span className="badge badge-secondary">Other ID</span>}
                  </div>
                  
                  {/* File Links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                    {viewingResident.proof_of_residency_url && (
                      <a href={viewingResident.proof_of_residency_url} target="_blank" rel="noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--neutral-100)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--primary-700)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                        <FileText size={16} /> View Proof of Residency
                      </a>
                    )}
                    {viewingResident.valid_id_url && (
                      <a href={viewingResident.valid_id_url} target="_blank" rel="noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--neutral-100)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--primary-700)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                        <CreditCard size={16} /> View Valid ID
                      </a>
                    )}
                  </div>
                </div>

                {/* Main Information Data */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Basic Info */}
                  <div>
                    <h1 style={{ marginBottom: '0.2rem', color: 'var(--primary-800)' }}>{viewingResident.first_name} {viewingResident.middle_name} {viewingResident.last_name} {viewingResident.suffix}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{viewingResident.occupation || 'No occupation listed'}</p>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Gender</p><p className="font-medium">{calculateAge(viewingResident.date_of_birth)} yrs / {viewingResident.gender}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Date of Birth</p><p className="font-medium">{new Date(viewingResident.date_of_birth).toLocaleDateString()}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Civil Status</p><p className="font-medium">{viewingResident.civil_status}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact Number</p><p className="font-medium">{viewingResident.mobile_number || 'N/A'}</p></div>
                    <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Complete Address</p>
                      <p className="font-medium">{viewingResident.full_address}, {viewingResident.purok ? `${viewingResident.purok}, ` : ''} {viewingResident.barangay}, {viewingResident.city_municipality}, {viewingResident.province} {viewingResident.zip_code}</p>
                    </div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Residency Duration</p>
                      <p className="font-medium">{viewingResident.residency_start_date ? `${calculateResidencyYears(viewingResident.residency_start_date)} Years (Since ${new Date(viewingResident.residency_start_date).getFullYear()})` : 'Not specified'}</p>
                    </div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion</p><p className="font-medium">{viewingResident.religion || 'N/A'}</p></div>
                    <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Educational Attainment</p><p className="font-medium">{viewingResident.educational_attainment || 'N/A'}</p></div>
                  </div>

                  {/* Family Information Preview */}
                  <div style={{ background: 'var(--neutral-50)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-700)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Detailed Family Information</h3>
                    
                    {/* Father */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                        Father {viewingResident.father_deceased && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'normal' }}>(Deceased)</span>}
                      </h4>
                      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div style={{ gridColumn: '1 / span 2' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Name</p><p className="font-medium">{renderParentName('father')}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{viewingResident.father_age || 'N/A'} / {viewingResident.father_birthdate ? new Date(viewingResident.father_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact No.</p><p className="font-medium">{viewingResident.father_phone_number || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Occupation</p><p className="font-medium">{viewingResident.father_occupation || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion</p><p className="font-medium">{viewingResident.father_religion || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nationality</p><p className="font-medium">{viewingResident.father_nationality || 'N/A'}</p></div>
                        <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Address</p><p className="font-medium">{viewingResident.father_address || 'N/A'}</p></div>
                      </div>
                    </div>

                    {/* Mother */}
                    <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                        Mother {viewingResident.mother_deceased && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'normal' }}>(Deceased)</span>}
                      </h4>
                      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div style={{ gridColumn: '1 / span 2' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Maiden Name</p><p className="font-medium">{renderParentName('mother')}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{viewingResident.mother_age || 'N/A'} / {viewingResident.mother_birthdate ? new Date(viewingResident.mother_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contact No.</p><p className="font-medium">{viewingResident.mother_phone_number || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Occupation</p><p className="font-medium">{viewingResident.mother_occupation || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Religion</p><p className="font-medium">{viewingResident.mother_religion || 'N/A'}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nationality</p><p className="font-medium">{viewingResident.mother_nationality || 'N/A'}</p></div>
                        <div style={{ gridColumn: '1 / -1' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Address</p><p className="font-medium">{viewingResident.mother_address || 'N/A'}</p></div>
                      </div>
                    </div>

                    {/* Spouse / Guardian / Emergency */}
                    <div style={{ paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                          <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Spouse's Name</p><p className="font-medium">{viewingResident.spouse_name || 'N/A'}</p></div>
                          <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Age / Birthday</p><p className="font-medium">{viewingResident.spouse_age || 'N/A'} / {viewingResident.spouse_birthdate ? new Date(viewingResident.spouse_birthdate).toLocaleDateString() : 'N/A'}</p></div>
                          <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Spouse Occupation</p><p className="font-medium">{viewingResident.spouse_occupation || 'N/A'}</p></div>
                          <div><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No. of Children </p>
                            <p className="font-medium">{viewingResident.number_of_children !== null ? viewingResident.number_of_children : 'None'}</p>
                          </div>
                        </div>
                        <div style={{ marginTop: '1rem' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Guardian's Name</p><p className="font-medium">{viewingResident.guardian_name || 'N/A'} {viewingResident.guardian_relationship ? `(${viewingResident.guardian_relationship})` : ''}</p></div>
                        <div style={{ marginTop: '1rem' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Emergency Contact</p><p className="font-medium">{viewingResident.emergency_contact_name || 'N/A'} - {viewingResident.emergency_contact_number || 'N/A'}</p></div>
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT HISTORY SECTION IN MODAL */}
                  <div style={{ background: 'var(--neutral-50)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-700)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={20} /> Requested Documents History
                    </h3>
                    
                    {viewingResident?.document_requests?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {viewingResident.document_requests
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((doc) => {
                            return (
                              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                <div>
                                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {doc.template?.template_name || 'Unknown Document'}
                                  </strong>
                                  
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <small style={{ color: 'var(--text-tertiary)' }}>
                                      Requested: {new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </small>
                                    
                                    {doc.expiration_date && (doc.status === 'completed' || doc.status === 'released') && (
                                      <div style={{ marginTop: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {new Date(doc.expiration_date) < new Date() ? (
                                          <span style={{ color: '#f87171' }}> 
                                            Expired on: {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                        ) : (
                                          <span style={{ color: '#34d399' }}> 
                                            Valid until: {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <span className={`badge badge-${
                                  doc.status === 'released' ? 'success' : 
                                  doc.status === 'completed' ? 'success' : 
                                  doc.status === 'processing' ? 'warning' : 'gray'
                                }`}>
                                  {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}
                                </span>
                              </div>
                            );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                        <p style={{ margin: 0, color: 'var(--text-tertiary)' }}>No documents requested yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingResident(null)}>Close</button>
              
              {['admin', 'clerk'].includes(user?.role) && (
                <button type="button" className="btn btn-primary" onClick={() => { setViewingResident(null); handleEdit(viewingResident); }}>
                  <Edit2 size={16} style={{ marginRight: '0.5rem' }} /> Edit Info
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT FORM MODAL --- */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingResident ? 'Edit Resident' : 'Add New Resident'}</h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* Photo Upload Section */}
                <div className="form-section">
                  <h3>Resident Photo</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
                        <User size={32} color="var(--neutral-400)"/>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
<<<<<<< HEAD
                          <Upload size={16} /> Upload Image
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
=======
                          <Upload size={16} /> Upload
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                        
                        {/* --- UPDATED: CAMERA CAPTURE OPENER --- */}
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('photo')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Camera size={16} /> Take Photo
                        </button>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>Max size: 2MB. JPG, PNG accepted.</p>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="form-section">
                  <h3>Personal Information</h3>
                  <div className="form-grid">
                    <div className={`form-group ${errors.first_name ? 'has-error' : ''}`}>
                      <label>First Name *</label>
                      <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required maxLength="50" placeholder="e.g. Juan" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                      <InputHint text="Required. Letters only." />
                      {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Santos" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                      <InputHint text="Optional." />
                    </div>
                    <div className={`form-group ${errors.last_name ? 'has-error' : ''}`}>
                      <label>Last Name *</label>
                      <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required maxLength="50" placeholder="e.g. Dela Cruz" pattern="[a-zA-ZñÑ\-\.\s]+" title="Letters, spaces, hyphens, and periods only" />
                      <InputHint text="Required. Letters only." />
                      {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                    </div>
                    <div className="form-group">
                      <label>Suffix</label>
                      <input type="text" name="suffix" value={formData.suffix} onChange={handleInputChange} maxLength="10" placeholder="e.g. Jr., Sr., III" />
                      <InputHint text="Optional." />
                    </div>
                    <div className={`form-group ${errors.date_of_birth ? 'has-error' : ''}`}>
                      <label>Date of Birth *</label>
                      <input type="date" name="date_of_birth" max={maxDate} min={minDate} value={formData.date_of_birth} onChange={handleInputChange} required />
                      <InputHint text="Used to automatically calculate age." />
                    </div>
                    <div className="form-group">
                      <label>Place of Birth</label>
                      <input type="text" name="place_of_birth" value={formData.place_of_birth} onChange={handleInputChange} maxLength="100" placeholder="e.g. Calamba City" />
                    </div>
                    <div className="form-group">
                      <label>Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Civil Status *</label>
                      <select name="civil_status" value={formData.civil_status} onChange={handleInputChange} required disabled={isUnderage}>
                        <option value="">Select status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                      {isUnderage && <InputHint text="Resident must be at least 16 to change status." />}
                    </div>

                    <div className="form-group">
                      <label>Religion</label>
                      <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} maxLength="50" placeholder="e.g. Roman Catholic" />
                    </div>
                  </div>
                </div>

                {/* Address & Contact */}
                <div className="form-section">
                  <h3>Address & Contact</h3>
                  <div className="form-grid">
                    <div className={`form-group ${errors.full_address ? 'has-error' : ''}`} style={{ gridColumn: '1 / -1' }}>
                      <label>Full Address (House No., Street, Subdivision/Village) *</label>
                      <input type="text" name="full_address" value={formData.full_address} onChange={handleInputChange} required maxLength="150" placeholder="e.g. Blk 1 Lot 2, San Jose St., Phase 3" />
                      <InputHint text="Exclude Barangay, City, Province." />
                    </div>
                    <div className="form-group">
                      <label>Purok/Zone</label>
                      <input type="text" name="purok" value={formData.purok} onChange={handleInputChange} maxLength="20" placeholder="e.g. Purok 1" />
                    </div>
                    <div className="form-group">
                      <label>Zip Code</label>
                      <input type="text" name="zip_code" value={formData.zip_code} onChange={handleInputChange} maxLength="4" pattern="[0-9]{4}" placeholder="e.g. 4027" title="Must be a 4-digit number" />
                      <InputHint text="4-digit number." />
                    </div>
                    <div className="form-group">
                      <label>Date Started Residing</label>
                      <input type="date" name="residency_start_date" max={maxDate} min={minDate} value={formData.residency_start_date} onChange={handleInputChange} />
                      <InputHint text="Used to calculate residency duration." />
                    </div>
                    
                    {/* --- UPDATED: Proof of Residency Upload + Camera --- */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Proof of Residency (Upload Document/Image)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Upload size={16} /> Upload
                          <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleProofUpload} />
                        </label>
<<<<<<< HEAD
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('proof')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Camera size={16} /> Take Photo
                        </button>
=======
                        
                        {/* --- OPEN CAMERA FOR PROOF --- */}
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('proof')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Camera size={16} /> Take Photo
                        </button>
                        
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
                        {formData.proof_of_residency_url ? (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem' }}><CheckCircle size={14} /> Attached</span>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>No file chosen</span>
                        )}
                      </div>
<<<<<<< HEAD
                      <InputHint text="Upload or take a photo of a utility bill, lease agreement, or valid proof (Max: 5MB)." />
=======
                      <InputHint text="Upload or take a photo of a utility bill, lease agreement, etc (Max: 5MB)." />
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
                    </div>

                    <div className={`form-group ${errors.mobile_number ? 'has-error' : ''}`}>
                      <label>Mobile Number *</label>
                      <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} required maxLength="11" pattern="09[0-9]{9}" placeholder="e.g. 09123456789" title="Must be an 11-digit number starting with 09" />
                      <InputHint text="Format: 11 digits starting with 09." />
                    </div>
                    <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                      <label>Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} maxLength="100" placeholder="e.g. juan@example.com" />
                      <InputHint text="Required for sending QR codes." />
                    </div>
                  </div>
                </div>

                {/* PARENTS' INFORMATION */}
                <div className="form-section" style={{ background: 'var(--neutral-50)', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>Parents' Information</h3>
                  
                  {/* Father Section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Father</h4>
                    <label className="checkbox-label" style={{ background: 'transparent', padding: '0', marginBottom: '1rem' }}>
                      <input type="checkbox" name="father_deceased" checked={formData.father_deceased} onChange={handleInputChange} />
                      <span>Check if Deceased (Disables contact/current details)</span>
                    </label>
                    
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label>First Name</label>
                        <input type="text" name="father_first_name" value={formData.father_first_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Mario" />
                      </div>
                      <div className="form-group">
                        <label>Middle Name</label>
                        <input type="text" name="father_middle_name" value={formData.father_middle_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Santos" />
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        <input type="text" name="father_last_name" value={formData.father_last_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Dela Cruz" />
                      </div>
                      <div className="form-group">
                        <label>Suffix</label>
                        <input type="text" name="father_suffix" value={formData.father_suffix} onChange={handleInputChange} maxLength="10" placeholder="e.g. Sr." />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Occupation</label>
                        <input type="text" name="father_occupation" value={formData.father_occupation} onChange={handleInputChange} disabled={formData.father_deceased} maxLength="50" placeholder="e.g. Driver" />
                      </div>
                      <div className="form-group">
                        <label>Contact Number</label>
                        <input type="tel" name="father_phone_number" value={formData.father_phone_number} onChange={handleInputChange} disabled={formData.father_deceased} maxLength="11" pattern="09[0-9]{9}" placeholder="e.g. 09123456789" />
                      </div>
                      <div className="form-group">
                        <label>Birthdate</label>
                        <input type="date" name="father_birthdate" max={maxDate16} min={minDate} value={formData.father_birthdate} onChange={handleInputChange} disabled={formData.father_deceased} />
                      </div>
                      <div className="form-group">
                        <label>Age</label>
                        <input type="number" name="father_age" value={formData.father_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" />
                      </div>
                      <div className="form-group">
                        <label>Religion</label>
                        <input type="text" name="father_religion" value={formData.father_religion} onChange={handleInputChange} maxLength="50" placeholder="e.g. Roman Catholic" />
                      </div>
                      <div className="form-group">
                        <label>Nationality</label>
                        <input type="text" name="father_nationality" value={formData.father_nationality} onChange={handleInputChange} maxLength="50" placeholder="e.g. Filipino" />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Current Address</label>
                        <input type="text" name="father_address" value={formData.father_address} onChange={handleInputChange} disabled={formData.father_deceased} maxLength="150" placeholder="Full Address" />
                      </div>
                    </div>
                  </div>

                  {/* Mother Section */}
                  <div style={{ paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Mother</h4>
                    <label className="checkbox-label" style={{ background: 'transparent', padding: '0', marginBottom: '1rem' }}>
                      <input type="checkbox" name="mother_deceased" checked={formData.mother_deceased} onChange={handleInputChange} />
                      <span>Check if Deceased (Disables contact/current details)</span>
                    </label>
                    
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label>Maiden First Name</label>
                        <input type="text" name="mother_first_name" value={formData.mother_first_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Maria" />
                      </div>
                      <div className="form-group">
                        <label>Middle Name</label>
                        <input type="text" name="mother_middle_name" value={formData.mother_middle_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Reyes" />
                      </div>
                      <div className="form-group">
                        <label>Maiden Last Name</label>
                        <input type="text" name="mother_last_name" value={formData.mother_last_name} onChange={handleInputChange} maxLength="50" placeholder="e.g. Garcia" />
                      </div>
                      <div className="form-group">
                        <label>Suffix</label>
                        <input type="text" name="mother_suffix" value={formData.mother_suffix} onChange={handleInputChange} maxLength="10" placeholder="Optional" />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Occupation</label>
                        <input type="text" name="mother_occupation" value={formData.mother_occupation} onChange={handleInputChange} disabled={formData.mother_deceased} maxLength="50" placeholder="e.g. Housewife" />
                      </div>
                      <div className="form-group">
                        <label>Contact Number</label>
                        <input type="tel" name="mother_phone_number" value={formData.mother_phone_number} onChange={handleInputChange} disabled={formData.mother_deceased} maxLength="11" pattern="09[0-9]{9}" placeholder="e.g. 09123456789" />
                      </div>
                      <div className="form-group">
                        <label>Birthdate</label>
                        <input type="date" name="mother_birthdate" max={maxDate16} min={minDate} value={formData.mother_birthdate} onChange={handleInputChange} disabled={formData.mother_deceased} />
                      </div>
                      <div className="form-group">
                        <label>Age</label>
                        <input type="number" name="mother_age" value={formData.mother_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" />
                      </div>
                      <div className="form-group">
                        <label>Religion</label>
                        <input type="text" name="mother_religion" value={formData.mother_religion} onChange={handleInputChange} maxLength="50" placeholder="e.g. Roman Catholic" />
                      </div>
                      <div className="form-group">
                        <label>Nationality</label>
                        <input type="text" name="mother_nationality" value={formData.mother_nationality} onChange={handleInputChange} maxLength="50" placeholder="e.g. Filipino" />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Current Address</label>
                        <input type="text" name="mother_address" value={formData.mother_address} onChange={handleInputChange} disabled={formData.mother_deceased} maxLength="150" placeholder="Full Address" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="form-section">
                  <h3>Additional & Emergency Info</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Spouse's Name</label>
                      <input type="text" name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} maxLength="100" placeholder="Leave blank if none" disabled={isUnderage} />
                    </div>
                    <div className="form-group">
                      <label>Spouse's Occupation</label>
                      <input type="text" name="spouse_occupation" value={formData.spouse_occupation} onChange={handleInputChange} maxLength="50" placeholder="Leave blank if none" disabled={isUnderage} />
                    </div>
                    <div className="form-group">
                      <label>Spouse's Birthdate</label>
                      <input type="date" name="spouse_birthdate" max={maxDate16} min={minDate} value={formData.spouse_birthdate || ''} onChange={handleInputChange} disabled={isUnderage} />
                    </div>
                    <div className="form-group">
                      <label>Spouse's Age</label>
                      <input type="number" name="spouse_age" value={formData.spouse_age ?? ''} onChange={handleInputChange} disabled placeholder="Auto-calculated" />
                    </div>
                    
                    <div className="form-group">
                      <label>Number of Children</label>
                      <input type="number" name="number_of_children" value={formData.number_of_children ?? ''} onChange={handleInputChange} min="0" placeholder="Leave blank if none" />
                    </div>
                    <div className="form-group">
                      <label>Educational Attainment</label>
                      <select name="educational_attainment" value={formData.educational_attainment} onChange={handleInputChange}>
                        <option value="">Select Attainment</option>
                        <option value="Elementary Level">Elementary Level</option>
                        <option value="Elementary Graduate">Elementary Graduate</option>
                        <option value="High School Level">High School Level</option>
                        <option value="High School Graduate">High School Graduate</option>
                        <option value="College Level">College Level</option>
                        <option value="College Graduate">College Graduate</option>
                        <option value="Post-Graduate">Post-Graduate</option>
                        <option value="Vocational">Vocational</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Emergency Contact Name</label>
                      <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} maxLength="100" placeholder="Full Name" />
                    </div>
                    <div className="form-group">
                      <label>Emergency Contact Number</label>
                      <input type="tel" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleInputChange} maxLength="11" pattern="09[0-9]{9}" placeholder="e.g. 09123456789" />
                      <InputHint text="Format: 11 digits starting with 09." />
                    </div>
                  </div>
                </div>

                {/* IDENTIFICATIONS & VERIFICATIONS */}
                <div className="form-section">
                  <h3>Identifications & Verifications</h3>
                  
                  {/* --- UPDATED: Valid ID Upload + Camera --- */}
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Valid ID (Upload Document/Image)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Upload size={16} /> Upload
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleValidIdUpload} />
                      </label>
<<<<<<< HEAD
                      <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('valid_id')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Camera size={16} /> Take Photo
                      </button>
=======
                      
                      {/* --- OPEN CAMERA FOR ID --- */}
                      <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera('valid_id')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Camera size={16} /> Take Photo
                      </button>
                      
>>>>>>> 19bb186efb43aafa8788fa1d392c442219f3c75d
                      {formData.valid_id_url ? (
                        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem' }}><CheckCircle size={14} /> Attached</span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>No file chosen</span>
                      )}
                    </div>
                    <InputHint text="Upload or take a photo of a National ID, Driver's License, Passport, etc. (Max: 5MB)." />
                  </div>

                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Special Status Checkboxes</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="voter_status" checked={formData.voter_status} onChange={handleInputChange} />
                      <span>Registered Voter</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="pwd_status" checked={formData.pwd_status} onChange={handleInputChange} />
                      <span>Person with Disability (PWD)</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="senior_citizen" checked={formData.senior_citizen} onChange={handleInputChange} />
                      <span>Senior Citizen</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="other_id_status" checked={formData.other_id_status} onChange={handleInputChange} />
                      <span>Other ID (Barangay ID, Postal, etc.)</span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <><div className="spinner-small"></div>Saving...</>
                  ) : (
                    <><Save size={20} />{editingResident ? 'Update Resident' : 'Add Resident'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BRAND NEW LIVE CAMERA MODAL --- */}
      {activeCamera && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>
                {activeCamera === 'photo' ? 'Take Resident Photo' : activeCamera === 'proof' ? 'Take Photo of Proof of Residency' : 'Take Photo of Valid ID'}
              </h3>
              <button className="btn-icon" onClick={() => setActiveCamera(null)}><X size={20} /></button>
            </div>
            
            {/* FIXED WEBCAM CONSTRAINTS HERE */}
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
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveCamera(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={capturePhoto}>
                <Camera size={18} style={{ marginRight: '8px' }} /> Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- Auto-Computation Helpers ---
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  if (birthDate > today) return 'Invalid';

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age > 150 || age < 0) return 'Invalid';

  return age;
}

function calculateResidencyYears(startDate) {
  if (!startDate) return 0;
  const today = new Date();
  const start = new Date(startDate);
  
  if (start > today) return 0;

  let years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) {
    years--;
  }
  return years < 0 ? 0 : years;
}

export default ResidentsPage;