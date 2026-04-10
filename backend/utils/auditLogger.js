const UserActivityAudit = require('../models/UserActivityAudit');
const { emitAuditLog } = require('./socketEmitter');

/**
 * Central audit logging function
 * @param {string} userId - User ID (can be null for failed logins)
 * @param {string} action - Action type (REGISTER, LOGIN, LOGOUT, FAILED_LOGIN, etc.)
 * @param {Object} request - Express request object
 * @param {Object} details - Additional details/context
 */
const logUserActivity = async (userId, action, request, details = {}) => {
  try {
    await UserActivityAudit.logActivity(userId, action, request, details);
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

/**
 * Log user registration
 */
const logRegistration = async (userId, request) => {
  await logUserActivity(userId, 'REGISTER', request, {
    event: 'user_registration',
    description: 'New user account created'
  });
};

/**
 * Log successful login
 */
const logLogin = async (userId, request) => {
  await logUserActivity(userId, 'LOGIN', request, {
    event: 'user_login',
    description: 'User successfully logged in'
  });
};

/**
 * Log logout
 */
const logLogout = async (userId, request) => {
  await logUserActivity(userId, 'LOGOUT', request, {
    event: 'user_logout',
    description: 'User logged out'
  });
};

/**
 * Log failed login attempt
 */
const logFailedLogin = async (request, email) => {
  await logUserActivity(null, 'FAILED_LOGIN', request, {
    event: 'failed_login_attempt',
    description: 'Login attempt failed',
    attempted_email: email
  });
};

/**
 * Log email verification
 */
const logEmailVerification = async (userId, request) => {
  await logUserActivity(userId, 'EMAIL_VERIFICATION', request, {
    event: 'email_verification',
    description: 'User verified email address'
  });
};

/**
 * Log password reset
 */
const logPasswordReset = async (userId, request) => {
  await logUserActivity(userId, 'PASSWORD_RESET', request, {
    event: 'password_reset',
    description: 'User reset password'
  });
};

// Legacy function for backward compatibility
const logAuditEvent = async (userId, action, resource, resourceId = null, details = {}, req = null) => {
  try {
    // Build description from resource and action
    let description = `${action.replace(/_/g, ' ').toLowerCase()}`;
    if (resource) {
      description += ` on ${resource}`;
    }
    if (resourceId) {
      description += ` (ID: ${resourceId})`;
    }
    if (details && Object.keys(details).length > 0) {
      description += ` - ${JSON.stringify(details)}`;
    }

    // Parse device from user agent
    let device = 'Unknown';
    if (req && req.headers['user-agent']) {
      const ua = req.headers['user-agent'].toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        device = 'Mobile';
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        device = 'Tablet';
      } else {
        device = 'Desktop';
      }
      // Add browser info
      if (ua.includes('chrome') && !ua.includes('edg')) device += ' on Chrome';
      else if (ua.includes('firefox')) device += ' on Firefox';
      else if (ua.includes('safari') && !ua.includes('chrome')) device += ' on Safari';
      else if (ua.includes('edg')) device += ' on Edge';
      else device += ' on Unknown Browser';
    }

    const auditData = {
      user_id: userId,
      action: action.toUpperCase(),
      description,
      ip_address: req?.ip || req?.connection?.remoteAddress || 'unknown',
      device,
      location: 'Kenya',
      status: 'success'
    };

    // Use the old AuditLog model for legacy compatibility
    const { AuditLog } = require('../models');
    const log = await AuditLog.create(auditData);

    emitAuditLog(log);
  } catch (error) {
    console.error('Legacy audit logging error:', error);
  }
};

module.exports = {
  logUserActivity,
  logRegistration,
  logLogin,
  logLogout,
  logFailedLogin,
  logEmailVerification,
  logPasswordReset,
  // Legacy export for backward compatibility
  logAuditEvent,
};