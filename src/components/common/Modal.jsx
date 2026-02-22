import { useEffect } from 'react';
import { X } from 'lucide-react';
/*import './Modal.css';*/

/**
 * Modal Component
 * 
 * Full-featured modal dialog with backdrop
 * 
 * @param {boolean} isOpen - Control visibility
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {string} size - 'sm', 'md', 'lg', 'xl', 'full'
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop
 * @param {boolean} showCloseButton - Show X button
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeOnBackdrop ? onClose : undefined}>
      <div
        className={`modal modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}
        
        <div className="modal-body">{children}</div>
        
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;