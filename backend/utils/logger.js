const AuditLog = require('../models/AuditLogMongo');
const { emitAuditLog } = require('./socketEmitter');

let ioInstance = null;

const setSocketInstance = (io) => {
  ioInstance = io;
};

const logAction = async ({
  userId = null,
  action,
  description,
  req,
  status = "success"
}) => {
  try {
    // Parse device info from user agent
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
      user_id: userId,
      action: action.toUpperCase(),
      description,
      ip_address: req?.ip || req?.connection?.remoteAddress || 'unknown',
      device,
      location: 'Kenya',
      status
    };

    const log = await AuditLog.create(logData);

    // Emit to admin dashboard in real-time
    if (ioInstance) {
      ioInstance.to('admins').emit('new_audit_log', {
        user_id: log.user_id,
        action: log.action,
        description: log.description,
        ip_address: log.ip_address,
        device: log.device,
        location: log.location,
        status: log.status,
        created_at: log.created_at
      });
    }

    return log;
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

module.exports = {
  setSocketInstance,
  logAction
};