import { Button } from '../common';
import './Pageheader.css';

/**
 * PageHeader Component
 * 
 * Consistent page header with title, description, and actions
 * 
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {ReactNode} actions - Action buttons
 * @param {ReactNode} breadcrumbs - Breadcrumb navigation
 */
const PageHeader = ({
  title,
  description,
  actions = null,
  breadcrumbs = null,
  className = ''
}) => {
  return (
    <div className={`page-header ${className}`}>
      {breadcrumbs && (
        <div className="page-breadcrumbs">{breadcrumbs}</div>
      )}
      
      <div className="page-header-content">
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="page-description">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="page-header-actions">{actions}</div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;