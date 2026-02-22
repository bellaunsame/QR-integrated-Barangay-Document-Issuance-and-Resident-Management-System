import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient'; 
import { Card, Button, Badge, Modal, LoadingSpinner } from '../common';
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { getRelativeTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './SessionManagement.css';

const SessionManagement = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Identify the current session ID from local storage
  const currentSessionId = localStorage.getItem('current_session_id');

  useEffect(() => {
    if (!user) return;

    loadSessions();

    // Real-time Subscription to handle instant UI updates
    const sessionSubscription = supabase
      .channel('realtime-user-sessions')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${user.id}` 
        },
        () => {
          loadSessions(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionSubscription);
    };
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      const formattedSessions = data.map(session => ({
        ...session,
        is_current: session.id === currentSessionId
      }));

      setSessions(formattedSessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * FIXED: handleTerminateSession
   * Includes count validation and manual refresh fallback
   */
  const handleTerminateSession = async (sessionId) => {
    try {
      setLoading(true);
      console.log("Attempting to delete session ID:", sessionId);

      // Perform deletion with count check to verify success
      const { error, count } = await supabase
        .from('user_sessions')
        .delete({ count: 'exact' }) 
        .eq('id', sessionId); 

      if (error) throw error;

      // If count is 0, it means the row wasn't found or RLS blocked it
      if (count === 0) {
        throw new Error("Session not found or permission denied by RLS.");
      }

      toast.success('Session terminated successfully');
      setShowTerminateModal(false);
      setSelectedSession(null);
      
      // Force a manual refresh in case Realtime/WebSocket is currently Offline
      await loadSessions(); 
      
    } catch (error) {
      console.error('Termination Error:', error.message);
      toast.error(`Termination failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateAllOthers = async () => {
    if (!window.confirm("Are you sure you want to log out of all other devices?")) return;

    try {
      setLoading(true);
      const { error, count } = await supabase
        .from('user_sessions')
        .delete({ count: 'exact' })
        .eq('user_id', user.id)
        .neq('id', currentSessionId); 

      if (error) throw error;

      toast.success(`${count} other sessions terminated`);
      await loadSessions();
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast.error('Failed to terminate other sessions');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType) => {
    const icons = {
      desktop: <Monitor size={24} />,
      mobile: <Smartphone size={24} />,
      tablet: <Tablet size={24} />
    };
    return icons[deviceType?.toLowerCase()] || <Monitor size={24} />;
  };

  const getStatusBadge = (session) => {
    const minutesSinceActivity = (new Date() - new Date(session.last_activity)) / 1000 / 60;
    
    if (session.is_current) {
      return <Badge variant="success" icon={<CheckCircle size={14} />}>Current Session</Badge>;
    } else if (minutesSinceActivity < 15) {
      return <Badge variant="success">Active</Badge>;
    } else if (minutesSinceActivity < 120) {
      return <Badge variant="warning">Idle</Badge>;
    } else {
      return <Badge variant="gray">Inactive</Badge>;
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <Card className="session-management">
        <div className="card-header">
          <div className="header-content">
            <Shield size={24} />
            <div>
              <h2>Active Sessions</h2>
              <p>Manage your login sessions across devices</p>
            </div>
          </div>
        </div>
        <LoadingSpinner text="Loading active sessions..." />
      </Card>
    );
  }

  return (
    <Card className="session-management">
      <div className="card-header">
        <div className="header-content">
          <Shield size={24} />
          <div>
            <h2>Active Sessions</h2>
            <p>Manage your login sessions across devices</p>
          </div>
        </div>
        {sessions.filter(s => !s.is_current).length > 0 && (
          <Button
            variant="danger"
            icon={<LogOut size={20} />}
            onClick={handleTerminateAllOthers}
          >
            Terminate All Others
          </Button>
        )}
      </div>

      <div className="security-notice">
        <AlertTriangle size={20} />
        <div>
          <strong>Security Tip:</strong> If you see a session you don't recognize, 
          terminate it immediately and change your password.
        </div>
      </div>

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>No active sessions found.</p>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id} 
              className={`session-card ${session.is_current ? 'current-session' : ''}`}
            >
              <div className="session-icon">
                {getDeviceIcon(session.device_type)}
              </div>

              <div className="session-details">
                <div className="session-header">
                  <h3>{session.device_name}</h3>
                  {getStatusBadge(session)}
                </div>

                <div className="session-info">
                  <div className="info-item">
                    <MapPin size={16} />
                    <span>{session.location || 'Unknown Location'}</span>
                  </div>

                  <div className="info-item">
                    <Monitor size={16} />
                    <span>{session.ip_address || 'Unknown IP'}</span>
                  </div>

                  <div className="info-item">
                    <Clock size={16} />
                    <span>
                      Last active {getRelativeTime(session.last_activity)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="session-actions">
                {!session.is_current && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={16} />}
                    onClick={() => {
                      setSelectedSession(session);
                      setShowTerminateModal(true);
                    }}
                  >
                    Terminate
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showTerminateModal && selectedSession && (
        <Modal
          isOpen={showTerminateModal}
          onClose={() => {
            setShowTerminateModal(false);
            setSelectedSession(null);
          }}
          title="Terminate Session"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowTerminateModal(false);
                  setSelectedSession(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleTerminateSession(selectedSession.id)}
              >
                Terminate Session
              </Button>
            </>
          }
        >
          <div className="terminate-modal-content">
            <div className="warning-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={48} color="#ef4444" />
            </div>
            <p style={{ textAlign: 'center' }}>
              Are you sure you want to terminate this session?
            </p>
            <div className="session-details-modal" style={{ textAlign: 'left', marginTop: '15px', padding: '10px', background: 'var(--neutral-50)', borderRadius: '8px' }}>
              <div className="detail-row">
                <strong>Device: </strong>
                <span>{selectedSession.device_name}</span>
              </div>
              <div className="detail-row">
                <strong>IP Address: </strong>
                <span>{selectedSession.ip_address}</span>
              </div>
            </div>
            <p className="warning-text" style={{ marginTop: '15px', color: '#d32f2f', fontSize: '0.85rem' }}>
              This will immediately log out this device. The user will need to login again.
            </p>
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default SessionManagement;