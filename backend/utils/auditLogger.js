const AuditLog = require("../models/AuditLogMongo");

const logAction = async ({ userId, action, resource, description, metadata }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      description,
      metadata,
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

module.exports = logAction;
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

    const logData = {
      userId,
      action,
      entity: resource,
      entityId: resourceId,
      details,
      description,
      req,
      status: 'success'
    };

    await logActionService(logData);
  } catch (error) {
    console.error('Legacy audit logging error:', error);
  }
};

const logActionAdvanced = async ({ action, performedBy, targetUser, metadata = {}, req }) => {
  try {
    await logActionService({
      userId: performedBy || null,
      action,
      entity: 'User',
      entityId: targetUser || null,
      details: metadata,
      description: action,
      req,
      status: 'success'
    });
  } catch (error) {
    console.error('Audit log helper failed:', error);
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
  logAction: logActionAdvanced,
  // Legacy export for backward compatibility
  logAuditEvent,
};