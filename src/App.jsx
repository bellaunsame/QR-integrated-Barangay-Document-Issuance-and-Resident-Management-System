import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; 

// Security & Layout
import { initializeCSRF } from './services/security';
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
import VerifyOTP from './pages/VerifyOTP'; 
import ForcePasswordChange from './pages/ForcePasswordChange'; // --- IMPORTED NEW PAGE ---
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
  
  useEffect(() => {
    const savedSize = localStorage.getItem('system_font_size');
    const root = document.documentElement;
    
    if (savedSize === 'small') {
      root.style.setProperty('font-size', '14px', 'important');
    } else if (savedSize === 'large') {
      root.style.setProperty('font-size', '18px', 'important');
    } else {
      root.style.setProperty('font-size', '16px', 'important'); 
    }
  }, []);

  const handleTimeout = () => {
    toast.error('Session expired. Please log in again.');
    window.location.href = '/login';
  };

  // --- Initialize Security on Mount ---
  useEffect(() => {
    initializeCSRF();

    if (sessionManager) {
      sessionManager.initialize({
        onWarning: handleWarning,
        onTimeout: handleTimeout
      });
    }

    return () => {
      if (sessionManager?.cleanup) sessionManager.cleanup();
    };
  }, []);

  return (
    <Router> 
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
                    <Route path="/verify-otp" element={<VerifyOTP />} /> 
                    <Route path="/scan" element={<QRScanPage />} />
                    
                    {/* --- 2. FORCED PASSWORD RESET ROUTE --- */}
                    {/* Traps the user outside the MainLayout so they can't access the sidebar */}
                    <Route 
                      path="/force-password-change" 
                      element={
                        <ProtectedRoute>
                          <ForcePasswordChange />
                        </ProtectedRoute>
                      } 
                    />

                    {/* --- 3. PROTECTED ROUTES (Main System) --- */}
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
                        <ProtectedRoute requiredRoles={['admin', 'record_keeper', 'view_only']}>
                          <ResidentsPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/documents" element={
                        <ProtectedRoute requiredRoles={['admin', 'clerk', 'record_keeper', 'view_only']}>
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
    </Router> 
  );
}

export default App;