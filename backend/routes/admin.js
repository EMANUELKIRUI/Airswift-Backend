const express = require('express');
const adminMiddleware = require('../middleware/admin');
const { adminLogin } = require('../controllers/authController');
const {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getAllApplications,
  updateStatus,
  getStats,
  sendInterview,
  generateOffer,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  analyzeSingleCV,
  bulkAnalyzeCV,
  updateApplicantStatusWithSocket,
  sendEmailToApplicant,
  sendBulkEmailToApplicants,
  seedTestJobs,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  changeUserRole,
  deleteUser,
  getSystemHealth,
  bulkUpdateApplications,
  bulkDeleteApplications,
  getAllPayments,
  updatePaymentStatus,
  getPaymentStats,
} = require('../controllers/adminController');
const { getDashboardSummary } = require('../controllers/dashboardController');

const router = express.Router();

// Admin auth route
router.post('/login', adminLogin);

// Settings routes
router.get('/settings', adminMiddleware, getAllSettings);
router.get('/settings/:key', adminMiddleware, getSettingByKey);
router.post('/settings', adminMiddleware, createSetting);
router.put('/settings/:key', adminMiddleware, updateSetting);
router.delete('/settings/:key', adminMiddleware, deleteSetting);

// Admin application control routes
router.get('/applications', adminMiddleware, getAllApplications);
router.put('/application/:id', adminMiddleware, updateStatus);
router.patch('/applications/:id', adminMiddleware, updateStatus);
router.get('/stats', adminMiddleware, getStats);
router.post('/send-interview/:id', adminMiddleware, sendInterview);
router.post('/generate-offer/:id', adminMiddleware, generateOffer);

// Job Management routes
router.get('/jobs', adminMiddleware, getJobs);
router.post('/jobs', adminMiddleware, createJob);
router.put('/jobs/:id', adminMiddleware, updateJob);
router.delete('/jobs/:id', adminMiddleware, deleteJob);

// AI CV Scoring routes
router.post('/cv-scoring/analyze', adminMiddleware, analyzeSingleCV);
router.post('/cv-scoring/bulk-analyze', adminMiddleware, bulkAnalyzeCV);

// Real-time applicant tracking routes
router.patch('/applicants/status', adminMiddleware, updateApplicantStatusWithSocket);

// Email communication routes
router.post('/email/send', adminMiddleware, sendEmailToApplicant);
router.post('/email/send-bulk', adminMiddleware, sendBulkEmailToApplicants);

// Seed test jobs for development/testing
router.post('/seed-jobs', adminMiddleware, seedTestJobs);

router.get('/dashboard', adminMiddleware, getDashboardSummary);
router.get('/dashboard/summary', adminMiddleware, getDashboardSummary);

// User Management routes
router.get('/users', adminMiddleware, getAllUsers);
router.get('/users/:id', adminMiddleware, getUserById);
router.put('/users/:id', adminMiddleware, updateUser);
router.patch('/users/:id/deactivate', adminMiddleware, deactivateUser);
router.patch('/users/:id/activate', adminMiddleware, activateUser);
router.patch('/users/:id/role', adminMiddleware, changeUserRole);
router.delete('/users/:id', adminMiddleware, deleteUser);

// System Health & Monitoring routes
router.get('/health', adminMiddleware, getSystemHealth);

// Bulk Operations routes
router.patch('/applications/bulk-update', adminMiddleware, bulkUpdateApplications);
router.delete('/applications/bulk-delete', adminMiddleware, bulkDeleteApplications);

// Payment Management routes
router.get('/payments', adminMiddleware, getAllPayments);
router.put('/payments/:id/status', adminMiddleware, updatePaymentStatus);
router.get('/payments/stats', adminMiddleware, getPaymentStats);

module.exports = router;
