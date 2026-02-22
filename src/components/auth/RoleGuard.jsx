import { useAuth } from '../../context/AuthContext';

/**
 * RoleGuard Component
 * 
 * Conditionally renders children based on user role
 * Useful for showing/hiding UI elements based on permissions
 * 
 * @param {ReactNode} children - Content to render if authorized
 * @param {string|string[]} roles - Required role(s)
 * @param {ReactNode} fallback - Content to render if not authorized
 */
const RoleGuard = ({ children, roles, fallback = null }) => {
  const { user, hasRole } = useAuth();

  // If no user, don't render anything
  if (!user) {
    return fallback;
  }

  // Check if user has required role
  const isAuthorized = hasRole(roles);

  if (!isAuthorized) {
    return fallback;
  }

  return children;
};

export default RoleGuard;