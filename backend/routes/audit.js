const express = require('express');
const { getAuditLogs, getAuditStats } = require('../controllers/auditController');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// All audit routes require admin access
router.get('/', adminMiddleware, getAuditLogs);
router.get('/stats', adminMiddleware, getAuditStats);

module.exports = router;