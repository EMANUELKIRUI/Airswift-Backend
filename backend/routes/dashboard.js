const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Application = require('../models/ApplicationMongoose');
const AuditLog = require('../models/AuditLogMongo');

const router = express.Router();

// All dashboard routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Get dashboard summary (root route)
router.get('/', async (req, res) => {
  try {
    // Get basic counts from MongoDB
    const totalUsers = await User.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalAuditLogs = await AuditLog.countDocuments();

    // Get recent applications
    const recentApplications = await Application.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent audit logs
    const recentAuditLogs = await AuditLog.find()
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      summary: {
        totalUsers,
        totalApplications,
        totalAuditLogs
      },
      recentApplications,
      recentAuditLogs,
      message: 'Dashboard data loaded successfully'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Time to hire analytics
router.get('/time-to-hire', async (req, res) => {
  res.json({ message: 'Time to hire analytics not implemented yet' });
});

module.exports = router;
