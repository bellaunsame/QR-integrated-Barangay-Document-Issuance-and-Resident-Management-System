import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { db, supabase } from '../services/supabaseClient'; 
import { generateQRData, generateQRCodeImage } from '../services/qrCodeService';
import { generateResidentIDImage, downloadResidentID } from '../services/idGenerator'; 
import { sendQRCodeEmail } from '../services/emailService';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser'; 
import imageCompression from 'browser-image-compression';

// Security & Utils
import { validateForm } from '../services/security/inputSanitizer';
import { logDataModification, ACTIONS } from '../services/security/auditLogger';
import { calculateAge, getEmptyFormData } from '../utils/residentUtils';

// UI Components & Hooks
import { Pagination } from '../components/common';
import { usePagination } from '../hooks'; 
import ResidentViewModal from '../components/residents/ResidentViewModal';
import ResidentFormModal from '../components/residents/ResidentFormModal';
import CameraCaptureModal from '../components/residents/CameraCaptureModal';

// Icons 
import { Users, Plus, Search, Edit2, Archive, QrCode, Mail, Download, Eye, User, RefreshCw, Home, Clock, Check, X, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import './ResidentsPage.css';

// --- HELPER: GENERATE RANDOM TEMPORARY PASSWORD ---
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const ResidentsPage = () => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  
  // --- SECURITY CHECK: Restrict View Only & Captain ---
  const canEdit = !['view_only', 'barangay_captain'].includes(user?.role);

  // Data States
  const [allResidents, setAllResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // VIEW MODE STATE: active, pending, or archived
  const [viewMode, setViewMode] = useState('active'); 

  // ==========================================
  // PAGINATION HOOK
  // ==========================================
  const ITEMS_PER_PAGE = 10;
  const { 
    currentPage, 
    totalPages, 
    currentData: currentResidents, 
    goToPage 
  } = usePagination(filteredResidents, ITEMS_PER_PAGE); 

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [viewingResident, setViewingResident] = useState(null); 
  const [editingResident, setEditingResident] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null); 
  
  const [formData, setFormData] = useState({
    ...getEmptyFormData({
      barangay: getSetting('barangay_name', 'Barangay'),
      city_municipality: getSetting('city_municipality', ''),
      province: getSetting('province', '')
    }),
    residency_type: 'Permanent' 
  });
  const [errors, setErrors] = useState({});
  const webcamRef = useRef(null);

  // DATE RESTRICTIONS
  const todayDateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const maxDate = todayDateStr; 
  
  const date16 = new Date();
  date16.setFullYear(date16.getFullYear() - 16);
  const maxDate16 = date16.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const minDate = "1870-01-01"; 

  const currentResidentAge = calculateAge(formData.date_of_birth);
  const isUnderage = currentResidentAge !== 'N/A' && currentResidentAge !== 'Invalid' && currentResidentAge < 16;

  useEffect(() => { loadResidents(); }, []);
  useEffect(() => { filterResidents(); }, [searchTerm, allResidents, viewMode]);

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await db.residents.getAll();
      setAllResidents(data); 
    } catch (error) {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    let filtered = allResidents.filter(res => {
      if (viewMode === 'archived') return res.status === 'archived';
      if (viewMode === 'pending') return res.account_status === 'Pending' && res.status !== 'archived';
      return res.account_status !== 'Pending' && res.status !== 'archived';
    });

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(resident => 
        resident.first_name.toLowerCase().includes(search) ||
        resident.last_name.toLowerCase().includes(search) ||
        resident.email?.toLowerCase().includes(search) ||
        resident.mobile_number?.includes(search)
      );
    }

    setFilteredResidents(filtered);
  };

  const pendingCount = allResidents.filter(res => res.account_status === 'Pending' && res.status !== 'archived').length;

  const checkIfTransient = (dateString) => {
    if (!dateString) return false;
    const start = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return start > sixMonthsAgo;
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

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) { 
      toast.error("File is too large! Please upload a file under 15MB.");
      return;
    }

    const toastId = toast.loading('Optimizing image...');

    try {
      const options = {
        maxSizeMB: fieldName === 'photo_url' ? 0.2 : 0.5, 
        maxWidthOrHeight: 1200,
        useWebWorker: true
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
        toast.success("Image optimized and attached!", { id: toastId });
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to optimize image.", { id: toastId });
    }
  };

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (activeCamera === 'photo') {
      setFormData(prev => ({ ...prev, photo_url: imageSrc })); toast.success("Photo captured!");
    } else if (activeCamera === 'proof') {
      setFormData(prev => ({ ...prev, proof_of_residency_url: imageSrc })); toast.success("Proof captured!");
    } else if (activeCamera === 'valid_id') {
      setFormData(prev => ({ ...prev, id_image_url: imageSrc })); toast.success("ID captured!");
    }
    setActiveCamera(null); 
  }, [webcamRef, activeCamera]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

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
      
      if (!editingResident) {
        const { data: existingResidents, error: searchError } = await supabase
          .from('residents')
          .select('id')
          .ilike('first_name', sanitizedData.first_name.trim())
          .ilike('last_name', sanitizedData.last_name.trim());

        if (searchError) throw searchError;

        if (existingResidents && existingResidents.length > 0) {
          setLoading(false);
          return toast.error(`A resident named ${sanitizedData.first_name} ${sanitizedData.last_name} already exists!`);
        }
      }

      sanitizedData.father_name = [sanitizedData.father_first_name, sanitizedData.father_middle_name, sanitizedData.father_last_name, sanitizedData.father_suffix].filter(Boolean).join(' ') || sanitizedData.father_name;
      sanitizedData.mother_name = [sanitizedData.mother_first_name, sanitizedData.mother_middle_name, sanitizedData.mother_last_name, sanitizedData.mother_suffix].filter(Boolean).join(' ') || sanitizedData.mother_name;

      const safeKeys = Object.keys(getEmptyFormData());
      const payload = {};
      
      safeKeys.forEach(key => { if (sanitizedData[key] !== undefined) payload[key] = sanitizedData[key]; });
      payload.residency_type = sanitizedData.residency_type || 'Permanent';
      Object.keys(payload).forEach(key => { if (payload[key] === "") payload[key] = null; });

      const safeParseInt = (val) => (val === null || val === "" || isNaN(parseInt(val, 10))) ? null : parseInt(val, 10);
      const safeParseFloat = (val) => (val === null || val === "" || isNaN(parseFloat(val))) ? null : parseFloat(val);

      payload.number_of_children = safeParseInt(payload.number_of_children);
      payload.father_age = safeParseInt(payload.father_age);
      payload.mother_age = safeParseInt(payload.mother_age);
      payload.spouse_age = safeParseInt(payload.spouse_age);
      payload.monthly_income = safeParseFloat(payload.monthly_income);

      let res;
      if (editingResident) {
        res = await db.residents.update(editingResident.id, payload);
        await logDataModification(user.id, 'residents', editingResident.id, ACTIONS.RESIDENT_UPDATED, editingResident, payload);
        toast.success('Resident updated');
      } else {
        payload.created_by = user.id;
        payload.status = 'active'; 
        payload.account_status = 'Approved'; 
        payload.is_verified = true; // Auto-verify if added manually by staff
        
        const tempPassword = generateTempPassword();
        payload.password = tempPassword;
        payload.needs_password_change = true;

        res = await db.residents.create(payload);
        await logDataModification(user.id, 'residents', res.id, ACTIONS.RESIDENT_CREATED, null, payload);

        if (payload.email) {
          try {
            await emailjs.send(
              'service_178ko1n',     
              'template_qzkqkvf',    
              {
                to_email: payload.email,
                to_name: payload.first_name,
                barangay_name: "Dos, Calamba",
                email_subject_message: `Your account has been created and verified by the Barangay Admin. You have full access to Document Requests, Equipment Borrowing, and Incident Reporting. Login here: ${window.location.origin}/resident-login`,
                otp_code: tempPassword 
              },
              'pfTdQReY0nVV3CjnY'    
            );
            toast.success('Resident added & email sent!');
          } catch (e) {
            toast.success('Resident added, but email failed to send.');
          }
        } else {
          toast.success('Resident added (No email provided)');
        }
      }
      
      await loadResidents();
      closeModal();
    } catch (error) { 
      toast.error('Failed to save resident'); 
      console.error("SUPABASE ERROR DETAILS:", error); 
    } 
    finally { setLoading(false); }
  };

  const handleResendCredentials = async (resident) => {
    if (!canEdit) return;
    if (!resident.email) return toast.error('No email address');
    try {
      setLoading(true); toast.loading('Sending email...', { id: 'email' });
      
      const tempPassword = generateTempPassword();
      await supabase.from('residents').update({ password: tempPassword, needs_password_change: true }).eq('id', resident.id);

      await emailjs.send(
        'service_178ko1n',     
        'template_qzkqkvf',    
        {
          to_email: resident.email,
          to_name: resident.first_name,
          barangay_name: "Dos, Calamba",
          email_subject_message: `Your password has been reset by the Admin. You can log into the Resident Portal using your email and the new temporary password below. Login here: ${window.location.origin}/resident-login`,
          otp_code: tempPassword 
        },
        'pfTdQReY0nVV3CjnY'    
      );

      toast.success('New credentials sent!', { id: 'email' });
    } catch (e) { 
      toast.error('Failed to send email', { id: 'email' }); 
    } 
    finally { setLoading(false); }
  };

  const handleDownloadQROnly = async (resident) => {
    if (!canEdit) return;
    const toastId = toast.loading("Generating QR Code...");
    try {
      const qrData = generateQRData(resident);
      const qrCodeBase64 = await generateQRCodeImage(qrData, { width: 800, margin: 2 });
      
      const link = document.createElement('a');
      link.href = qrCodeBase64;
      link.download = `Barangay_QR_${resident.first_name}_${resident.last_name}.jpg`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("QR Code downloaded!", { id: toastId });
    } catch (error) {
      console.error("QR Download failed:", error);
      toast.error("Failed to generate QR.", { id: toastId });
    }
  };

  const handleDownloadIDCard = async (res) => {
    if (!canEdit) return;
    try { const tid = toast.loading('Generating ID Card...'); await downloadResidentID(res); toast.success('Downloaded!', { id: tid }); } 
    catch (e) { toast.error('Failed to generate ID'); }
  };

  const handleViewResident = (resident) => {
    const safeResident = { ...resident };
    Object.keys(safeResident).forEach(key => {
      if (safeResident[key] === null) safeResident[key] = '';
    });
    safeResident.age = calculateAge(resident.date_of_birth);
    setViewingResident(safeResident);
  };

  const handleEdit = (resident) => {
    if (!canEdit) return;
    setEditingResident(resident);
    const safeData = { ...resident };
    Object.keys(safeData).forEach(k => { if (safeData[k] === null) safeData[k] = ''; });
    if (!safeData.residency_type) safeData.residency_type = 'Permanent';
    setFormData(safeData); setErrors({}); setShowModal(true);
  };

  const handleApprove = async (resident) => {
    if (!canEdit) return;
    try {
      setLoading(true);
      
      const tempPassword = generateTempPassword();

      // Include is_verified in the payload
      const { error } = await supabase
        .from('residents')
        .update({ 
          account_status: 'Approved',
          is_verified: true,
          password: tempPassword,
          needs_password_change: true 
        })
        .eq('id', resident.id);
        
      if (error) throw error;

      if (resident.email) {
        await emailjs.send(
          'service_178ko1n',     
          'template_qzkqkvf',    
          {
            to_email: resident.email,
            to_name: resident.first_name,
            barangay_name: "Dos, Calamba",
            email_subject_message: `Your account registration has been VERIFIED and APPROVED! You now have full access to Document Requests, Equipment Borrowing, and Blotter Reporting. Login here: ${window.location.origin}/resident-login`,
            otp_code: tempPassword 
          },
          'pfTdQReY0nVV3CjnY'    
        );
        toast.success(`${resident.first_name} verified & approved! Credentials sent to email.`);
      } else {
        toast.success(`${resident.first_name} verified & approved! (No email on file)`);
      }

      await loadResidents();
    } catch (e) { 
      console.error(e);
      toast.error('Failed to approve resident.'); 
    }
    finally { setLoading(false); }
  };

  const handleReject = async (resident, reason = "Registration declined by Barangay Staff.") => {
    if (!canEdit) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('residents').delete().eq('id', resident.id);
      if (error) throw error;
      
      toast.success(`Rejected. Reason recorded: ${reason}`);
      await loadResidents();
      setViewingResident(null); 
    } catch (e) { 
      toast.error('Failed to reject resident'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleArchiveResident = async (resident) => {
    if (!canEdit) return;
    if (!window.confirm(`Are you sure you want to archive ${resident.first_name} ${resident.last_name}?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('residents').update({ status: 'archived' }).eq('id', resident.id);
      if (error) throw error;
      await logDataModification(user.id, 'residents', resident.id, 'RESIDENT_ARCHIVED', resident, { status: 'archived' });
      toast.success('Resident archived successfully'); 
      await loadResidents();
    } catch (e) { toast.error(`Archive failed: ${e.message}`); } 
    finally { setLoading(false); }
  };

  const handleRestoreResident = async (resident) => {
    if (!canEdit) return;
    if (!window.confirm(`Restore ${resident.first_name} ${resident.last_name} back to active residents?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('residents').update({ status: 'active' }).eq('id', resident.id);
      if (error) throw error;
      await logDataModification(user.id, 'residents', resident.id, 'RESIDENT_RESTORED', resident, { status: 'active' });
      toast.success('Resident restored successfully'); 
      await loadResidents();
    } catch (e) { toast.error(`Restore failed: ${e.message}`); } 
    finally { setLoading(false); }
  };

  const openAddModal = () => {
    if (!canEdit) return;
    setEditingResident(null);
    setFormData({
      ...getEmptyFormData({ barangay: getSetting('barangay_name', 'Barangay'), city_municipality: getSetting('city_municipality', ''), province: getSetting('province', '') }),
      residency_type: 'Permanent'
    });
    setErrors({}); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingResident(null); setErrors({}); };

  const exportToCSV = () => {
    if (filteredResidents.length === 0) return toast.error("No residents to export.");

    const headers = ['First Name', 'Middle Name', 'Last Name', 'Suffix', 'Gender', 'Civil Status', 'Date of Birth', 'Age', 'Contact', 'Email', 'Address', 'Purok', 'Residency Type', 'Status'];
    
    const csvRows = filteredResidents.map(r => {
      const safeAddress = `"${(r.full_address || '').replace(/"/g, '""')}"`;
      const age = calculateAge(r.date_of_birth);

      return [
        r.first_name || '', r.middle_name || '', r.last_name || '', r.suffix || '',
        r.gender || '', r.civil_status || '', r.date_of_birth || '',
        age !== 'Invalid' ? age : '', r.mobile_number || r.contact_number || '',
        r.email || '', safeAddress, r.purok || '', r.residency_type || '', r.account_status || ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Barangay_Residents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="residents-page">
        <div className="page-header">
          <div><h1>Residents Management</h1><p>Manage barangay residents, review registrations, and update info</p></div>
          
          {/* HIDE ADD BUTTON IF VIEW ONLY */}
          {canEdit && (
            <button className="btn btn-primary" onClick={openAddModal}><Plus size={20} /> Add New</button>
          )}
        </div>

        <div className="residents-controls">
          <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '250px' }}>
            <div className="search-box">
              <Search size={20} />
              <input type="text" placeholder="Search residents..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); goToPage(1); }} />
            </div>
            
            <button className="btn btn-secondary" onClick={exportToCSV} title="Export to Excel/CSV">
              <FileDown size={20} /> <span className="hide-on-mobile">Export</span>
            </button>
          </div>
          
          <div className="view-toggle">
            <button className={viewMode === 'active' ? 'active-tab' : ''} onClick={() => { setViewMode('active'); goToPage(1); }}>
              <Users size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Active
            </button>
            <button className={viewMode === 'pending' ? 'active-tab' : ''} onClick={() => { setViewMode('pending'); goToPage(1); }} style={{ position: 'relative' }}>
              <Clock size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Pending
              {pendingCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button className={viewMode === 'archived' ? 'active-tab' : ''} onClick={() => { setViewMode('archived'); goToPage(1); }}>
              <Archive size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Archived
            </button>
          </div>
        </div>

        {loading && !showModal && !viewingResident ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
        ) : (
          <>
            {/* DESKTOP VIEW */}
            <div className="card desktop-table-container">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Residency Status</th>
                      <th>Contact</th>
                      <th style={{textAlign:'center'}}>Docs</th>
                      <th>Age/Gender</th>
                      <th>Verification</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResidents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-row" style={{ textAlign: 'center', padding: '3rem' }}>
                          {viewMode === 'archived' ? <Archive size={40} style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }} /> : 
                           viewMode === 'pending' ? <Clock size={40} style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }} /> : 
                           <Users size={40} style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }} />}
                          <p>{viewMode === 'archived' ? 'No archived residents found.' : viewMode === 'pending' ? 'No pending registrations.' : 'No active residents found.'}</p>
                        </td>
                      </tr>
                    ) : (
                      currentResidents.map((r) => (
                        <tr key={r.id} style={{ opacity: viewMode === 'archived' ? 0.7 : 1 }}>
                          <td>
                            <div className="resident-name">
                              {r.photo_url ? <img src={r.photo_url} alt="pic" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94a3b8"/></div>}
                              <div className="resident-name-text"><strong>{r.first_name} {r.last_name} {r.suffix}</strong><small>{r.civil_status}</small></div>
                            </div>
                          </td>
                          <td>{r.full_address}, {r.barangay}</td>
                          <td>
                            <div className="status-cell">
                               <span className={`badge ${r.residency_type === 'Tenant' ? 'badge-tenant' : r.residency_type === 'Boarder' ? 'badge-boarder' : 'badge-permanent'}`}>
                                 <Home size={12} style={{marginRight: '4px', display:'inline'}} /> {r.residency_type || 'Permanent'}
                               </span>
                               {checkIfTransient(r.residency_start_date) && (<span className="badge badge-transient">Transient (&lt;6 Mos)</span>)}
                            </div>
                          </td>
                          <td><div className="contact-cell"><span>{r.mobile_number || r.contact_number || 'N/A'}</span><small>{r.email || 'No email'}</small></div></td>
                          <td style={{ textAlign: 'center' }}><span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>{r.document_requests?.length || 0}</span></td>
                          <td>{calculateAge(r.date_of_birth)} yrs / {r.gender}</td>
                          
                          {/* UPDATED VERIFICATION COLUMN */}
                          <td>
                            {r.account_status === 'Pending' ? (
                              <span className="badge badge-warning">Pending Review</span>
                            ) : r.is_verified ? (
                              <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                                <Check size={12} style={{ marginRight: '4px', display: 'inline' }}/> Verified
                              </span>
                            ) : (
                              <span className="badge badge-secondary" style={{ background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' }}>
                                Unverified
                              </span>
                            )}
                          </td>
                          
                          <td>
                            <div className="action-buttons">
                              <button className="btn-icon" onClick={() => handleViewResident(r)} title="Review/View Details"><Eye size={18} /></button>
                              
                              {/* HIDE ACTIONS IF VIEW ONLY */}
                              {canEdit ? (
                                <>
                                  {viewMode === 'pending' ? (
                                    <>
                                      <button className="btn-icon" style={{color: '#10b981', background: '#d1fae5'}} onClick={() => handleApprove(r)} title="Verify & Approve Resident"><Check size={18} /></button>
                                      <button className="btn-icon" style={{color: '#ef4444', background: '#fee2e2'}} onClick={() => handleReject(r)} title="Reject & Delete"><X size={18} /></button>
                                    </>
                                  ) : viewMode === 'active' ? (
                                    <>
                                      <button className="btn-icon" onClick={() => handleDownloadQROnly(r)} title="Download QR Code Only"><QrCode size={18} /></button>
                                      <button className="btn-icon" onClick={() => handleDownloadIDCard(r)} title="Download Full ID Card"><Download size={18} /></button>
                                      <button className="btn-icon" onClick={() => handleResendCredentials(r)} disabled={!r.email} title="Resend Login Credentials"><Mail size={18} /></button>
                                      
                                      <button className="btn-icon" onClick={() => handleEdit(r)} title="Edit Resident"><Edit2 size={18} /></button>
                                      {user?.role === 'admin' && (
                                        <button className="btn-icon btn-danger" onClick={() => handleArchiveResident(r)} title="Archive Resident"><Archive size={18} /></button>
                                      )}
                                    </>
                                  ) : (
                                    <button className="btn-icon btn-primary" onClick={() => handleRestoreResident(r)} title="Restore Resident"><RefreshCw size={18} /></button>
                                  )}
                                </>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginLeft: '5px' }}>No Access</span>
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

            {/* MOBILE VIEW */}
            <div className="mobile-cards-container">
              {currentResidents.length === 0 ? (
                <div className="empty-row" style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)' }}>{viewMode === 'archived' ? 'No archived residents.' : viewMode === 'pending' ? 'No pending registrations.' : 'No active residents.'}</div>
              ) : (
                currentResidents.map((r) => (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: viewMode === 'archived' ? 0.8 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      {r.photo_url ? <img src={r.photo_url} alt="pic" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#94a3b8"/></div>}
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>{r.first_name} {r.last_name} {r.suffix}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.civil_status} • {calculateAge(r.date_of_birth)} yrs • {r.gender}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                       <span className={`badge ${r.residency_type === 'Tenant' ? 'badge-tenant' : r.residency_type === 'Boarder' ? 'badge-boarder' : 'badge-permanent'}`}>
                         <Home size={12} style={{marginRight: '4px', display:'inline'}} /> {r.residency_type || 'Permanent'}
                       </span>
                       {checkIfTransient(r.residency_start_date) && (<span className="badge badge-transient">Transient (&lt;6 Mos)</span>)}
                    </div>

                    <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Address:</strong> {r.full_address}, {r.barangay}
                    </div>
                    <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Contact:</strong> {r.mobile_number || r.contact_number || 'N/A'} <br/>
                      <strong>Email:</strong> {r.email || 'N/A'}
                    </div>
                    
                    {/* UPDATED VERIFICATION MOBILE */}
                    <div style={{ marginBottom: '12px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span><strong>Docs:</strong> <span style={{color:'var(--primary-600)', fontWeight:'bold'}}>{r.document_requests?.length || 0}</span></span>
                       
                       <span><strong>Status:</strong> {r.account_status === 'Pending' ? <span className="badge badge-warning" style={{fontSize:'0.7rem'}}>Pending Review</span> : r.is_verified ? <span className="badge badge-success" style={{fontSize:'0.7rem', background: '#dcfce7', color: '#166534'}}><Check size={12}/> Verified</span> : <span className="badge badge-secondary" style={{fontSize:'0.7rem', background: '#e2e8f0', color: '#475569'}}>Unverified</span>}</span>
                    </div>

                    <div className="action-buttons" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn-icon" onClick={() => handleViewResident(r)} title="Review Details"><Eye size={18} /></button>
                      
                      {/* HIDE ACTIONS IF VIEW ONLY */}
                      {canEdit ? (
                        <>
                          {viewMode === 'pending' ? (
                            <>
                              <button className="btn-icon" style={{color: '#10b981', background: '#d1fae5'}} onClick={() => handleApprove(r)} title="Verify & Approve"><Check size={18} /></button>
                              <button className="btn-icon" style={{color: '#ef4444', background: '#fee2e2'}} onClick={() => handleReject(r)} title="Reject"><X size={18} /></button>
                            </>
                          ) : viewMode === 'active' ? (
                            <>
                              <button className="btn-icon" onClick={() => handleDownloadQROnly(r)} title="Download QR Code"><QrCode size={18} /></button>
                              <button className="btn-icon" onClick={() => handleDownloadIDCard(r)} title="Download ID Card"><Download size={18} /></button>
                              <button className="btn-icon" onClick={() => handleResendCredentials(r)} disabled={!r.email} title="Resend Credentials"><Mail size={18} /></button>
                              <button className="btn-icon" onClick={() => handleEdit(r)}><Edit2 size={18} /></button>
                              {user?.role === 'admin' && (
                                <button className="btn-icon btn-danger" onClick={() => handleArchiveResident(r)} title="Archive Resident"><Archive size={18} /></button>
                              )}
                            </>
                          ) : (
                            <button className="btn-icon btn-primary" onClick={() => handleRestoreResident(r)} title="Restore Resident"><RefreshCw size={18} /></button>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginLeft: '5px', alignSelf: 'center' }}>No Access</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- INLINE PAGINATION SECTION --- */}
            {filteredResidents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredResidents.length)}</strong> of <strong>{filteredResidents.length}</strong> residents
                </div>
                
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                    <button 
                      type="button"
                      onClick={() => goToPage(currentPage - 1)} 
                      disabled={currentPage === 1}
                      style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === 1 ? '#e2e8f0' : '#fff', color: currentPage === 1 ? '#94a3b8' : 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button 
                          key={pageNumber}
                          type="button"
                          onClick={() => goToPage(pageNumber)}
                          style={{ 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid',
                            borderColor: currentPage === pageNumber ? 'var(--primary-600)' : 'var(--border)',
                            background: currentPage === pageNumber ? 'var(--primary-600)' : '#fff',
                            color: currentPage === pageNumber ? '#fff' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: currentPage === pageNumber ? 'bold' : 'normal'
                          }}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <button 
                      type="button"
                      onClick={() => goToPage(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                      style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === totalPages ? '#e2e8f0' : '#fff', color: currentPage === totalPages ? '#94a3b8' : 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <ResidentViewModal 
          resident={viewingResident} 
          onClose={() => setViewingResident(null)} 
          onEdit={canEdit ? () => { 
            setViewingResident(null); 
            handleEdit(viewingResident); 
          } : null} 
          onApprove={canEdit ? (res) => {
            setViewingResident(null);
            handleApprove(res);
          } : null}
          onReject={canEdit ? handleReject : null}
          userRole={user?.role} 
        />
        
        {showModal && canEdit && (
          <ResidentFormModal 
            editingResident={editingResident} 
            formData={formData} 
            errors={errors} 
            loading={loading} 
            maxDate={maxDate} 
            minDate={minDate} 
            maxDate16={maxDate16} 
            isUnderage={isUnderage} 
            handleInputChange={handleInputChange} 
            handleImageUpload={(e) => handleFileUpload(e, 'photo_url')} 
            handleProofUpload={(e) => handleFileUpload(e, 'proof_of_residency_url')} 
            handleValidIdUpload={(e) => handleFileUpload(e, 'id_image_url')} 
            setActiveCamera={setActiveCamera} 
            handleSubmit={handleSubmit} 
            closeModal={closeModal} 
          />
        )}
        
        <CameraCaptureModal activeCamera={activeCamera} webcamRef={webcamRef} onClose={() => setActiveCamera(null)} onCapture={capturePhoto} />
      </div>
    </>
  );
};

export default ResidentsPage;