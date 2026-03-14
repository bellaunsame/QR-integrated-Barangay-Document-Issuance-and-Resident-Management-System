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
import LandingPage from './pages/LandingPage'; 
import LoginPage from './pages/LoginPage';
import ResidentLogin from './pages/ResidentLogin'; 
import ResidentRegister from './pages/ResidentRegister'; 
import ResidentHome from './pages/ResidentHome'; 
import VerifyOTP from './pages/VerifyOTP'; 
import ForcePasswordChange from './pages/ForcePasswordChange';
import ResidentSetupPassword from './pages/ResidentSetupPassword';
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
import BlotterPage from './pages/BlotterPage'; 
import EquipmentPage from './pages/EquipmentPage'; 
import AnnouncementsPage from './pages/AnnouncementsPage'; 

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
                      duration: 6000,
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
                    <Route path="/" element={<LandingPage />} /> 
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/resident-login" element={<ResidentLogin />} /> 
                    <Route path="/register" element={<ResidentRegister />} /> 
                    
                    {/* Resident Portal Routes (Self-Protected via localStorage) */}
                    <Route path="/resident-home" element={<ResidentHome />} /> 
                    <Route path="/resident-setup-password" element={<ResidentSetupPassword />} />
                    
                    <Route path="/verify-otp" element={<VerifyOTP />} /> 
                    <Route path="/scan" element={<QRScanPage />} />
                    
                    {/* --- 2. FORCED PASSWORD RESET ROUTE (ADMIN) --- */}
                    <Route 
                      path="/force-password-change" 
                      element={
                        <ProtectedRoute>
                          <ForcePasswordChange />
                        </ProtectedRoute>
                      } 
                    />

                    {/* --- 3. PROTECTED ROUTES (Main Admin System) --- */}
                    <Route 
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      {/* DASHBOARD: Everyone can view the main dashboard */}
                      <Route path="/dashboard" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_investigator', 'barangay_captain', 'view_only']}>
                          <DashboardPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/profile" element={<ProfilePage />} />
                      
                      {/* RESIDENTS: Added captain and view_only */}
                      <Route path="/residents" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_investigator', 'barangay_captain', 'view_only']}>
                          <ResidentsPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* DOCUMENTS: Added captain and view_only */}
                      <Route path="/documents" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_captain', 'view_only']}>
                          <DocumentRequestsPage />
                        </ProtectedRoute>
                      } />

                      {/* BLOTTER: Added captain and view_only */}
                      <Route path="/blotter" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'record_keeper', 'barangay_investigator', 'barangay_captain', 'view_only']}>
                          <BlotterPage />
                        </ProtectedRoute>
                      } />

                      {/* EQUIPMENT: Added captain and view_only */}
                      <Route path="/equipment" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'clerk', 'barangay_captain', 'view_only']}>
                          <EquipmentPage />
                        </ProtectedRoute>
                      } />

                      {/* ANNOUNCEMENTS: Added captain and view_only */}
                      <Route path="/announcements" element={
                        <ProtectedRoute requiredRoles={['admin', 'secretary', 'clerk', 'record_keeper', 'barangay_captain', 'view_only']}>
                          <AnnouncementsPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/templates" element={
                        <ProtectedRoute requiredRoles={['admin', 'record_keeper']}>
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

                    {/* Catch-all route now redirects to the Landing Page */}
                    <Route path="*" element={<Navigate to="/" replace />} />
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