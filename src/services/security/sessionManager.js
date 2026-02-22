/**
 * Session Manager Service
 * Manages user sessions with automatic timeout, activity tracking, and cross-tab sync.
 */

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT = 5 * 60 * 1000; // 5 minutes before expiration
const SESSION_DATA_KEY = 'brgy_session_data';
const LAST_ACTIVITY_KEY = 'brgy_last_activity';

class SessionManager {
  constructor() {
    this.timeoutId = null;
    this.warningId = null;
    this.warningShown = false;
    this.onWarningCallback = null;
    this.onTimeoutCallback = null;
    this.initialized = false;
  }

  /**
   * Initialize the manager with custom handlers for UI alerts
   */
  initialize(options = {}) {
    if (this.initialized) return;

    this.onWarningCallback = options.onWarning || this.defaultWarningHandler;
    this.onTimeoutCallback = options.onTimeout || this.defaultTimeoutHandler;
    
    this.setupActivityListeners();
    this.startSession();
    this.initialized = true;
  }

  /**
   * ADDED: Required by AuthContext.jsx
   * Returns true if session is within the timeout period
   */
  isSessionValid() {
    const lastActivity = this.getLastActivity();
    const elapsed = Date.now() - lastActivity;
    return elapsed < SESSION_TIMEOUT;
  }

  /**
   * Starts/Resumes a session and sets the timers
   */
  startSession() {
    this.updateActivity();
    this.startTimeoutTimers();
  }

  /**
   * Listens for user interactions to keep the session alive
   */
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // We use a bound function so we can remove it during cleanup
    this._activityHandler = () => this.handleActivity();

    events.forEach(event => {
      document.addEventListener(event, this._activityHandler, { passive: true });
    });

    // Cross-tab sync
    this._visibilityHandler = () => {
      if (!document.hidden) {
        this.checkSessionValidity();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  handleActivity() {
    if (!this.initialized) return;

    const now = Date.now();
    const lastActivity = this.getLastActivity();

    // Throttling: only update storage once every 2 seconds
    if (now - lastActivity > 2000) {
      this.updateActivity();
    }
  }

  updateActivity() {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    this.warningShown = false;
    this.startTimeoutTimers();
  }

  getLastActivity() {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  }

  checkSessionValidity() {
    if (!this.isSessionValid()) {
      this.handleTimeout();
    }
  }

  /**
   * Sets up the two-stage timeout (Warning -> Final Logout)
   */
  startTimeoutTimers() {
    this.clearTimeouts();

    // Stage 1: Warning timer
    this.warningId = setTimeout(() => {
      if (!this.warningShown) {
        this.warningShown = true;
        this.onWarningCallback({
          remainingTime: WARNING_TIMEOUT,
          extendSession: () => this.extendSession()
        });
      }
    }, SESSION_TIMEOUT - WARNING_TIMEOUT);

    // Stage 2: Final logout timer
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, SESSION_TIMEOUT);
  }

  clearTimeouts() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);
  }

  extendSession() {
    this.updateActivity();
  }

  handleTimeout() {
    this.clearTimeouts();
    this.clearSessionData();

    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  // --- UI Handlers ---

  defaultWarningHandler(data) {
    if (window.confirm('Your session is about to expire. Click OK to stay logged in.')) {
      data.extendSession();
    }
  }

  defaultTimeoutHandler() {
    alert('Session expired. Redirecting to login...');
    window.location.href = '/login?reason=session_expired';
  }

  // --- Data Persistence ---

  setSessionData(data) {
    const obfuscated = btoa(encodeURIComponent(JSON.stringify(data)));
    sessionStorage.setItem(SESSION_DATA_KEY, obfuscated);
  }

  getSessionData() {
    try {
      const data = sessionStorage.getItem(SESSION_DATA_KEY);
      if (!data) return null;
      return JSON.parse(decodeURIComponent(atob(data)));
    } catch (e) {
      return null;
    }
  }

  clearSessionData() {
    sessionStorage.removeItem(SESSION_DATA_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  /**
   * ADDED: Required by App.jsx cleanup
   */
  cleanup() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this._activityHandler);
    });
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    this.clearTimeouts();
  }

  endSession() {
    this.cleanup();
    this.clearSessionData();
    this.initialized = false;
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;