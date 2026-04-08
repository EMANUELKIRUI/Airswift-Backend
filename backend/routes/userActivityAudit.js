const express = require('express');
const {
  getAuditLogs,
  exportAuditLogs,
  getSuspiciousActivities,
  cleanupAuditLogs,
} = require('../controllers/userActivityAuditController');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// All audit routes require admin access
router.get('/', adminMiddleware, getAuditLogs);
router.get('/export', adminMiddleware, exportAuditLogs);
router.get('/suspicious', adminMiddleware, getSuspiciousActivities);
router.delete('/cleanup', adminMiddleware, cleanupAuditLogs);

module.exports = router;