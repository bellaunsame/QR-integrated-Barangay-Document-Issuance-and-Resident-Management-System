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
  const [session, setSession] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
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

    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const sessionId = localStorage.getItem('current_session_id');
      
      if (storedUser && sessionId) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        sessionManager.startSession();
        loadUserData(parsedUser.id);
      } else {
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

  const login = async (email, password, skipSessionSetup = false) => {
    try {
      setLoading(true);

      const rateCheck = loginRateLimiter.isAllowed(email);
      if (!rateCheck.allowed) {
        const msg = `Too many attempts. Try again in ${rateCheck.retryAfter}s.`;
        await logAuth(ACTIONS.RATE_LIMIT_EXCEEDED, null, { email, message: msg });
        throw new Error(msg);
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !userData) {
        await logAuth(ACTIONS.LOGIN_FAILED, null, { email, reason: 'User not found' });
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await verifyPassword(password, userData.password_hash || userData.password);
      if (!isValidPassword) {
        await logAuth(ACTIONS.LOGIN_FAILED, userData.id, { email, reason: 'Invalid password' });
        throw new Error('Invalid email or password');
      }

      if (!userData.is_active) {
        await logAuth(ACTIONS.LOGIN_FAILED, userData.id, { email, reason: 'Account inactive' });
        throw new Error('Account inactive. Contact administrator.');
      }

      loginRateLimiter.reset(email);

      if (skipSessionSetup) {
        return userData;
      }
      
      await startUserSession(userData);
      return userData;

    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startUserSession = async (userData) => {
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
    }

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    sessionManager.startSession();

    await logAuth(ACTIONS.LOGIN_SUCCESS, userData.id, { email: userData.email, role: userData.role, ip });
  };

  const updateProfile = async (updatedData) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      await logAuth(ACTIONS.USER_UPDATED || 'USER_UPDATED', user.id, { email: user.email, changes: updatedData });

      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (user) {
        await logAuth(ACTIONS.LOGOUT, user.id, { email: user.email });
      }
      
      const sessionId = localStorage.getItem('current_session_id');
      if (sessionId) {
        await supabase.from('user_sessions').delete().eq('id', sessionId);
      }

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

  const hasRole = (roles) => {
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  };

  // ========================================================
  // FIXED: UPGRADED PERMISSION ENGINE
  // ========================================================
  const hasPermission = (permission) => {
    if (!user) return false;

    // Admin bypasses all checks and gets full access
    if (user.role === 'admin') return true;

    // Specific permissions for other roles
    const permissions = {
      secretary: [
        'manage_residents', 
        'process_documents', 
        'manage_blotter', 
        'manage_equipment', 
        'manage_news', 
        'use_qr_scanner'
      ],
      clerk: [
        'process_documents', 
        'view_residents', 
        'manage_equipment',  
        'manage_blotter'     
      ],
      record_keeper: [
        'manage_residents', 
        'generate_qr', 
        'manage_equipment',
        'process_documents' // <--- ADDED! Record Keeper can now process documents.
      ]
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
    hasPermission,
    startUserSession,
    updateProfile 
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