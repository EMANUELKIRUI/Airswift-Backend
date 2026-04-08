const UserActivityAudit = require('../models/UserActivityAudit');

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
    const auditData = {
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details,
    };

    if (req) {
      auditData.ip_address = req.ip || req.connection.remoteAddress;
      auditData.user_agent = req.get('User-Agent');
    }

    // Use the old AuditLog model for legacy compatibility
    const { AuditLog } = require('../models');
    await AuditLog.create(auditData);
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