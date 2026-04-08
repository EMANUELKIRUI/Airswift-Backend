const express = require('express');
const {
  getSystemHealth,
  getHealthHistory,
  getHealthAlerts,
  startHealthMonitoring,
  stopHealthMonitoring,
  quickHealthCheck,
} = require('../controllers/systemHealthController');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// All health routes require admin access
router.get('/', adminMiddleware, getSystemHealth);
router.get('/history', adminMiddleware, getHealthHistory);
router.get('/alerts', adminMiddleware, getHealthAlerts);
router.get('/quick', adminMiddleware, quickHealthCheck);

// Control endpoints
router.post('/start', adminMiddleware, startHealthMonitoring);
router.post('/stop', adminMiddleware, stopHealthMonitoring);

module.exports = router;