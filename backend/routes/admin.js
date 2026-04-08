const express = require('express');
const multer = require('multer');
const path = require('path');
const adminMiddleware = require('../middleware/admin');
const { adminLogin } = require('../controllers/authController');
const {
  getAllApplications,
  updateStatus,
  sendInterviewMessage,
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
  bulkUpdateUserStatus,
  bulkChangeUserRoles,
  impersonateUser,
} = require('../controllers/adminController');
const {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getFeatureFlags,
} = require('../controllers/settingsController');
const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/emailTemplateController');
const { sendInterviewMessage } = require('../controllers/interviewMessageController');
const { getDashboardSummary, getDashboardTrends, getHiringFunnel, getDashboardActivities, getDashboardSettingsSummary } = require('../controllers/dashboardController');
const { seedEmailTemplates } = require('../scripts/seedEmailTemplates');

const interviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/interviews/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const interviewUpload = multer({
  storage: interviewStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF attachments are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = express.Router();

// Admin auth route
router.post('/login', adminLogin);

// Settings routes
router.get('/settings', adminMiddleware, getAllSettings);
router.get('/settings/feature-flags', adminMiddleware, getFeatureFlags);
router.get('/settings/category/:category', adminMiddleware, getSettingsByCategory);
router.get('/settings/:key', adminMiddleware, getSettingByKey);
router.post('/settings', adminMiddleware, createSetting);
router.put('/settings/:key', adminMiddleware, updateSetting);
router.delete('/settings/:key', adminMiddleware, deleteSetting);

// Admin application control routes
router.get('/applications', adminMiddleware, getAllApplications);
router.put('/application/:id', adminMiddleware, updateStatus);
router.patch('/applications/:id', adminMiddleware, updateStatus);
router.post('/messages/send', adminMiddleware, sendInterviewMessage);
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

// Interview messaging routes
router.post('/send-interview-message', adminMiddleware, interviewUpload.single('attachment'), sendInterviewMessage);

// Email template manager routes
router.get('/email-templates', adminMiddleware, getAllTemplates);
router.get('/email-templates/:id', adminMiddleware, getTemplateById);
router.post('/email-templates', adminMiddleware, createTemplate);
router.put('/email-templates/:id', adminMiddleware, updateTemplate);
router.delete('/email-templates/:id', adminMiddleware, deleteTemplate);

// Seed test jobs for development/testing

// Seed email templates
router.post('/seed-email-templates', adminMiddleware, async (req, res) => {
  try {
    await seedEmailTemplates();
    res.json({ message: 'Email templates seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error seeding templates', error: error.message });
  }
});
router.post('/seed-jobs', adminMiddleware, seedTestJobs);

router.get('/dashboard', adminMiddleware, getDashboardSummary);
router.get('/dashboard/summary', adminMiddleware, getDashboardSummary);
router.get('/dashboard/trends', adminMiddleware, getDashboardTrends);
router.get('/dashboard/funnel', adminMiddleware, getHiringFunnel);
router.get('/dashboard/activities', adminMiddleware, getDashboardActivities);
router.get('/dashboard/settings-summary', adminMiddleware, getDashboardSettingsSummary);

// User Management routes
router.get('/users', adminMiddleware, getAllUsers);
router.get('/users/:id', adminMiddleware, getUserById);
router.put('/users/:id', adminMiddleware, updateUser);
router.patch('/users/:id/deactivate', adminMiddleware, deactivateUser);
router.patch('/users/:id/activate', adminMiddleware, activateUser);
router.patch('/users/:id/role', adminMiddleware, changeUserRole);
router.post('/users/:id/impersonate', adminMiddleware, impersonateUser);
router.patch('/users/bulk-status', adminMiddleware, bulkUpdateUserStatus);
router.patch('/users/bulk-role', adminMiddleware, bulkChangeUserRoles);
router.delete('/users/:id', adminMiddleware, deleteUser);

// System Health & Monitoring routes
router.get('/health', adminMiddleware, getSystemHealth);
router.get('/system/health', adminMiddleware, getSystemHealth);

// Bulk Operations routes
router.patch('/applications/bulk-update', adminMiddleware, bulkUpdateApplications);
router.delete('/applications/bulk-delete', adminMiddleware, bulkDeleteApplications);

// Payment Management routes
router.get('/payments', adminMiddleware, getAllPayments);
router.put('/payments/:id/status', adminMiddleware, updatePaymentStatus);
router.get('/payments/stats', adminMiddleware, getPaymentStats);

module.exports = router;
