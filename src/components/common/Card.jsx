/*import './Card.css';*/

/**
 * Card Component
 * 
 * Container with elevation and border
 * 
 * @param {ReactNode} children - Card content
 * @param {ReactNode} header - Optional header
 * @param {ReactNode} footer - Optional footer
 * @param {boolean} hoverable - Add hover effect
 * @param {string} padding - 'none', 'sm', 'md', 'lg'
 */
const Card = ({
  children,
  header = null,
  footer = null,
  hoverable = false,
  padding = 'md',
  className = '',
  onClick
}) => {
  const classNames = [
    'card',
    `card-padding-${padding}`,
    hoverable && 'card-hoverable',
    onClick && 'card-clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card;