import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * ProtectedRoute Component
 * 
 * Protects routes from unauthorized access
 * Supports role-based access control
 * 
 * @param {ReactNode} children - Components to render if authorized
 * @param {string|string[]} requiredRoles - Required role(s) to access route
 * @param {string} redirectTo - Where to redirect if unauthorized
 */
const ProtectedRoute = ({ 
  children, 
  requiredRoles = null,
  redirectTo = '/login'
}) => {
  const { user, loading, initialized } = useAuth();

  // Show loading state while checking authentication
  if (loading || !initialized) {
    return (
      <div className="protected-route-loading">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user account is active
  if (!user.is_active) {
    return (
      <div className="auth-error-page">
        <div className="auth-error-container">
          <h1>Account Inactive</h1>
          <p>Your account has been deactivated. Please contact an administrator.</p>
          <button onClick={() => window.location.href = '/login'} className="btn btn-primary">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role-based access if requiredRoles is specified
  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const hasRequiredRole = roles.includes(user.role);

    if (!hasRequiredRole) {
      return (
        <div className="auth-error-page">
          <div className="auth-error-container">
            <h1>Access Denied</h1>
            <p>You do not have permission to access this page.</p>
            <p className="role-info">
              Required role(s): <strong>{roles.join(', ')}</strong>
              <br />
              Your role: <strong>{user.role}</strong>
            </p>
            <button onClick={() => window.history.back()} className="btn btn-secondary">
              Go Back
            </button>
            <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary">
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;