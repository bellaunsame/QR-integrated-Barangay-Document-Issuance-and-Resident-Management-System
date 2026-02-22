import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, db } from '../services/supabaseClient';
import toast from 'react-hot-toast';

// Security Services
import { verifyPassword } from '../services/security/passwordService';
import { loginRateLimiter } from '../services/security/rateLimiter';
import { sessionManager } from '../services/security/sessionManager';
import { initializeCSRF, clearCSRFToken } from '../services/security/csrfService';
import { logAuth, ACTIONS } from '../services/security/auditLogger';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(null); // Optional now, since you use custom sessions
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Initialize Security Protocols
    initializeCSRF();
    
    sessionManager.initialize({
      onWarning: ({ extendSession }) => {
        const extend = window.confirm('Your session will expire in 5 minutes. Continue working?');
        if (extend) {
          extendSession();
          toast.success('Session extended');
        }
      },
      onTimeout: () => handleSessionTimeout()
    });

    // 2. Initial Session Check (Using YOUR custom logic, not Supabase's built-in logic)
    checkUser();

    // REMOVED: supabase.auth.onAuthStateChange 
    // It was destroying your session because you are using custom auth, not Supabase auth!
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const sessionId = localStorage.getItem('current_session_id');
      
      // Since you use custom auth, we check your localStorage and your custom sessionId!
      if (storedUser && sessionId) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        sessionManager.startSession();
        
        // Fetch fresh user data in the background just to keep things updated
        loadUserData(parsedUser.id);
      } else {
        // No valid local session found
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('current_session_id');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const loadUserData = async (userId) => {
    try {
      const userData = await db.users.getById(userId);
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSessionTimeout = () => {
    toast.error('Your session has expired');
    logout();
    navigate('/login?reason=session_expired');
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch { return 'unknown'; }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);

      // SECURITY: Rate Limiting
      const rateCheck = loginRateLimiter.isAllowed(email);
      if (!rateCheck.allowed) {
        const msg = `Too many attempts. Try again in ${rateCheck.retryAfter}s.`;
        await logAuth(ACTIONS.RATE_LIMIT_EXCEEDED, null, { email, message: msg });
        throw new Error(msg);
      }

      // Fetch user
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !userData) {
        await logAuth(ACTIONS.LOGIN_FAILED, null, { email, reason: 'User not found' });
        throw new Error('Invalid email or password');
      }

      // SECURITY: Bcrypt Verification
      const isValidPassword = await verifyPassword(password, userData.password_hash || userData.password);
      if (!isValidPassword) {
        await logAuth(ACTIONS.LOGIN_FAILED, userData.id, { email, reason: 'Invalid password' });
        throw new Error('Invalid email or password');
      }

      if (!userData.is_active) {
        await logAuth(ACTIONS.LOGIN_FAILED, userData.id, { email, reason: 'Account inactive' });
        throw new Error('Account inactive. Contact administrator.');
      }

      // SUCCESS
      loginRateLimiter.reset(email);
      
      // --- START SESSION TRACKING ---
      const ip = await getClientIP();
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(navigator.userAgent.toLowerCase());
      
      let deviceType = 'desktop';
      if (isTablet) deviceType = 'tablet';
      else if (isMobile) deviceType = 'mobile';

      let browserName = 'Browser';
      if (navigator.userAgent.includes('Chrome')) browserName = 'Chrome';
      else if (navigator.userAgent.includes('Firefox')) browserName = 'Firefox';
      else if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) browserName = 'Safari';
      else if (navigator.userAgent.includes('Edge')) browserName = 'Edge';

      const deviceName = `${navigator.platform || 'Device'} - ${browserName}`;

      const sessionData = {
        user_id: userData.id,
        device_type: deviceType,
        device_name: deviceName,
        ip_address: ip,
        location: 'Cabuyao City, Philippines' 
      };

      const { data: newSession, error: sessionError } = await supabase
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (!sessionError && newSession) {
        localStorage.setItem('current_session_id', newSession.id);
      } else {
        console.error("Failed to save session to database:", sessionError);
      }
      // --- END SESSION TRACKING ---

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      sessionManager.startSession();

      // Audit Log
      await logAuth(ACTIONS.LOGIN_SUCCESS, userData.id, { email, role: userData.role, ip });

      toast.success(`Welcome back, ${userData.full_name}!`);
      return userData;

    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (user) {
        await logAuth(ACTIONS.LOGOUT, user.id, { email: user.email });
      }
      
      // --- START SESSION CLEANUP ---
      const sessionId = localStorage.getItem('current_session_id');
      if (sessionId) {
        await supabase.from('user_sessions').delete().eq('id', sessionId);
      }
      // --- END SESSION CLEANUP ---

      setUser(null);
      setSession(null);
      localStorage.removeItem('user');
      localStorage.removeItem('current_session_id');
      clearCSRFToken();
      sessionManager.endSession();
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // HELPER: Role & Permission Checks
  const hasRole = (roles) => {
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const permissions = {
      admin: ['manage_users', 'manage_settings', 'process_documents', 'view_audit_logs'],
      clerk: ['process_documents', 'view_residents'],
      record_keeper: ['manage_residents', 'generate_qr']
    };
    return (permissions[user.role] || []).includes(permission);
  };

  const value = {
    user,
    session,
    loading,
    initialized,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {!initialized ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280', fontFamily: 'sans-serif' }}>Verifying session...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;