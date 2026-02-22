/**
 * Analytics Service
 * Track and analyze system usage and statistics
 */

import { db } from './supabaseClient';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const [residents, requests, users, templates] = await Promise.all([
      db.residents.getAll(),
      db.requests.getAll(),
      db.users.getAll(),
      db.templates.getAll()
    ]);

    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalResidents: residents.length,
      totalRequests: requests.length,
      totalUsers: users.filter(u => u.is_active).length,
      totalTemplates: templates.filter(t => t.is_active).length,
      
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      processingRequests: requests.filter(r => r.status === 'processing').length,
      completedRequests: requests.filter(r => r.status === 'completed').length,
      releasedRequests: requests.filter(r => r.status === 'released').length,
      
      requestsToday: requests.filter(r => r.created_at?.startsWith(today)).length,
      completedToday: requests.filter(r => 
        r.status === 'completed' && r.processed_at?.startsWith(today)
      ).length,
      
      residentsWithQR: residents.filter(r => r.qr_code_url).length,
      residentsWithoutQR: residents.filter(r => !r.qr_code_url).length
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
};

/**
 * Get requests by date range
 */
export const getRequestsByDateRange = async (startDate, endDate) => {
  try {
    const requests = await db.requests.getAll();
    
    return requests.filter(r => {
      const createdDate = new Date(r.created_at);
      return createdDate >= new Date(startDate) && createdDate <= new Date(endDate);
    });
  } catch (error) {
    console.error('Error getting requests by date range:', error);
    throw error;
  }
};

/**
 * Get most requested documents
 */
export const getMostRequestedDocuments = async (limit = 10) => {
  try {
    const requests = await db.requests.getAll();
    
    const documentCounts = {};
    requests.forEach(r => {
      const type = r.request_type;
      documentCounts[type] = (documentCounts[type] || 0) + 1;
    });
    
    return Object.entries(documentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  } catch (error) {
    console.error('Error getting most requested documents:', error);
    throw error;
  }
};

/**
 * Get average processing time
 */
export const getAverageProcessingTime = async () => {
  try {
    const requests = await db.requests.getAll();
    
    const completedRequests = requests.filter(r => 
      r.status === 'completed' && r.created_at && r.processed_at
    );
    
    if (completedRequests.length === 0) {
      return { hours: 0, minutes: 0 };
    }
    
    const totalMinutes = completedRequests.reduce((sum, r) => {
      const created = new Date(r.created_at);
      const processed = new Date(r.processed_at);
      const diffMinutes = (processed - created) / (1000 * 60);
      return sum + diffMinutes;
    }, 0);
    
    const avgMinutes = totalMinutes / completedRequests.length;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);
    
    return { hours, minutes, totalMinutes: avgMinutes };
  } catch (error) {
    console.error('Error calculating processing time:', error);
    throw error;
  }
};

/**
 * Get monthly statistics
 */
export const getMonthlyStats = async (year, month) => {
  try {
    const requests = await db.requests.getAll();
    const residents = await db.residents.getAll();
    
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    const monthRequests = requests.filter(r => r.created_at?.startsWith(monthStr));
    const monthResidents = residents.filter(r => r.created_at?.startsWith(monthStr));
    
    return {
      totalRequests: monthRequests.length,
      completedRequests: monthRequests.filter(r => r.status === 'completed').length,
      newResidents: monthResidents.length,
      pendingRequests: monthRequests.filter(r => r.status === 'pending').length
    };
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    throw error;
  }
};

/**
 * Get user activity summary
 */
export const getUserActivitySummary = async (userId) => {
  try {
    const logs = await db.logs.getByUser(userId);
    
    const actionCounts = {};
    logs.forEach(log => {
      const action = log.action;
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
    
    return {
      totalActions: logs.length,
      lastActivity: logs[0]?.created_at,
      actionBreakdown: actionCounts
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    throw error;
  }
};

/**
 * Generate analytics report
 */
export const generateAnalyticsReport = async (period = 'month') => {
  try {
    const stats = await getDashboardStats();
    const mostRequested = await getMostRequestedDocuments(5);
    const avgProcessing = await getAverageProcessingTime();
    
    return {
      period,
      generatedAt: new Date().toISOString(),
      summary: stats,
      topDocuments: mostRequested,
      averageProcessingTime: avgProcessing,
      efficiency: {
        qrCodeAdoption: ((stats.residentsWithQR / stats.totalResidents) * 100).toFixed(2) + '%',
        completionRate: ((stats.completedRequests / stats.totalRequests) * 100).toFixed(2) + '%',
        dailyAverage: (stats.totalRequests / 30).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error generating analytics report:', error);
    throw error;
  }
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export default {
  getDashboardStats,
  getRequestsByDateRange,
  getMostRequestedDocuments,
  getAverageProcessingTime,
  getMonthlyStats,
  getUserActivitySummary,
  generateAnalyticsReport,
  exportToCSV
};