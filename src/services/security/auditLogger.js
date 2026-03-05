/**
 * Audit Logger Service
 * Comprehensive logging for security events, user actions, and data changes.
 */
import { db, supabase } from '../supabaseClient';// Fixed import path

export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

export const ACTIONS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  RESIDENT_CREATED: 'resident_created',
  RESIDENT_UPDATED: 'resident_updated',
  RESIDENT_DELETED: 'resident_deleted',
  QR_GENERATED: 'qr_generated',
  DOCUMENT_REQUESTED: 'document_requested',
  DOCUMENT_RELEASED: 'document_released',
  DOCUMENT_PRINTED: 'document_printed',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_EXPORTED: 'data_exported',
  REPORT_GENERATED: 'report_generated',
  // ---> NEW: Added Device Verification Action <---
  NEW_DEVICE_VERIFIED: 'NEW_DEVICE_VERIFIED' 
};

/**
 * INTERNAL HELPERS
 */
const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch { return 'unknown'; }
};

const isUUID = (str) => {
  if (!str) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

/**
 * CORE LOGGING FUNCTION
 */
export const logAuditEvent = async (event) => {
  try {
    const ip = event.ipAddress || await getClientIP();
    
    // Safety check for UUID record_id
    const sanitizedUserId = isUUID(event.userId) ? event.userId : null;
    const validRecordId = isUUID(event.recordId) ? event.recordId : null;
    const extraDetails = !validRecordId && event.recordId ? { original_record_id: String(event.recordId) } : {};

    // Use db.logs.create from your supabaseClient helpers
    await db.logs.create({
      user_id: sanitizedUserId || null,
      action: event.action,
      table_name: event.tableName || null,
      record_id: validRecordId, 
      old_values: event.oldValues || null,
      new_values: event.newValues || null, 
      ip_address: ip,
      details: {
        severity: event.severity || SEVERITY.INFO,
        message: event.message || '',
        ...event.details,
        ...extraDetails,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Log error locally but don't crash the application
    console.error('Audit Log Service failure:', error.message || error);
  }
};

/**
 * CONVENIENCE WRAPPERS
 */

// ---> BRUTE-FORCE DETECTION <---
export const logAuth = async (action, userId = null, details = {}) => {
  let severity = (action === ACTIONS.LOGIN_SUCCESS || action === ACTIONS.LOGOUT || action === ACTIONS.NEW_DEVICE_VERIFIED) 
    ? SEVERITY.INFO 
    : SEVERITY.WARNING;

  if (action === ACTIONS.LOGIN_FAILED) {
    try {
      const ip = await getClientIP();
      
      // Look back 15 minutes to see if this IP is spamming failed logins
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('action', ACTIONS.LOGIN_FAILED)
        .eq('ip_address', ip)
        .gte('created_at', fifteenMinsAgo);

      // If they have failed 3 or more times recently, escalate to CRITICAL!
      if (data && data.length >= 3) {
        severity = SEVERITY.CRITICAL;
        details.message = 'CRITICAL: Possible Brute-Force attack. Multiple failed login attempts detected from this IP.';
      }
    } catch (err) {
      console.warn('Brute force check failed', err);
    }
  }

  await logAuditEvent({
    userId,
    action: action,
    severity: severity,
    details: { ...details, category: 'authentication' }
  });
};

export const logDataAccess = async (userId, tableName, recordId, action, details = {}) => {
  await logAuditEvent({
    userId,
    action: action || 'data_viewed',
    tableName,
    recordId,
    severity: SEVERITY.INFO,
    details: { ...details, category: 'data_access' }
  });
};

export const logDataModification = async (userId, tableName, recordId, action, oldValues, newValues) => {
  await logAuditEvent({
    userId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
    severity: SEVERITY.INFO,
    details: { category: 'data_modification' }
  });
};

export const logSecurityEvent = async (action, userId, details = {}, critical = false) => {
  await logAuditEvent({
    userId,
    action,
    severity: critical ? SEVERITY.CRITICAL : SEVERITY.WARNING,
    details: { ...details, category: 'security' }
  });
};

export const logCriticalEvent = async (action, userId, details = {}) => {
  await logSecurityEvent(action, userId, details, true);
};

/**
 * ANALYTICS & EXPORT
 */
export const queryAuditLogs = async (filters = {}) => {
  try {
    let query = supabase.from('audit_logs').select('*');
    
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.tableName) query = query.eq('table_name', filters.tableName);
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to query logs:', error);
    return [];
  }
};

// ---> SAFER JSON PARSING FOR DETAILS <---
export const getSecuritySummary = async (days = 7) => {
  try {
    const logs = await queryAuditLogs({ limit: 1000 });
    return {
      totalEvents: logs.length,
      failedLogins: logs.filter(l => l.action === ACTIONS.LOGIN_FAILED).length,
      successfulLogins: logs.filter(l => l.action === ACTIONS.LOGIN_SUCCESS).length,
      criticalEvents: logs.filter(l => {
        // Safely extract the severity, even if the database sent it back as a string
        const details = typeof l.details === 'string' ? JSON.parse(l.details) : (l.details || {});
        return details.severity === SEVERITY.CRITICAL;
      }).length
    };
  } catch (error) {
    return { totalEvents: 0, failedLogins: 0, successfulLogins: 0, criticalEvents: 0 };
  }
};

export const exportAuditLogs = async (filters = {}) => {
  const logs = await queryAuditLogs(filters);
  return JSON.stringify(logs, null, 2);
};

export default {
  logAuditEvent,
  logAuth,
  logDataAccess,
  logDataModification,
  logSecurityEvent,
  logCriticalEvent,
  queryAuditLogs,
  getSecuritySummary,
  exportAuditLogs,
  SEVERITY,
  ACTIONS
};