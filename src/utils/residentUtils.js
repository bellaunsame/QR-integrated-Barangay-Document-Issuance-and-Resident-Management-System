// ==========================================
// AUTO-COMPUTATION & HELPER FUNCTIONS
// ==========================================

export function calculateAge(dateOfBirth) {
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

export function calculateResidencyYears(startDate) {
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

// Safely joins parent names without causing "undefined" errors
export function formatParentName(resident, prefix) {
  if (!resident) return 'N/A';
  const first = resident[`${prefix}_first_name`];
  const middle = resident[`${prefix}_middle_name`];
  const last = resident[`${prefix}_last_name`];
  const suffix = resident[`${prefix}_suffix`];
  const legacy = resident[`${prefix}_name`];

  if (first || last) return [first, middle, last, suffix].filter(Boolean).join(' ');
  return legacy || 'N/A';
}

// ==========================================
// INITIAL FORM DATA STATE
// ==========================================

export function getEmptyFormData(settings = {}) {
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
    blood_type: '', 
    educational_attainment: '', 
    
    full_address: '',
    purok: '',
    // Settings passed in from the UI component
    barangay: settings.barangay || 'Barangay',
    city_municipality: settings.city_municipality || '',
    province: settings.province || '',
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

    // Father Info
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
    father_blood_type: '',
    father_nationality: 'Filipino',

    // Mother Info
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
    mother_blood_type: '',
    mother_nationality: 'Filipino',

    // Verifications & IDs
    voter_status: false,
    pwd_status: false,
    senior_citizen: false,
    other_id_status: false,
    valid_id_url: ''
  };
}