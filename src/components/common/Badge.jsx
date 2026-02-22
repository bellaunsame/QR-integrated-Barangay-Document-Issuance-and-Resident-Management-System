

/*import './Badge.css';*/

/**
 * Badge Component
 * 
 * Small colored label for status, counts, etc
 * 
 * @param {string} variant - 'primary', 'success', 'warning', 'danger', 'gray'
 * @param {string} size - 'sm', 'md', 'lg'
 * @param {ReactNode} icon - Optional icon
 */
const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  className = ''
}) => {
  const classNames = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;