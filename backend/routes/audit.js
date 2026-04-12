const express = require('express');
const { getAuditLogs, getAuditStats, exportAuditCsv, exportAuditPdf } = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// All audit routes require authentication and admin access
router.get('/', authMiddleware, adminOnly, getAuditLogs);
router.get('/stats', authMiddleware, adminOnly, getAuditStats);
router.get('/export/csv', authMiddleware, adminOnly, exportAuditCsv);
router.get('/export/pdf', authMiddleware, adminOnly, exportAuditPdf);

module.exports = router;