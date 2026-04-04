const { AuditLog } = require('../models');

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

    await AuditLog.create(auditData);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

module.exports = {
  logAuditEvent,
};