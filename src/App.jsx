import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; // Added toast for session alerts

// Security & Layout
import { initializeCSRF } from './services/security';
// Merged: Added sessionManager import
import { sessionManager } from './services/security'; 
import { MainLayout } from './components/layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Context Providers
import { 
  AuthProvider, 
  SettingsProvider, 
  NotificationProvider,
  ThemeProvider,
  DataProvider 
} from './context';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ResidentsPage from './pages/ResidentsPage';
import DocumentRequestsPage from './pages/DocumentRequestsPage';
import DocumentTemplatesPage from './pages/DocumentTemplatesPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import QRScanPage from './pages/QRScannerPage';
import ProfilePage from './pages/ProfilePage';
import ActivityLogPage from './pages/ActivityLogPage';
import SecurityDashboard from './pages/SecurityDashboard';

function App() {
  // --- Session Management Handlers ---
  const handleWarning = () => {
    toast('Your session is about to expire due to inactivity.', {
      icon: '⏳',
      style: { background: '#f59e0b', color: '#fff' }
    });
  };

  const handleTimeout = () => {
    toast.error('Session expired. Please log in again.');
    // The sessionManager should handle the actual logout logic, 
    // but we ensure the UI reacts here.
    window.location.href = '/login';
  };

  // --- Initialize Security on Mount ---
  useEffect(() => {
    console.log("App is initializing security...");
    
    // 1. Initialize CSRF
    initializeCSRF();

    // 2. Merged: Initialize Session Manager
    if (sessionManager) {
      sessionManager.initialize({
        onWarning: handleWarning,
        onTimeout: handleTimeout
      });
    }

    // Cleanup on unmount
    return () => {
      if (sessionManager?.cleanup) sessionManager.cleanup();
    };
  }, []);

return (
    <Router> {/* MOVED TO THE TOP */}
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <SettingsProvider>
              <DataProvider>
                <div className="App">
                  <Toaster 
                    position="top-right"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: '#1e40af',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                      },
                      success: {
                        style: { background: 'linear-gradient(135deg, #10b981, #059669)' },
                        iconTheme: { primary: '#fff', secondary: '#10b981' },
                      },
                      error: {
                        style: { background: 'linear-gradient(135deg, #ef4444, #dc2626)' },
                        iconTheme: { primary: '#fff', secondary: '#ef4444' },
                      },
                      loading: {
                        style: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                      },
                    }}
                  />
                  
                  <Routes>
                    {/* --- 1. PUBLIC ROUTES --- */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/scan" element={<QRScanPage />} />
                    
                    {/* --- 2. PROTECTED ROUTES (Main System) --- */}
                    <Route 
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      
                      <Route path="/residents" element={
                        <ProtectedRoute requiredRoles={['admin', 'record_keeper']}>
                          <ResidentsPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/documents" element={
                        <ProtectedRoute requiredRoles={['admin', 'clerk', 'record_keeper']}>
                          <DocumentRequestsPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/templates" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <DocumentTemplatesPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/users" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <UsersPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/security" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <SecurityDashboard />
                        </ProtectedRoute>
                      } />

                      <Route path="/activity-logs" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <ActivityLogPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/settings" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <SettingsPage />
                        </ProtectedRoute>
                      } />
                    </Route>

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </DataProvider>
            </SettingsProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router> // CLOSING TAG MOVED TO THE BOTTOM
  );
}

export default App;