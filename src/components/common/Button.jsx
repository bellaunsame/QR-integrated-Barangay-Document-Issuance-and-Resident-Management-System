import { forwardRef } from 'react';

/*import './Button.css';*/

/**
 * Button Component
 * 
 * Reusable button with multiple variants, sizes, and states
 * 
 * @param {string} variant - 'primary', 'secondary', 'success', 'danger', 'ghost'
 * @param {string} size - 'sm', 'md', 'lg'
 * @param {boolean} fullWidth - Take full width
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {ReactNode} icon - Icon component
 * @param {string} iconPosition - 'left' or 'right'
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const classNames = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <span className="btn-spinner">
          <span className="spinner-small"></span>
        </span>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left">{icon}</span>
      )}
      
      {children && <span className="btn-text">{children}</span>}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right">{icon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;