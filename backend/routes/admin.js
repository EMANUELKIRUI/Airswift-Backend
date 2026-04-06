const express = require('express');
const adminMiddleware = require('../middleware/admin');
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
} = require('../controllers/adminController');

const router = express.Router();

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

router.get('/dashboard', adminMiddleware, (req, res) => {
  res.json({
    message: 'Welcome Admin',
    stats: {
      users: 120,
      applications: 45,
    },
  });
});

module.exports = router;