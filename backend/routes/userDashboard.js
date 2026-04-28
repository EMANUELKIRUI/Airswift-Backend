const express = require('express');
const { protect, authorize, verifyToken } = require('../middleware/auth');
const { User, Application } = require('../models');
const { getUserDashboard, getDashboardSummary, getUserProfile } = require('../controllers/userDashboardController');

const router = express.Router();

// ✅ USER DASHBOARD - For regular users
// Get comprehensive user dashboard data (documents, interviews, notifications, activities)
// GET /api/user-dashboard
router.get('/', verifyToken, getUserDashboard);

// Get dashboard summary with counts only
// GET /api/user-dashboard/summary
router.get('/summary', verifyToken, getDashboardSummary);

// Get user profile info
// GET /api/user-dashboard/profile
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
