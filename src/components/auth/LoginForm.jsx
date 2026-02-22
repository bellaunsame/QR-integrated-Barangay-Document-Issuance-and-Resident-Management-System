import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../hooks/useForm';
import { validatePasswordStrength } from '../../services/security/passwordService';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import './LoginForm.css';

/**
 * LoginForm Component
 * Handles user authentication with real-time password strength feedback.
 */
const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);

  // Form Validation Logic
  const validate = (values) => {
    const errors = {};
    
    if (!values.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    return errors;
  };

  // Form Submission Logic
  const handleFormSubmit = async (values) => {
    try {
      setError('');
      await login(values.email, values.password);
      
      if (rememberMe) {
        localStorage.setItem('remembered_email', values.email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit
  } = useForm(
    {
      email: localStorage.getItem('remembered_email') || '',
      password: ''
    },
    handleFormSubmit,
    validate
  );

  // Intercepting handleChange to check password strength
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    handleChange(e); // Update useForm state
    
    if (val) {
      const strengthCheck = validatePasswordStrength(val);
      setPasswordStrength(strengthCheck.strength);
    } else {
      setPasswordStrength(null);
    }
  };

  return (
    <div className="login-form-container">
      <form onSubmit={onSubmit} className="login-form">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="your.email@example.com"
            className={errors.email && touched.email ? 'error' : ''}
            autoComplete="email"
          />
          {errors.email && touched.email && (
            <span className="error-message">{errors.email}</span>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={values.password}
              onChange={handlePasswordChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              className={errors.password && touched.password ? 'error' : ''}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password Strength Indicator Visuals */}
          {passwordStrength && (
            <div className="password-strength-container">
              <div className="strength-bar-bg">
                <div 
                  className="strength-bar-fill"
                  style={{
                    width: `${(passwordStrength.score / 9) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }}
                />
              </div>
              <span className="strength-label" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            </div>
          )}

          {errors.password && touched.password && (
            <span className="error-message">{errors.password}</span>
          )}
        </div>

        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <a href="#" className="forgot-password-link">Forgot password?</a>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><div className="spinner-small"></div> Signing in...</>
          ) : (
            <><LogIn size={20} /> Sign In</>
          )}
        </button>

        
      </form>
    </div>
  );
};

export default LoginForm;