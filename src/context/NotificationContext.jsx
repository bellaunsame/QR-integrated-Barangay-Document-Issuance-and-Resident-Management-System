import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext({});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Show success notification
   */
  const success = useCallback((message, options = {}) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      ...options
    });

    addNotification({
      type: 'success',
      message,
      timestamp: new Date().toISOString()
    });
  }, []);

  /**
   * Show error notification
   */
  const error = useCallback((message, options = {}) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      ...options
    });

    addNotification({
      type: 'error',
      message,
      timestamp: new Date().toISOString()
    });
  }, []);

  /**
   * Show warning notification
   */
  const warning = useCallback((message, options = {}) => {
    toast(message, {
      icon: '⚠️',
      duration: 3500,
      position: 'top-right',
      style: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24'
      },
      ...options
    });

    addNotification({
      type: 'warning',
      message,
      timestamp: new Date().toISOString()
    });
  }, []);

  /**
   * Show info notification
   */
  const info = useCallback((message, options = {}) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #60a5fa'
      },
      ...options
    });

    addNotification({
      type: 'info',
      message,
      timestamp: new Date().toISOString()
    });
  }, []);

  /**
   * Show loading notification
   */
  const loading = useCallback((message) => {
    return toast.loading(message, {
      position: 'top-right'
    });
  }, []);

  /**
   * Dismiss a notification
   */
  const dismiss = useCallback((toastId) => {
    toast.dismiss(toastId);
  }, []);

  /**
   * Dismiss all notifications
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  /**
   * Show promise-based notification
   */
  const promise = useCallback((promiseFunction, messages = {}) => {
    return toast.promise(
      promiseFunction,
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred'
      },
      {
        position: 'top-right'
      }
    );
  }, []);

  /**
   * Show confirmation dialog
   */
  const confirm = useCallback((message, onConfirm, onCancel) => {
    const confirmed = window.confirm(message);
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
    return confirmed;
  }, []);

  /**
   * Add notification to history
   */
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      // Keep only last 50 notifications
      return updated.slice(0, 50);
    });
  }, []);

  /**
   * Clear notification history
   */
  const clearHistory = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Get notification history
   */
  const getHistory = useCallback(() => {
    return notifications;
  }, [notifications]);

  const value = {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    promise,
    confirm,
    notifications,
    clearHistory,
    getHistory
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;