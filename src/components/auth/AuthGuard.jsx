import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * AuthGuard Component
 * 
 * Simple authentication check without role verification
 * Renders children only if user is authenticated
 * 
 * @param {ReactNode} children - Content to render if authenticated
 * @param {ReactNode} fallback - Content to render if not authenticated
 * @param {boolean} showLoading - Show loading spinner while checking auth
 */
const AuthGuard = ({ 
  children, 
  fallback = null, 
  showLoading = true 
}) => {
  const { user, loading, initialized } = useAuth();

  // Show loading state
  if ((loading || !initialized) && showLoading) {
    return (
      <div className="auth-guard-loading">
        <LoadingSpinner />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return fallback;
  }

  // Authenticated
  return children;
};

export default AuthGuard;