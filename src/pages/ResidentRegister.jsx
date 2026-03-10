import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react'; // <-- Added for Success UI
import ResidentFormModal from '../components/residents/ResidentFormModal'; 

// Images and CSS
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const ResidentRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // <-- NEW: Success State
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({ profile: null, validId: null, proof: null }); 

  // --- Handlers for the Wizard ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles(prev => ({ ...prev, profile: file }));
      setFormData(prev => ({ ...prev, photoPreview: URL.createObjectURL(file) }));
    }
  };

  const handleValidIdUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles(prev => ({ ...prev, validId: file }));
      setFormData(prev => ({ ...prev, idPreview: URL.createObjectURL(file) }));
      toast.success('ID Photo attached successfully!');
    }
  };

  const handleProofUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles(prev => ({ ...prev, proof: file }));
      setFormData(prev => ({ ...prev, proof_of_residency_url: 'attached' })); 
      toast.success('Proof of Residency attached!');
    }
  };

  // --- Final Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!files.validId) {
      toast.error('You must upload a Valid ID on Step 4 to register.');
      setLoading(false);
      return;
    }

    try {
      // 1. Check if email exists
      const { data: existingResident } = await supabase
        .from('residents')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingResident) {
        toast.error('An account with this email already exists.');
        setLoading(false);
        return;
      }

      const safeLastName = formData.last_name?.replace(/\s+/g, '') || 'Resident';

      // 2. Upload Valid ID
      const idExt = files.validId.name.split('.').pop();
      const idName = `ID_${Date.now()}_${safeLastName}.${idExt}`;
      const { error: idError } = await supabase.storage.from('resident_ids').upload(idName, files.validId);
      if (idError) throw idError;
      const { data: idUrlData } = supabase.storage.from('resident_ids').getPublicUrl(idName);

      // 3. Upload Profile Photo (Optional)
      let photoUrl = null;
      if (files.profile) {
        const photoExt = files.profile.name.split('.').pop();
        const photoName = `Profile_${Date.now()}_${safeLastName}.${photoExt}`;
        await supabase.storage.from('resident_ids').upload(photoName, files.profile);
        const { data: photoUrlData } = supabase.storage.from('resident_ids').getPublicUrl(photoName);
        photoUrl = photoUrlData.publicUrl;
      }

      // 4. Upload Proof of Residency (Optional)
      let proofUrl = null;
      if (files.proof) {
        const proofExt = files.proof.name.split('.').pop();
        const proofName = `Proof_${Date.now()}_${safeLastName}.${proofExt}`;
        await supabase.storage.from('resident_ids').upload(proofName, files.proof);
        const { data: proofUrlData } = supabase.storage.from('resident_ids').getPublicUrl(proofName);
        proofUrl = proofUrlData.publicUrl;
      }

      // 5. Build Payload
      const dbPayload = {
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        suffix: formData.suffix || null,
        date_of_birth: formData.date_of_birth,
        place_of_birth: formData.place_of_birth || null,
        gender: formData.gender,
        civil_status: formData.civil_status,
        
        full_address: formData.full_address,
        purok: formData.purok || 'Purok 1',
        barangay: 'Dos',                   
        city_municipality: 'Calamba City', 
        province: 'Laguna',                
        
        residency_type: formData.residency_type || 'Permanent',
        mobile_number: formData.mobile_number, 
        email: formData.email,
        voter_status: formData.voter_status || false,
        pwd_status: formData.pwd_status || false,
        senior_citizen: formData.senior_citizen || false,
        photo_url: photoUrl,
        id_image_url: idUrlData.publicUrl,
        proof_of_residency_url: proofUrl,
        account_status: 'Pending'
      };

      // 6. Save to Database
      const { error: dbError } = await supabase.from('residents').insert([dbPayload]);

      if (dbError) throw dbError;

      // --- Trigger Success View ---
      setIsSuccess(true);
      
    } catch (error) {
      console.error(error); 
      toast.error(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate16 = new Date();
  maxDate16.setFullYear(maxDate16.getFullYear() - 16);

  // ==========================================
  // RENDER SUCCESS SCREEN (If isSuccess is true)
  // ==========================================
  if (isSuccess) {
    return (
      <div className="login-page">
        {/* Background is kept to look seamless */}
        <div className="login-background">
          <div className="scrolling-wrapper">
            <div className="scrolling-track">
              {[...Array(4)].map((_, setIndex) => (
                <div key={setIndex} className="image-set">
                  {backgroundImages.map((img, index) => (
                    <img key={`${setIndex}-${index}`} src={img} alt={`background ${index + 1}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="overlay-gradient" style={{ background: 'linear-gradient(135deg, var(--primary-900) 0%, var(--primary-800) 100%)' }}></div>
        </div>

        <div className="login-card" style={{ maxWidth: '450px', width: '100%', margin: '0 20px', position: 'relative', zIndex: 10, textAlign: 'center', padding: '3rem 2.5rem', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#f0fdf4', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '8px solid #dcfce7' }}>
            <ShieldCheck size={40} color="#16a34a" />
          </div>
          
          <h2 style={{ color: '#1e293b', marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '700' }}>Registration Sent!</h2>
          
          <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '2rem', fontSize: '1.05rem' }}>
            Magandang araw! Your application has been successfully submitted to the <strong>Barangay Dos</strong> administration. 
          </p>
          
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--primary-500)', textAlign: 'left', marginBottom: '2rem' }}>
            <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <strong>Next Steps:</strong> Our staff will verify your documents. Once approved, you will receive an email with a <strong>Temporary Password</strong> to access your account.
            </p>
          </div>

          <button 
            onClick={() => navigate('/resident-login')} 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)', color: 'white', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s' }}
          >
            Got it, take me to Login
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // NORMAL REGISTRATION WIZARD
  // ==========================================
  return (
    <div className="login-page">
      <div className="login-background">
        <div className="scrolling-wrapper">
          <div className="scrolling-track">
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="image-set">
                {backgroundImages.map((img, index) => (
                  <img key={`${setIndex}-${index}`} src={img} alt={`background ${index + 1}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="overlay-gradient"></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        <ResidentFormModal 
          isPublic={true} 
          formData={formData}
          loading={loading}
          maxDate={today}
          minDate="1900-01-01"
          maxDate16={maxDate16.toISOString().split('T')[0]}
          isUnderage={false}
          handleInputChange={handleInputChange}
          handleImageUpload={handleImageUpload}
          handleValidIdUpload={handleValidIdUpload}
          handleProofUpload={handleProofUpload} 
          handleSubmit={handleSubmit}
          closeModal={() => navigate('/')}
        />
      </div>
    </div>
  );
};

export default ResidentRegister;