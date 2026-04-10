const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // null for failed login attempts
  },
  action: {
    type: String,
    required: true,
    enum: ['REGISTER', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_RESET', 'EMAIL_VERIFICATION'],
  },
  ip_address: {
    type: String,
    required: true,
  },
  user_agent: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: false, // Optional geolocation data
  },
  device_info: {
    browser: String,
    device: String,
    os: String,
  },
  suspicious: {
    type: Boolean,
    default: false,
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Additional context
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes for performance
auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ ip_address: 1 });
auditLogSchema.index({ suspicious: 1 });

// Static method to log activity
auditLogSchema.statics.logActivity = async function(userId, action, request, details = {}) {
  try {
    const ip = request.ip ||
               request.connection.remoteAddress ||
               request.socket.remoteAddress ||
               (request.connection.socket ? request.connection.socket.remoteAddress : null);

    const userAgent = request.headers['user-agent'] || 'Unknown';

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent);

    const logData = {
      user_id: userId,
      action,
      ip_address: ip,
      user_agent: userAgent,
      device_info: deviceInfo,
      details,
    };

    // Check for suspicious activity
    if (action === 'LOGIN' || action === 'FAILED_LOGIN') {
      logData.suspicious = await this.checkSuspiciousActivity(userId, ip, action);
    }

    const auditLog = new this(logData);
    await auditLog.save();

    // Emit real-time event for admin monitoring
    if (global.io) {
      global.io.emit('audit_log', {
        user: userId ? await this.getUserName(userId) : 'Unknown',
        action,
        ip_address: ip,
        user_agent: userAgent,
        device_info: deviceInfo,
        suspicious: logData.suspicious,
        created_at: auditLog.created_at,
      });
    }

    return auditLog;
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Check for suspicious activity
auditLogSchema.statics.checkSuspiciousActivity = async function(userId, currentIp, action) {
  if (!userId) return false;

  try {
    const recentLogs = await this.find({
      user_id: userId,
      action: { $in: ['LOGIN', 'FAILED_LOGIN'] },
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ created_at: -1 }).limit(10);

    // Check for multiple IPs in short time
    const uniqueIps = [...new Set(recentLogs.map(log => log.ip_address))];
    if (uniqueIps.length > 2) {
      return true;
    }

    // Check for rapid failed login attempts
    const failedAttempts = recentLogs.filter(log => log.action === 'FAILED_LOGIN');
    if (failedAttempts.length >= 5) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Suspicious activity check error:', error);
    return false;
  }
};

// Get user name for real-time events
auditLogSchema.statics.getUserName = async function(userId) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('name');
    return user ? user.name : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

// Parse user agent string
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();

  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }

  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { browser, device, os };
}

module.exports = mongoose.model('UserActivityAudit', auditLogSchema);