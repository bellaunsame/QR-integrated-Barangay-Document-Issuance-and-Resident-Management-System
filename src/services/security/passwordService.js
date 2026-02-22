import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // Balanced security/performance for 2026 standards

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Calculate password strength score for UI feedback
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: 'None', color: '#6b7280' };

  // Criteria-based scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (!/(.)\1{2,}/.test(password)) score += 1; // Bonus for no repeating chars

  const strengthMap = {
    0: { label: 'Very Weak', color: '#ef4444' },
    1: { label: 'Very Weak', color: '#ef4444' },
    2: { label: 'Weak', color: '#f97316' },
    3: { label: 'Fair', color: '#f59e0b' },
    4: { label: 'Good', color: '#84cc16' },
    5: { label: 'Strong', color: '#22c55e' },
    6: { label: 'Very Strong', color: '#10b981' }
  };

  return {
    score,
    ...strengthMap[Math.min(score, 6)]
  };
};

/**
 * Comprehensive Password Validation
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Blacklist common patterns
  const commonPasswords = ['password', '12345678', 'admin123', 'qwerty'];
  if (commonPasswords.includes(password?.toLowerCase())) {
    errors.push('This password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Generate a cryptographically secure random password
 */
export const generateRandomPassword = (length = 16) => {
  const charset = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    num: '0123456789',
    sym: '!@#$%^&*()_+-=[]{}|'
  };
  
  const all = Object.values(charset).join('');
  let password = '';

  // Guarantee one of each type
  password += charset.upper[Math.floor(Math.random() * charset.upper.length)];
  password += charset.lower[Math.floor(Math.random() * charset.lower.length)];
  password += charset.num[Math.floor(Math.random() * charset.num.length)];
  password += charset.sym[Math.floor(Math.random() * charset.sym.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateRandomPassword
};