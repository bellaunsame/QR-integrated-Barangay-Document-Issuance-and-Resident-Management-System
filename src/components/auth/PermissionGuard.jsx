import { useAuth } from '../../context/AuthContext';

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions
 * More granular than RoleGuard - checks specific permissions
 * 
 * @param {ReactNode} children - Content to render if authorized
 * @param {string} permission - Required permission
 * @param {ReactNode} fallback - Content to render if not authorized
 */
const PermissionGuard = ({ children, permission, fallback = null }) => {
  const { user, hasPermission } = useAuth();

  // If no user, don't render anything
  if (!user) {
    return fallback;
  }

  // Check if user has required permission
  const isAuthorized = hasPermission(permission);

  if (!isAuthorized) {
    return fallback;
  }

  return children;
};

export default PermissionGuard;