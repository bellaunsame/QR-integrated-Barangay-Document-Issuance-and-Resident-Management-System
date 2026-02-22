import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumbs.css';

/**
 * Breadcrumbs Component
 * 
 * Navigation breadcrumbs for page hierarchy
 * 
 * @param {Array} items - Breadcrumb items [{label, path}]
 * @param {boolean} showHome - Show home icon
 */
const Breadcrumbs = ({ items = [], showHome = true, className = '' }) => {
  return (
    <nav className={`breadcrumbs ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {showHome && (
          <>
            <li className="breadcrumb-item">
              <Link to="/dashboard" className="breadcrumb-link">
                <Home size={16} />
              </Link>
            </li>
            {items.length > 0 && (
              <li className="breadcrumb-separator">
                <ChevronRight size={16} />
              </li>
            )}
          </>
        )}
        
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {index > 0 && (
              <span className="breadcrumb-separator">
                <ChevronRight size={16} />
              </span>
            )}
            
            {item.path && index !== items.length - 1 ? (
              <Link to={item.path} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;