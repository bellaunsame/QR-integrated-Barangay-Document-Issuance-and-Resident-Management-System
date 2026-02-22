import './LoadingSpinner.css';

/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner
 * 
 * @param {string} size - 'sm', 'md', 'lg', 'xl'
 * @param {string} color - 'primary', 'white', 'gray'
 * @param {string} text - Optional loading text
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  text = null,
  className = ''
}) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner loading-spinner-${size} loading-spinner-${color}`}>
        <div className="spinner"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;