/**
 * Rate Limiter Service
 * Prevents abuse by limiting the number of requests in a specific time window.
 */

class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
    
    // Automatic Cleanup: Prevents memory leaks by removing stale entries periodically
    this.cleanupInterval = setInterval(() => this.cleanup(), windowMs);
  }

  /**
   * Check if an action is allowed for a given key
   * @param {string} key - Unique identifier (e.g., user email, IP address)
   * @returns {Object} { allowed: boolean, retryAfter: number, remaining: number }
   */
  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Filter attempts within the current rolling window
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentAttempts.length >= this.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const retryAfter = Math.ceil((oldestAttempt + this.windowMs - now) / 1000);
      
      return {
        allowed: false,
        retryAfter: retryAfter > 0 ? retryAfter : 0,
        remaining: 0
      };
    }
    
    // Record the current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return {
      allowed: true,
      retryAfter: 0,
      remaining: this.maxAttempts - recentAttempts.length
    };
  }

  /**
   * Reset attempts for a specific key (e.g., after a successful login)
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Clear all tracked attempts
   */
  clearAll() {
    this.attempts.clear();
  }

  /**
   * Manual or internal cleanup of expired timestamps
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.attempts.entries()) {
      const validAttempts = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }

  /**
   * Stop the cleanup interval (useful for testing or app shutdown)
   */
  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}

// --- Specific Rate Limiter Instances ---

// Login: 5 attempts per 15 minutes
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// API Usage: 100 requests per minute
export const apiRateLimiter = new RateLimiter(100, 60 * 1000);

// File Uploads: 10 uploads per hour
export const fileUploadRateLimiter = new RateLimiter(10, 60 * 60 * 1000);

// Password Resets: 3 requests per hour
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000);

// QR Code Generation: 20 generations per 10 minutes
export const qrGenerationRateLimiter = new RateLimiter(20, 10 * 60 * 1000);

// Document Requests: 10 requests per day (per user)
export const documentRequestRateLimiter = new RateLimiter(10, 24 * 60 * 60 * 1000);

export default RateLimiter;