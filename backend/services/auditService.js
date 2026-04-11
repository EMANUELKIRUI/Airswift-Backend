const AuditLog = require('../models/AuditLogMongo');

let ioInstance = null;

const parseDeviceFromUserAgent = (userAgent) => {
  let device = 'Unknown';
  const ua = String(userAgent || '').toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  } else {
    device = 'Desktop';
  }

  if (ua.includes('chrome') && !ua.includes('edg')) device += ' on Chrome';
  else if (ua.includes('firefox')) device += ' on Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) device += ' on Safari';
  else if (ua.includes('edg')) device += ' on Edge';
  else if (ua.includes('opera')) device += ' on Opera';
  else if (!ua) device += ' on Unknown Browser';

  return device;
};

const setSocketInstance = (io) => {
  ioInstance = io;
};

const logAction = async ({
  userId = null,
  action,
  entity,
  entityId,
  details,
  description,
  req,
  status = 'success'
}) => {
  try {
    const userAgent = req?.headers?.['user-agent'] || 'unknown';
    const device = parseDeviceFromUserAgent(userAgent);

    const logData = {
      user_id: userId,
      action: action ? action.toUpperCase() : undefined,
      entity,
      entity_id: entityId,
      details,
      description,
      user_agent: userAgent,
      ip_address: req?.ip || req?.connection?.remoteAddress || 'unknown',
      device,
      location: 'Kenya',
      status,
    };

    const log = await AuditLog.create(logData);

    if (ioInstance) {
      const payload = {
        user_id: log.user_id,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        details: log.details,
        description: log.description,
        ip_address: log.ip_address,
        device: log.device,
        location: log.location,
        status: log.status,
        created_at: log.created_at,
      };

      ioInstance.emit('audit:new', payload);
      ioInstance.to('admins').emit('new_audit_log', payload);
      ioInstance.to('admins').emit('user_action', {
        ...payload,
        timestamp: new Date(),
      });
    }

    return log;
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};

module.exports = {
  setSocketInstance,
  logAction,
};
