import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { generateQRData, generateQRCodeImage } from '../services/qrCodeService';
import { generateResidentIDImage, downloadResidentID } from '../services/idGenerator'; 
import { sendQRCodeEmail } from '../services/emailService';
import toast from 'react-hot-toast';

// Security & Utils
import { validateForm } from '../services/security/inputSanitizer';
import { logDataModification, ACTIONS } from '../services/security/auditLogger';
import { calculateAge, getEmptyFormData } from '../utils/residentUtils';

// Sub-components
import ResidentViewModal from '../components/residents/ResidentViewModal';
import ResidentFormModal from '../components/residents/ResidentFormModal';
import CameraCaptureModal from '../components/residents/CameraCaptureModal';

import { Users, Plus, Search, Edit2, Trash2, QrCode, Mail, Download, Eye, User } from 'lucide-react';
import './ResidentsPage.css';

const ResidentsPage = () => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  
  // Data States
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [viewingResident, setViewingResident] = useState(null); 
  const [editingResident, setEditingResident] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null); 
  
  const [formData, setFormData] = useState(getEmptyFormData({
    barangay: getSetting('barangay_name', 'Barangay'),
    city_municipality: getSetting('city_municipality', ''),
    province: getSetting('province', '')
  }));
  const [errors, setErrors] = useState({});
  const webcamRef = useRef(null);

  // --- DATE RESTRICTIONS ---
  const todayDateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const maxDate = todayDateStr; 
  
  const date16 = new Date();
  date16.setFullYear(date16.getFullYear() - 16);
  const maxDate16 = date16.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const minDate = "1870-01-01"; 

  // --- COMPUTE CURRENT AGE FOR UI LOCKING ---
  const currentResidentAge = calculateAge(formData.date_of_birth);
  const isUnderage = currentResidentAge !== 'N/A' && currentResidentAge !== 'Invalid' && currentResidentAge < 16;

  useEffect(() => { loadResidents(); }, []);
  useEffect(() => { filterResidents(); }, [searchTerm, residents]);

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await db.residents.getAll();
      setResidents(data);
      setFilteredResidents(data);
    } catch (error) {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    if (!searchTerm) return setFilteredResidents(residents);
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
           if (name === 'date_of_birth' && age !== 'N/A' && age !== 'Invalid' && age < 16) {
             updated.civil_status = 'Single';
             updated.spouse_name = ''; updated.spouse_occupation = ''; updated.spouse_birthdate = ''; updated.spouse_age = '';
           }
        } else {
           if (name === 'father_birthdate') updated.father_age = '';
           if (name === 'mother_birthdate') updated.mother_age = '';
           if (name === 'spouse_birthdate') updated.spouse_age = '';
        }
      }
      return updated;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > (fieldName === 'photo_url' ? 2 : 5) * 1024 * 1024) { 
        toast.error(`File must be less than ${fieldName === 'photo_url' ? '2MB' : '5MB'}`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
        if (fieldName !== 'photo_url') toast.success("File attached!");
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (activeCamera === 'photo') {
      setFormData(prev => ({ ...prev, photo_url: imageSrc })); toast.success("Photo captured!");
    } else if (activeCamera === 'proof') {
      setFormData(prev => ({ ...prev, proof_of_residency_url: imageSrc })); toast.success("Proof captured!");
    } else if (activeCamera === 'valid_id') {
      setFormData(prev => ({ ...prev, valid_id_url: imageSrc })); toast.success("ID captured!");
    }
    setActiveCamera(null); 
  }, [webcamRef, activeCamera]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mainAge = calculateAge(formData.date_of_birth);
    if (mainAge === 'Invalid') return toast.error('Invalid Date of Birth.');

    const validationRules = {
      first_name: { required: true, type: 'name' }, last_name: { required: true, type: 'name' },
      mobile_number: { required: true, type: 'phone' }, date_of_birth: { required: true, type: 'date' },
      full_address: { required: true, type: 'address' }, barangay: { required: true, type: 'address' }
    };
    const validation = validateForm(formData, validationRules);

    if (!validation.isValid) {
      setErrors(validation.errors); return toast.error('Please fix the form errors');
    }

    setLoading(true);
    try {
      const sanitizedData = { ...formData, ...validation.sanitizedData };
      sanitizedData.father_name = [sanitizedData.father_first_name, sanitizedData.father_middle_name, sanitizedData.father_last_name, sanitizedData.father_suffix].filter(Boolean).join(' ') || sanitizedData.father_name;
      sanitizedData.mother_name = [sanitizedData.mother_first_name, sanitizedData.mother_middle_name, sanitizedData.mother_last_name, sanitizedData.mother_suffix].filter(Boolean).join(' ') || sanitizedData.mother_name;

      const safeKeys = Object.keys(getEmptyFormData());
      const payload = {};
      safeKeys.forEach(key => { if (sanitizedData[key] !== undefined) payload[key] = sanitizedData[key]; });
      Object.keys(payload).forEach(key => { if (payload[key] === "") payload[key] = null; });

      payload.number_of_children = payload.number_of_children === null ? null : parseInt(payload.number_of_children, 10);
      payload.father_age = payload.father_age === null ? null : parseInt(payload.father_age, 10);
      payload.mother_age = payload.mother_age === null ? null : parseInt(payload.mother_age, 10);
      payload.spouse_age = payload.spouse_age === null ? null : parseInt(payload.spouse_age, 10);
      payload.monthly_income = payload.monthly_income === null ? null : parseFloat(payload.monthly_income);

      let res;
      if (editingResident) {
        res = await db.residents.update(editingResident.id, payload);
        await logDataModification(user.id, 'residents', editingResident.id, ACTIONS.RESIDENT_UPDATED, editingResident, payload);
        await generateQRForResident({ id: editingResident.id, ...payload });
        toast.success('Resident updated');
      } else {
        payload.created_by = user.id;
        res = await db.residents.create(payload);
        await logDataModification(user.id, 'residents', res.id, ACTIONS.RESIDENT_CREATED, null, payload);
        await generateQRForResident(res);
        toast.success('Resident added');
      }
      await loadResidents();
      closeModal();
    } catch (error) { toast.error('Failed to save resident'); } 
    finally { setLoading(false); }
  };

  const generateQRForResident = async (resident) => {
    try {
      const qrData = generateQRData(resident);
      const qrCodeUrl = await generateQRCodeImage(qrData);
      await db.residents.update(resident.id, { qr_code_data: qrData, qr_code_url: qrCodeUrl });

      if (resident.email) {
        try {
          const { blob } = await generateResidentIDImage(resident);
          const filePath = `id_cards/${resident.id}_id_card.jpg`;
          await supabase.storage.from('documents').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
          const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
          await sendQRCodeEmail(resident, data.publicUrl);
          await db.residents.update(resident.id, { qr_sent_at: new Date().toISOString() });
        } catch (e) { toast('QR generated but email failed', { icon: '⚠️' }); }
      }
    } catch (error) { console.error(error); }
  };

  const handleResendQR = async (resident) => {
    if (!resident.email) return toast.error('No email address');
    try {
      setLoading(true); toast.loading('Sending email...', { id: 'qr' });
      const { blob } = await generateResidentIDImage(resident);
      const filePath = `id_cards/${resident.id}_id_card.jpg`;
      await supabase.storage.from('documents').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
      await sendQRCodeEmail(resident, data.publicUrl);
      await db.residents.update(resident.id, { qr_sent_at: new Date().toISOString() });
      toast.success('Sent!', { id: 'qr' });
    } catch (e) { toast.error('Failed to send', { id: 'qr' }); } 
    finally { setLoading(false); }
  };

  const handleDownloadQR = async (res) => {
    try { const tid = toast.loading('Generating...'); await downloadResidentID(res); toast.success('Downloaded!', { id: tid }); } 
    catch (e) { toast.error('Failed to generate ID'); }
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    const safeData = { ...resident };
    Object.keys(safeData).forEach(k => { if (safeData[k] === null) safeData[k] = ''; });
    setFormData(safeData); setErrors({}); setShowModal(true);
  };

  const handleDelete = async (resident) => {
    if (!window.confirm(`Delete ${resident.first_name} ${resident.last_name}?`)) return;
    try {
      setLoading(true); await db.residents.delete(resident.id);
      await logDataModification(user.id, 'residents', resident.id, ACTIONS.RESIDENT_DELETED, resident, null);
      toast.success('Deleted'); await loadResidents();
    } catch (e) { toast.error('Delete failed'); } 
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditingResident(null);
    setFormData(getEmptyFormData({ barangay: getSetting('barangay_name', 'Barangay'), city_municipality: getSetting('city_municipality', ''), province: getSetting('province', '') }));
    setErrors({}); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingResident(null); setErrors({}); };

  return (
    <div className="residents-page">
      <div className="page-header">
        <div><h1>Residents Management</h1><p>Manage barangay residents, update info, and generate QR codes</p></div>
        {user?.role !== 'view_only' && (
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={20} /> Add New</button>
        )}
      </div>

      <div className="residents-controls">
        <div className="search-box"><Search size={20} /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="residents-count"><Users size={18} /><span>{filteredResidents.length} residents</span></div>
      </div>

      {loading && !showModal && !viewingResident ? (
        <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr><th>Name</th><th>Address</th><th>Contact</th><th style={{textAlign:'center'}}>Docs</th><th>Age/Gender</th><th>QR</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredResidents.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="resident-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {r.photo_url ? <img src={r.photo_url} alt="pic" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94a3b8"/></div>}
                        <div style={{ display: 'flex', flexDirection: 'column' }}><strong>{r.first_name} {r.last_name} {r.suffix}</strong><small>{r.civil_status}</small></div>
                      </div>
                    </td>
                    <td>{r.full_address}, {r.barangay}</td>
                    <td><div className="contact-cell"><span>{r.mobile_number || 'N/A'}</span><small>{r.email || 'No email'}</small></div></td>
                    <td style={{ textAlign: 'center' }}><span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>{r.document_requests?.length || 0}</span></td>
                    <td>{calculateAge(r.date_of_birth)} yrs / {r.gender}</td>
                    <td>{r.qr_code_url ? <span className="badge badge-success"><QrCode size={14} /> Yes</span> : <span className="badge badge-warning">Pending</span>}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => setViewingResident(r)}><Eye size={18} /></button>
                        {user?.role !== 'view_only' && (
                          <>
                            <button className="btn-icon" onClick={() => handleDownloadQR(r)}><Download size={18} /></button>
                            <button className="btn-icon" onClick={() => handleResendQR(r)} disabled={!r.email}><Mail size={18} /></button>
                            <button className="btn-icon" onClick={() => handleEdit(r)}><Edit2 size={18} /></button>
                            <button className="btn-icon btn-danger" onClick={() => handleDelete(r)}><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- RENDER ABSTRACTIONS --- */}
      <ResidentViewModal resident={viewingResident} onClose={() => setViewingResident(null)} onEdit={() => { setViewingResident(null); handleEdit(viewingResident); }} userRole={user?.role} />
      
      {showModal && (
        <ResidentFormModal editingResident={editingResident} formData={formData} errors={errors} loading={loading} maxDate={maxDate} minDate={minDate} maxDate16={maxDate16} isUnderage={isUnderage} handleInputChange={handleInputChange} handleImageUpload={(e) => handleFileUpload(e, 'photo_url')} handleProofUpload={(e) => handleFileUpload(e, 'proof_of_residency_url')} handleValidIdUpload={(e) => handleFileUpload(e, 'valid_id_url')} setActiveCamera={setActiveCamera} handleSubmit={handleSubmit} closeModal={closeModal} />
      )}
      
      <CameraCaptureModal activeCamera={activeCamera} webcamRef={webcamRef} onClose={() => setActiveCamera(null)} onCapture={capturePhoto} />
    </div>
  );
};

export default ResidentsPage;