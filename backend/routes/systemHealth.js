const express = require('express');
const {
  getSystemHealth,
  getHealthHistory,
  getHealthAlerts,
  startHealthMonitoring,
  stopHealthMonitoring,
  quickHealthCheck,
  getServerHealth,
  getDatabaseHealth,
  getServiceHealth,
} = require('../controllers/systemHealthController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All health routes require admin access
router.use(protect);
router.use(authorize('admin'));

router.get('/', getSystemHealth);
router.get('/server', getServerHealth);
router.get('/db', getDatabaseHealth);
router.get('/services', getServiceHealth);
router.get('/history', getHealthHistory);
router.get('/alerts', getHealthAlerts);
router.get('/quick', quickHealthCheck);

// Control endpoints
router.post('/start', startHealthMonitoring);
router.post('/stop', stopHealthMonitoring);

module.exports = router;