/**
 * Activity Logging Service
 * 
 * Track and log all user actions in the system
 * Provides audit trail functionality
 */

import { supabase } from './supabaseClient';

/**
 * Log an activity/action
 */
export const logActivity = async ({
  userId,
  action,
  tableName = null,
  recordId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
  details = null
}) => {
  try {
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress || await getClientIP(),
      user_agent: userAgent || navigator.userAgent,
      details,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging should not break app functionality
    return null;
  }
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
    return 'Unknown';
  }
};

/**
 * Log user login
 */
export const logLogin = async (userId, loginMethod = 'email') => {
  return await logActivity({
    userId,
    action: 'login',
    details: { method: loginMethod }
  });
};

/**
 * Log user logout
 */
export const logLogout = async (userId) => {
  return await logActivity({
    userId,
    action: 'logout'
  });
};

/**
 * Log record creation
 */
export const logCreate = async (userId, tableName, recordId, newValues) => {
  return await logActivity({
    userId,
    action: 'created',
    tableName,
    recordId,
    newValues
  });
};

/**
 * Log record update
 */
export const logUpdate = async (userId, tableName, recordId, oldValues, newValues) => {
  return await logActivity({
    userId,
    action: 'updated',
    tableName,
    recordId,
    oldValues,
    newValues
  });
};

/**
 * Log record deletion
 */
export const logDelete = async (userId, tableName, recordId, oldValues) => {
  return await logActivity({
    userId,
    action: 'deleted',
    tableName,
    recordId,
    oldValues
  });
};

/**
 * Log record view
 */
export const logView = async (userId, tableName, recordId) => {
  return await logActivity({
    userId,
    action: 'viewed',
    tableName,
    recordId
  });
};

/**
 * Log settings change
 */
export const logSettingsChange = async (userId, settingKey, oldValue, newValue) => {
  return await logActivity({
    userId,
    action: 'settings_changed',
    tableName: 'system_settings',
    details: {
      setting_key: settingKey,
      old_value: oldValue,
      new_value: newValue
    }
  });
};

/**
 * Log document generation
 */
export const logDocumentGenerated = async (userId, documentType, residentId) => {
  return await logActivity({
    userId,
    action: 'document_generated',
    tableName: 'document_requests',
    details: {
      document_type: documentType,
      resident_id: residentId
    }
  });
};

/**
 * Log QR code scan
 */
export const logQRScan = async (userId, residentId) => {
  return await logActivity({
    userId,
    action: 'qr_scanned',
    tableName: 'residents',
    recordId: residentId
  });
};

/**
 * Log email sent
 */
export const logEmailSent = async (userId, recipient, subject, type) => {
  return await logActivity({
    userId,
    action: 'email_sent',
    details: {
      recipient,
      subject,
      type
    }
  });
};

/**
 * Log file upload
 */
export const logFileUpload = async (userId, fileName, fileSize, fileType) => {
  return await logActivity({
    userId,
    action: 'file_uploaded',
    details: {
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType
    }
  });
};

/**
 * Log security event
 */
export const logSecurityEvent = async (userId, eventType, details) => {
  return await logActivity({
    userId,
    action: 'security_event',
    details: {
      event_type: eventType,
      ...details
    }
  });
};

/**
 * Get activity logs with filters
 */
export const getActivityLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.tableName) {
      query = query.eq('table_name', filters.tableName);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

/**
 * Get user activity summary
 */
export const getUserActivitySummary = async (userId, days = 30) => {
  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const logs = await getActivityLogs({
      userId,
      dateFrom: dateFrom.toISOString()
    });

    // Calculate statistics
    const summary = {
      total_actions: logs.length,
      actions_by_type: {},
      tables_modified: new Set(),
      last_activity: logs[0]?.created_at || null,
      most_active_day: null,
      activity_by_day: {}
    };

    logs.forEach(log => {
      // Count by action type
      summary.actions_by_type[log.action] = (summary.actions_by_type[log.action] || 0) + 1;

      // Track tables
      if (log.table_name) {
        summary.tables_modified.add(log.table_name);
      }

      // Count by day
      const day = log.created_at.split('T')[0];
      summary.activity_by_day[day] = (summary.activity_by_day[day] || 0) + 1;
    });

    // Find most active day
    const dayEntries = Object.entries(summary.activity_by_day);
    if (dayEntries.length > 0) {
      summary.most_active_day = dayEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    summary.tables_modified = Array.from(summary.tables_modified);

    return summary;
  } catch (error) {
    console.error('Error getting user activity summary:', error);
    throw error;
  }
};

/**
 * Clean old logs
 */
export const cleanOldLogs = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    throw error;
  }
};

export default {
  logActivity,
  logLogin,
  logLogout,
  logCreate,
  logUpdate,
  logDelete,
  logView,
  logSettingsChange,
  logDocumentGenerated,
  logQRScan,
  logEmailSent,
  logFileUpload,
  logSecurityEvent,
  getActivityLogs,
  getUserActivitySummary,
  cleanOldLogs
};