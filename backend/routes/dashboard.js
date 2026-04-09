const express = require('express');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getApplicationStats,
  getApplicationsOverTime,
  getCVScoreDistribution,
  getJobApplicationDistribution,
  getInterviewStats,
  getHiringFunnel,
  getPaymentStats,
  getTopSkills,
  getAverageTimeToHire,
  getDashboardSummary,
  getDashboardTrends,
  getDashboardActivities,
  getDashboardSettingsSummary
} = require('../controllers/dashboardController');

const router = express.Router();

// All dashboard routes require authentication and admin role
router.use(verifyToken);
router.use(adminMiddleware);

// Get dashboard summary
router.get('/summary', getDashboardSummary);
router.get('/trends', getDashboardTrends);
router.get('/activities', getDashboardActivities);
router.get('/settings-summary', getDashboardSettingsSummary);

// Application statistics
router.get('/applications/stats', getApplicationStats);
router.get('/applications/over-time', getApplicationsOverTime);
router.get('/applications/by-job', getJobApplicationDistribution);

// CV scoring analytics
router.get('/cv/score-distribution', getCVScoreDistribution);
router.get('/cv/top-skills', getTopSkills);

// Interview analytics
router.get('/interviews/stats', getInterviewStats);

// Hiring funnel
router.get('/funnel', getHiringFunnel);

// Revenue/Payment analytics
router.get('/payments/stats', getPaymentStats);

// Time to hire analytics
router.get('/time-to-hire', getAverageTimeToHire);

module.exports = router;
