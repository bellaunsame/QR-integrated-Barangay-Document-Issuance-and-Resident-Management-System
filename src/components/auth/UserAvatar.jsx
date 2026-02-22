import { User } from 'lucide-react';
import { getInitials, stringToColor } from '../../utils/stringUtils';
import './UserAvatar.css';

/**
 * UserAvatar Component
 * 
 * Displays user avatar with initials or image
 * Generates color based on user name
 * 
 * @param {Object} user - User object with name/email
 * @param {string} size - Size: 'sm', 'md', 'lg', 'xl'
 * @param {boolean} showName - Show name next to avatar
 */
const UserAvatar = ({ 
  user, 
  size = 'md', 
  showName = false,
  className = '' 
}) => {
  if (!user) {
    return (
      <div className={`user-avatar user-avatar-${size} user-avatar-default ${className}`}>
        <User size={size === 'sm' ? 16 : size === 'lg' ? 28 : size === 'xl' ? 36 : 20} />
      </div>
    );
  }

  const name = user.full_name || user.name || user.email || 'User';
  const initials = getInitials(name);
  const backgroundColor = stringToColor(name);

  return (
    <div className={`user-avatar-container ${className}`}>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={name}
          className={`user-avatar user-avatar-${size} user-avatar-image`}
        />
      ) : (
        <div
          className={`user-avatar user-avatar-${size} user-avatar-initials`}
          style={{ backgroundColor }}
        >
          <span>{initials}</span>
        </div>
      )}
      
      {showName && (
        <div className="user-avatar-name">
          <div className="name">{name}</div>
          {user.role && (
            <div className="role">{user.role}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;