import { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../services/supabaseClient';

const DataContext = createContext({});

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [residents, setResidents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState({
    residents: false,
    templates: false,
    requests: false,
    users: false
  });

  const [lastFetched, setLastFetched] = useState({
    residents: null,
    templates: null,
    requests: null,
    users: null
  });

  // Cache duration: 2 minutes
  const CACHE_DURATION = 2 * 60 * 1000;

  /**
   * Check if cache is valid
   */
  const isCacheValid = useCallback((dataType) => {
    const lastFetch = lastFetched[dataType];
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  }, [lastFetched]);

  /**
   * Set loading state for specific data type
   */
  const setLoadingState = useCallback((dataType, isLoading) => {
    setLoading(prev => ({ ...prev, [dataType]: isLoading }));
  }, []);

  /**
   * Fetch residents
   */
  const fetchResidents = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('residents') && residents.length > 0) {
      return residents;
    }

    try {
      setLoadingState('residents', true);
      const data = await db.residents.getAll();
      setResidents(data);
      setLastFetched(prev => ({ ...prev, residents: Date.now() }));
      return data;
    } catch (error) {
      console.error('Error fetching residents:', error);
      throw error;
    } finally {
      setLoadingState('residents', false);
    }
  }, [residents, isCacheValid, setLoadingState]);

  /**
   * Fetch templates
   */
  const fetchTemplates = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('templates') && templates.length > 0) {
      return templates;
    }

    try {
      setLoadingState('templates', true);
      const data = await db.templates.getAll();
      setTemplates(data);
      setLastFetched(prev => ({ ...prev, templates: Date.now() }));
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    } finally {
      setLoadingState('templates', false);
    }
  }, [templates, isCacheValid, setLoadingState]);

  /**
   * Fetch document requests
   */
  const fetchRequests = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('requests') && requests.length > 0) {
      return requests;
    }

    try {
      setLoadingState('requests', true);
      const data = await db.requests.getAll();
      setRequests(data);
      setLastFetched(prev => ({ ...prev, requests: Date.now() }));
      return data;
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    } finally {
      setLoadingState('requests', false);
    }
  }, [requests, isCacheValid, setLoadingState]);

  /**
   * Fetch users
   */
  const fetchUsers = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('users') && users.length > 0) {
      return users;
    }

    try {
      setLoadingState('users', true);
      const data = await db.users.getAll();
      setUsers(data);
      setLastFetched(prev => ({ ...prev, users: Date.now() }));
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      setLoadingState('users', false);
    }
  }, [users, isCacheValid, setLoadingState]);

  /**
   * Add a new resident
   */
  const addResident = useCallback(async (residentData) => {
    const newResident = await db.residents.create(residentData);
    setResidents(prev => [newResident, ...prev]);
    return newResident;
  }, []);

  /**
   * Update a resident
   */
  const updateResident = useCallback(async (id, updates) => {
    const updatedResident = await db.residents.update(id, updates);
    setResidents(prev =>
      prev.map(r => (r.id === id ? updatedResident : r))
    );
    return updatedResident;
  }, []);

  /**
   * Delete a resident
   */
  const deleteResident = useCallback(async (id) => {
    await db.residents.delete(id);
    setResidents(prev => prev.filter(r => r.id !== id));
  }, []);

  /**
   * Add a new template
   */
  const addTemplate = useCallback(async (templateData) => {
    const newTemplate = await db.templates.create(templateData);
    setTemplates(prev => [newTemplate, ...prev]);
    return newTemplate;
  }, []);

  /**
   * Update a template
   */
  const updateTemplate = useCallback(async (id, updates) => {
    const updatedTemplate = await db.templates.update(id, updates);
    setTemplates(prev =>
      prev.map(t => (t.id === id ? updatedTemplate : t))
    );
    return updatedTemplate;
  }, []);

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(async (id) => {
    await db.templates.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Add a new request
   */
  const addRequest = useCallback(async (requestData) => {
    const newRequest = await db.requests.create(requestData);
    setRequests(prev => [newRequest, ...prev]);
    return newRequest;
  }, []);

  /**
   * Update a request
   */
  const updateRequest = useCallback(async (id, updates) => {
    const updatedRequest = await db.requests.update(id, updates);
    setRequests(prev =>
      prev.map(r => (r.id === id ? updatedRequest : r))
    );
    return updatedRequest;
  }, []);

  /**
   * Get resident by ID from cache
   */
  const getResidentById = useCallback((id) => {
    return residents.find(r => r.id === id);
  }, [residents]);

  /**
   * Get template by ID from cache
   */
  const getTemplateById = useCallback((id) => {
    return templates.find(t => t.id === id);
  }, [templates]);

  /**
   * Get request by ID from cache
   */
  const getRequestById = useCallback((id) => {
    return requests.find(r => r.id === id);
  }, [requests]);

  /**
   * Search residents
   */
  const searchResidents = useCallback((searchTerm) => {
    const term = searchTerm.toLowerCase();
    return residents.filter(r =>
      r.first_name.toLowerCase().includes(term) ||
      r.last_name.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.mobile_number?.includes(term)
    );
  }, [residents]);

  /**
   * Get requests by status
   */
  const getRequestsByStatus = useCallback((status) => {
    return requests.filter(r => r.status === status);
  }, [requests]);

  /**
   * Get statistics
   */
  const getStatistics = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalResidents: residents.length,
      totalTemplates: templates.length,
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      completedToday: requests.filter(r =>
        r.status === 'completed' && r.processed_at?.startsWith(today)
      ).length,
      activeUsers: users.filter(u => u.is_active).length
    };
  }, [residents, templates, requests, users]);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    setResidents([]);
    setTemplates([]);
    setRequests([]);
    setUsers([]);
    setLastFetched({
      residents: null,
      templates: null,
      requests: null,
      users: null
    });
  }, []);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchResidents(true),
      fetchTemplates(true),
      fetchRequests(true),
      fetchUsers(true)
    ]);
  }, [fetchResidents, fetchTemplates, fetchRequests, fetchUsers]);

  const value = {
    // Data
    residents,
    templates,
    requests,
    users,
    loading,
    
    // Fetch functions
    fetchResidents,
    fetchTemplates,
    fetchRequests,
    fetchUsers,
    
    // CRUD operations
    addResident,
    updateResident,
    deleteResident,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addRequest,
    updateRequest,
    
    // Helper functions
    getResidentById,
    getTemplateById,
    getRequestById,
    searchResidents,
    getRequestsByStatus,
    getStatistics,
    
    // Cache management
    clearCache,
    refreshAll
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;