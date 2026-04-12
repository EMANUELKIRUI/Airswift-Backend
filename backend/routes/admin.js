const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
// const { adminLogin } = require('../controllers/authController'); // Removed - admin uses regular login
const {
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
  bulkUpdateUserStatus,
  bulkChangeUserRoles,
  impersonateUser,
  getAuditLogs,
  exportAuditLogs,
  getAuditStats,
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

const interviewsDir = path.join(__dirname, '../uploads/interviews');
if (!fs.existsSync(interviewsDir)) {
  fs.mkdirSync(interviewsDir, { recursive: true });
}

const interviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, interviewsDir);
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

// Admin auth route - REMOVED: Admin uses regular /api/auth/login endpoint
// router.post('/login', adminLogin);

// Settings routes
router.get('/settings', verifyToken, adminOnly, getAllSettings);
router.get('/settings/feature-flags', verifyToken, adminOnly, getFeatureFlags);
router.get('/settings/category/:category', verifyToken, adminOnly, getSettingsByCategory);
router.get('/settings/:key', verifyToken, adminOnly, getSettingByKey);
router.post('/settings', verifyToken, adminOnly, createSetting);
router.put('/settings/:key', verifyToken, adminOnly, updateSetting);
router.delete('/settings/:key', verifyToken, adminOnly, deleteSetting);

// Admin application control routes
router.get('/applications', verifyToken, adminOnly, getAllApplications);
router.put('/application/:id', verifyToken, adminOnly, updateStatus);
router.patch('/applications/:id', verifyToken, adminOnly, updateStatus);
router.post('/messages/send', verifyToken, adminOnly, sendInterviewMessage);
router.get('/stats', verifyToken, adminOnly, getStats);
router.post('/send-interview/:id', verifyToken, adminOnly, sendInterview);
router.post('/generate-offer/:id', verifyToken, adminOnly, generateOffer);

// Job Management routes
router.get('/jobs', verifyToken, adminOnly, getJobs);
router.post('/jobs', verifyToken, adminOnly, createJob);
router.put('/jobs/:id', verifyToken, adminOnly, updateJob);
router.delete('/jobs/:id', verifyToken, adminOnly, deleteJob);

// AI CV Scoring routes
router.post('/cv-scoring/analyze', verifyToken, adminOnly, analyzeSingleCV);
router.post('/cv-scoring/bulk-analyze', verifyToken, adminOnly, bulkAnalyzeCV);

// Real-time applicant tracking routes
router.patch('/applicants/status', verifyToken, adminOnly, updateApplicantStatusWithSocket);

// Email communication routes
router.post('/email/send', verifyToken, adminOnly, sendEmailToApplicant);
router.post('/email/send-bulk', verifyToken, adminOnly, sendBulkEmailToApplicants);

// Interview messaging routes
router.post('/send-interview-message', verifyToken, adminOnly, interviewUpload.single('attachment'), sendInterviewMessage);

// Email template manager routes
router.get('/email-templates', verifyToken, adminOnly, getAllTemplates);
router.get('/email-templates/:id', verifyToken, adminOnly, getTemplateById);
router.post('/email-templates', verifyToken, adminOnly, createTemplate);
router.put('/email-templates/:id', verifyToken, adminOnly, updateTemplate);
router.delete('/email-templates/:id', verifyToken, adminOnly, deleteTemplate);

// Seed test jobs for development/testing

// Seed email templates
router.post('/seed-email-templates', verifyToken, adminOnly, async (req, res) => {
  try {
    await seedEmailTemplates();
    res.json({ message: 'Email templates seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error seeding templates', error: error.message });
  }
});
router.post('/seed-jobs', verifyToken, adminOnly, seedTestJobs);

router.get('/dashboard', verifyToken, adminOnly, getDashboardSummary);
router.get('/dashboard/summary', verifyToken, adminOnly, getDashboardSummary);
router.get('/dashboard/trends', verifyToken, adminOnly, getDashboardTrends);
router.get('/dashboard/funnel', verifyToken, adminOnly, getHiringFunnel);
router.get('/dashboard/activities', verifyToken, adminOnly, getDashboardActivities);
router.get('/dashboard/settings-summary', verifyToken, adminOnly, getDashboardSettingsSummary);

// User Management routes
router.get('/users', verifyToken, adminOnly, getAllUsers);
router.get('/users/:id', verifyToken, adminOnly, getUserById);
router.put('/users/:id', verifyToken, adminOnly, updateUser);
router.patch('/users/:id/deactivate', verifyToken, adminOnly, deactivateUser);
router.patch('/users/:id/activate', verifyToken, adminOnly, activateUser);
router.patch('/users/:id/role', verifyToken, adminOnly, changeUserRole);
router.post('/users/:id/impersonate', verifyToken, adminOnly, impersonateUser);
router.patch('/users/bulk-status', verifyToken, adminOnly, bulkUpdateUserStatus);
router.patch('/users/bulk-role', verifyToken, adminOnly, bulkChangeUserRoles);
router.delete('/users/:id', verifyToken, adminOnly, deleteUser);

// System Health & Monitoring routes
router.get('/health', verifyToken, adminOnly, getSystemHealth);
router.get('/system/health', verifyToken, adminOnly, getSystemHealth);

// Bulk Operations routes
router.patch('/applications/bulk-update', verifyToken, adminOnly, bulkUpdateApplications);
router.delete('/applications/bulk-delete', verifyToken, adminOnly, bulkDeleteApplications);

// Payment Management routes
router.get('/payments', verifyToken, adminOnly, getAllPayments);
router.put('/payments/:id/status', verifyToken, adminOnly, updatePaymentStatus);
router.get('/payments/stats', verifyToken, adminOnly, getPaymentStats);

// Audit Log routes
router.get('/audit/logs', verifyToken, adminOnly, getAuditLogs);
router.get('/audit/logs/export', verifyToken, adminOnly, exportAuditLogs);
router.get('/audit/stats', verifyToken, adminOnly, getAuditStats);

module.exports = router;
