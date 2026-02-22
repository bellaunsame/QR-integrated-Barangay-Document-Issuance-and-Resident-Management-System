/**
 * Session Management Service
 * 
 * Handle user sessions, track active logins, and manage session security
 */

import { supabase } from './supabaseClient';

/**
 * Create a new session
 */
export const createSession = async (userId, deviceInfo = {}) => {
  try {
    const sessionData = {
      user_id: userId,
      device_type: deviceInfo.type || detectDeviceType(),
      device_name: deviceInfo.name || getDeviceName(),
      browser: getBrowserInfo(),
      ip_address: await getClientIP(),
      location: await getLocation(),
      user_agent: navigator.userAgent,
      is_active: true,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;

    // Store session ID in localStorage
    localStorage.setItem('session_id', data.id);

    return data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

/**
 * Update session activity
 */
export const updateSessionActivity = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating session activity:', error);
    return null;
  }
};

/**
 * Terminate a session
 */
export const terminateSession = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    // Clear from localStorage if it's the current session
    const currentSessionId = localStorage.getItem('session_id');
    if (currentSessionId === sessionId) {
      localStorage.removeItem('session_id');
    }

    return data;
  } catch (error) {
    console.error('Error terminating session:', error);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw error;
  }
};

/**
 * Terminate all other sessions except current
 */
export const terminateAllOtherSessions = async (userId, currentSessionId) => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', currentSessionId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error terminating other sessions:', error);
    throw error;
  }
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (expiryHours = 24) => {
  try {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - expiryHours);

    const { data, error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .lt('last_activity', expiryDate.toISOString());

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    throw error;
  }
};

/**
 * Get session statistics
 */
export const getSessionStatistics = async (userId) => {
  try {
    const sessions = await getUserSessions(userId);

    const now = new Date();
    const stats = {
      total_active: sessions.length,
      active_now: 0,
      idle: 0,
      devices: {
        desktop: 0,
        mobile: 0,
        tablet: 0
      },
      browsers: {},
      locations: {}
    };

    sessions.forEach(session => {
      const lastActivity = new Date(session.last_activity);
      const minutesSinceActivity = (now - lastActivity) / 1000 / 60;

      // Active in last 5 minutes
      if (minutesSinceActivity < 5) {
        stats.active_now++;
      } else {
        stats.idle++;
      }

      // Device counts
      if (session.device_type) {
        stats.devices[session.device_type]++;
      }

      // Browser counts
      const browser = session.browser || 'Unknown';
      stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;

      // Location counts
      const location = session.location || 'Unknown';
      stats.locations[location] = (stats.locations[location] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting session statistics:', error);
    throw error;
  }
};

/**
 * Detect device type
 */
const detectDeviceType = () => {
  const ua = navigator.userAgent;
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Get device name
 */
const getDeviceName = () => {
  const ua = navigator.userAgent;
  const browser = getBrowserInfo();
  const os = getOSInfo();
  
  return `${os} - ${browser}`;
};

/**
 * Get browser info
 */
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
  
  return 'Unknown Browser';
};

/**
 * Get OS info
 */
const getOSInfo = () => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows NT')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  
  return 'Unknown OS';
};

/**
 * Get client IP address
 */
const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'Unknown';
  }
};

/**
 * Get approximate location
 */
const getLocation = async () => {
  try {
    const ip = await getClientIP();
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    if (data.city && data.region && data.country_name) {
      return `${data.city}, ${data.region}, ${data.country_name}`;
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching location:', error);
    return 'Unknown';
  }
};

/**
 * Check if session is still valid
 */
export const validateSession = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    // Check if session is too old
    const lastActivity = new Date(data.last_activity);
    const hoursSinceActivity = (new Date() - lastActivity) / 1000 / 60 / 60;

    if (hoursSinceActivity > 24) {
      await terminateSession(sessionId);
      return false;
    }

    // Update activity
    await updateSessionActivity(sessionId);

    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

export default {
  createSession,
  updateSessionActivity,
  terminateSession,
  getUserSessions,
  terminateAllOtherSessions,
  cleanupExpiredSessions,
  getSessionStatistics,
  validateSession
};