import { forwardRef } from 'react';
/*import './Input.css';*/

/**
 * Input Component
 * 
 * Styled text input with label and error display
 * 
 * @param {string} label - Input label
 * @param {string} error - Error message
 * @param {string} hint - Help text
 * @param {ReactNode} icon - Icon component
 * @param {string} iconPosition - 'left' or 'right'
 */
const Input = forwardRef(({
  label,
  error,
  hint,
  icon = null,
  iconPosition = 'left',
  className = '',
  type = 'text',
  fullWidth = true,
  ...props
}, ref) => {
  const inputClassNames = [
    'input',
    error && 'input-error',
    icon && `input-with-icon-${iconPosition}`,
    fullWidth && 'input-full-width',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {props.required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className="input-container">
        {icon && iconPosition === 'left' && (
          <span className="input-icon input-icon-left">{icon}</span>
        )}
        
        <input
          ref={ref}
          type={type}
          className={inputClassNames}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <span className="input-icon input-icon-right">{icon}</span>
        )}
      </div>
      
      {error && <span className="input-error-message">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;