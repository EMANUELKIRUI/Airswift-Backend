const express = require('express');
const {
  getAuditLogs,
  exportAuditLogs,
  getSuspiciousActivities,
  cleanupAuditLogs,
} = require('../controllers/userActivityAuditController');
const { authMiddleware } = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// All audit routes require authentication and admin access
router.get('/', authMiddleware, adminOnly, getAuditLogs);
router.get('/export', authMiddleware, adminOnly, exportAuditLogs);
router.get('/suspicious', authMiddleware, adminOnly, getSuspiciousActivities);
router.delete('/cleanup', authMiddleware, adminOnly, cleanupAuditLogs);

module.exports = router;