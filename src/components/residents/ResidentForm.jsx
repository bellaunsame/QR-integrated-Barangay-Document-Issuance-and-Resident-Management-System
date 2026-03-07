import { useState } from 'react';
import { validateForm } from '../../services/security/inputSanitizer';
import { Input } from '../common';
import { Save, X, User, MapPin, Phone, Mail, Calendar, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast'; 
import './ResidentForm.css';

/**
 * ResidentForm Component
 * Form for adding or editing resident information (Single Page Version)
 */
const ResidentForm = ({ resident = null, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    first_name: resident?.first_name || '',
    middle_name: resident?.middle_name || '',
    last_name: resident?.last_name || '',
    suffix: resident?.suffix || '',
    date_of_birth: resident?.date_of_birth || '',
    place_of_birth: resident?.place_of_birth || '',
    gender: resident?.gender || 'Male',
    civil_status: resident?.civil_status || 'Single',
    nationality: resident?.nationality || 'Filipino',
    house_number: resident?.house_number || '',
    street: resident?.street || '',
    purok: resident?.purok || '',
    barangay: resident?.barangay || '',
    city_municipality: resident?.city_municipality || '',
    province: resident?.province || '',
    zip_code: resident?.zip_code || '',
    residency_type: resident?.residency_type || 'Permanent',
    residency_start_date: resident?.residency_start_date || '',
    mobile_number: resident?.mobile_number || '',
    email: resident?.email || '',
    occupation: resident?.occupation || '',
    monthly_income: resident?.monthly_income || '',
    voter_status: resident?.voter_status || false,
    pwd_status: resident?.pwd_status || false,
    senior_citizen: resident?.senior_citizen || false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];
  const genderOptions = ['Male', 'Female'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Prevent leading spaces and purely space-filled inputs
    let sanitizedValue = type === 'checkbox' ? checked : value;
    if (typeof sanitizedValue === 'string') {
      sanitizedValue = sanitizedValue.trimStart(); 
    }

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Clear error for this field as the user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // AGE RESTRICTION CHECK (>4 Years Old)
      if (formData.date_of_birth) {
        const dob = new Date(formData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        if (age <= 4) {
          toast.error("Registration blocked: Resident must be older than 4 years old.");
          document.querySelector('[name="date_of_birth"]')?.focus();
          setLoading(false);
          return;
        }
      }

      // Define validation rules based on required UI fields
      const validationRules = {
        first_name: { required: true, type: 'name', minLength: 2 },
        last_name: { required: true, type: 'name', minLength: 2 },
        middle_name: { type: 'name' },
        date_of_birth: { required: true, type: 'date' },
        gender: { required: true },
        street: { required: true, type: 'address' },
        barangay: { required: true, type: 'address' },
        city_municipality: { required: true, type: 'address' },
        province: { required: true, type: 'address' },
        mobile_number: { required: true, type: 'phone' },
        email: { required: true, type: 'email' } // <-- Email is now explicitly required
      };

      // Validate form
      const validation = validateForm(formData, validationRules);

      if (!validation.isValid) {
        setErrors(validation.errors);
        setLoading(false);
        
        toast.error('Please fix the highlighted errors before saving.', { duration: 4000 });
        
        const firstErrorKey = Object.keys(validation.errors)[0];
        
        setTimeout(() => {
          const errorElement = document.querySelector(`[name="${firstErrorKey}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus(); 
          }
        }, 100);

        return;
      }

      // Map the validated data to the database schema
      const dbPayload = {
        first_name: validation.sanitizedData.first_name,
        last_name: validation.sanitizedData.last_name,
        middle_name: validation.sanitizedData.middle_name,
        date_of_birth: validation.sanitizedData.date_of_birth,
        gender: validation.sanitizedData.gender,
        contact_number: validation.sanitizedData.mobile_number, 
        full_address: [ 
            validation.sanitizedData.house_number, 
            validation.sanitizedData.street, 
            validation.sanitizedData.purok, 
            validation.sanitizedData.barangay, 
            validation.sanitizedData.city_municipality, 
            validation.sanitizedData.province, 
            validation.sanitizedData.zip_code
        ].filter(Boolean).join(' '),
        
        residency_type: formData.residency_type || 'Permanent',
        residency_start_date: formData.residency_start_date || new Date().toISOString().split('T')[0], 
        qr_code_url: '' 
      };

      await onSubmit(dbPayload);

    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="resident-form">
      {/* Personal Information */}
      <div className="form-section">
        <div className="section-header">
          <User size={20} />
          <h3>Personal Information</h3>
        </div>

        <div className="form-grid">
          <Input
            label="First Name *"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={errors.first_name?.[0]}
            required
          />

          <Input
            label="Middle Name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            error={errors.middle_name?.[0]}
          />

          <Input
            label="Last Name *"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            error={errors.last_name?.[0]}
            required
          />

          <Input
            label="Suffix"
            name="suffix"
            value={formData.suffix}
            onChange={handleChange}
            placeholder="Jr., Sr., III, etc."
          />

          <div className="form-group">
            <label htmlFor="gender">
              Gender <span className="required">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className={errors.gender ? 'has-error' : ''}
            >
              <option value="" disabled>Select gender</option>
              {genderOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.gender && <span className="error-text">{errors.gender[0]}</span>}
          </div>

          <Input
            label="Date of Birth *"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            error={errors.date_of_birth?.[0]}
            required
          />

          <Input
            label="Place of Birth"
            name="place_of_birth"
            value={formData.place_of_birth}
            onChange={handleChange}
            error={errors.place_of_birth?.[0]}
          />

          <div className="form-group">
            <label htmlFor="civil_status">
              Civil Status <span className="required">*</span>
            </label>
            <select
              id="civil_status"
              name="civil_status"
              value={formData.civil_status}
              onChange={handleChange}
              required
              className={errors.civil_status ? 'has-error' : ''}
            >
              <option value="" disabled>Select status</option>
              {civilStatusOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.civil_status && <span className="error-text">{errors.civil_status[0]}</span>}
          </div>

          <Input
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="form-section">
        <div className="section-header">
          <MapPin size={20} />
          <h3>Address Information</h3>
        </div>

        <div className="form-grid">
          <Input
            label="House Number"
            name="house_number"
            value={formData.house_number}
            onChange={handleChange}
          />

          <Input
            label="Street *"
            name="street"
            value={formData.street}
            onChange={handleChange}
            error={errors.street?.[0]}
            required
          />

          <Input
            label="Purok/Sitio"
            name="purok"
            value={formData.purok}
            onChange={handleChange}
          />

          <Input
            label="Barangay *"
            name="barangay"
            value={formData.barangay}
            onChange={handleChange}
            error={errors.barangay?.[0]}
            required
          />

          <Input
            label="City/Municipality *"
            name="city_municipality"
            value={formData.city_municipality}
            onChange={handleChange}
            error={errors.city_municipality?.[0]}
            required
          />

          <Input
            label="Province *"
            name="province"
            value={formData.province}
            onChange={handleChange}
            error={errors.province?.[0]}
            required
          />

          <Input
            label="ZIP Code"
            name="zip_code"
            value={formData.zip_code}
            onChange={handleChange}
            placeholder="4500"
          />

          <div className="form-group">
            <label htmlFor="residency_type">
              Residency Type <span className="required">*</span>
            </label>
            <select
              id="residency_type"
              name="residency_type"
              value={formData.residency_type}
              onChange={handleChange}
              required
            >
              <option value="Permanent">Permanent</option>
              <option value="Tenant">Tenant</option>
              <option value="Boarder">Boarder</option>
            </select>
          </div>

          <Input
            label="Date Started Residing"
            name="residency_start_date"
            type="date"
            value={formData.residency_start_date}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="form-section">
        <div className="section-header">
          <Phone size={20} />
          <h3>Contact Information</h3>
        </div>

        <div className="form-grid">
          <Input
            label="Mobile Number *"
            name="mobile_number"
            icon={<Phone size={18} />}
            value={formData.mobile_number}
            onChange={handleChange}
            error={errors.mobile_number?.[0]}
            placeholder="09XX-XXX-XXXX"
            required
          />

          <Input
            label="Email Address *"
            name="email"
            type="email"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={handleChange}
            error={errors.email?.[0]}
            placeholder="email@example.com"
            required
          />
        </div>
      </div>

      {/* Employment Information */}
      <div className="form-section">
        <div className="section-header">
          <Briefcase size={20} />
          <h3>Employment Information</h3>
        </div>

        <div className="form-grid">
          <Input
            label="Occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            placeholder="e.g., Teacher, Farmer, etc."
          />

          <Input
            label="Monthly Income"
            name="monthly_income"
            type="number"
            value={formData.monthly_income}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Status Checkboxes */}
      <div className="form-section">
        <div className="section-header">
          <Calendar size={20} />
          <h3>Status Information</h3>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="voter_status"
              checked={formData.voter_status}
              onChange={handleChange}
            />
            <span>Registered Voter</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="pwd_status"
              checked={formData.pwd_status}
              onChange={handleChange}
            />
            <span>Person with Disability (PWD)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="senior_citizen"
              checked={formData.senior_citizen}
              onChange={handleChange}
            />
            <span>Senior Citizen</span>
          </label>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="form-error">
          {errors.submit[0]}
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={20} />
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              {resident ? 'Update' : 'Save'} Resident
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ResidentForm;