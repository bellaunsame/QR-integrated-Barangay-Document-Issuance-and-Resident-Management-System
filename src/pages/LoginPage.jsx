import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, Shield } from 'lucide-react';
import brgylogo from '../assets/brgy.2-icon.png';
import bg1 from '../assets/gallery-1.jpg';
import bg2 from '../assets/gallery-2.jpg';
import bg3 from '../assets/gallery-3.jpg';
import bg4 from '../assets/officials.png';
import bg5 from '../assets/area.JPG';
import './LoginPage.css';

const backgroundImages = [bg1, bg2, bg3, bg4, bg5];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img 
                src={brgylogo} 
                alt="Barangay Logo" 
                className="logo-icon" 
              />
            </div>
            <h1 className="login-title">QR-Integrated BDIS</h1>
            <h2 className="login-title-2">Barangay Dos in City of Calamba</h2>
            <p className="login-subtitle">Sign in to your account to access into the system</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={18} />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit" 
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            
          </div>
        </div>

        <div className="login-info">
          <div className="info-card">
            <h3>Political Administration</h3>
            <p><b>Barangay Chairman:</b> Hon. Joanna De Mesa</p>
            <p><b>Barangay Kagawad:</b> Hon. Amado Melchor Espiritu</p>
            <p><b>Barangay Kagawad:</b> Hon. Denson Valmoria Ramiro</p>
            <p><b>Barangay Kagawad:</b> Hon. Remigio Abellar Gonzales</p>
            <p><b>Barangay Kagawad:</b> Hon. Jose Pingol Villanueva</p>
            <p><b>Barangay Kagawad:</b> Hon. Jerry Cunanan Lasian</p>
            <p><b>Barangay Kagawad:</b> Hon. Mark Christian Sangel Domingo</p>
          </div>
          <div className="info-card">
            <h3>Visit Official Calamba Website</h3>
            <a href="https://www.calambacity.gov.ph">https://www.calambacity.gov.ph</a>
            <h3>Contact Info:</h3>
            <p><b>Email: </b><i>barangaydos01255@gmail.com</i></p>
            <p><b>Phone:</b> <i>0906-057-5537</i></p>
          </div>
          <div className="info-card">
            <p><i>Please contact the barangay office for any concerns or inquiries.</i></p>
            <p><i>To gain access to the system, please contact the barangay office for your login credentials.</i></p>
            <p><i>Thank you!</i></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;