import { FileX } from 'lucide-react';
/*import './EmptyState.css';*/

/**
 * EmptyState Component
 * 
 * Display when no data is available
 * 
 * @param {ReactNode} icon - Icon component
 * @param {string} title - Main message
 * @param {string} description - Supporting text
 * @param {ReactNode} action - CTA button
 */
const EmptyState = ({
  icon = <FileX size={48} />,
  title = 'No data found',
  description = null,
  action = null,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;