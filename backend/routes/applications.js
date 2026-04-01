const express = require('express');
const multer = require('multer');
const {
  applyForJob,
  getMyApplications,
  getAllApplicationsAdmin,
  updateApplicationStatus,
  sendMessageToApplicants,
  scheduleInterview,
  markInterviewAttended,
  uploadApplicantDocs,
} = require('../controllers/applicationController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Allowed file types: pdf, jpeg, png'), false);
    }
  },
});

const router = express.Router();

// User routes
router.post('/apply', authMiddleware, applyForJob);
router.get('/my', authMiddleware, getMyApplications);
router.post('/upload-documents', authMiddleware, upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'national_id', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'certificate', maxCount: 5 },
]), uploadApplicantDocs);
router.post('/:id/attend-interview', authMiddleware, markInterviewAttended);

// Admin routes
router.get('/admin/all', adminMiddleware, getAllApplicationsAdmin);
router.put('/:id/status', adminMiddleware, updateApplicationStatus);
router.post('/admin/message-applicants', adminMiddleware, sendMessageToApplicants);
router.post('/admin/:id/schedule-interview', adminMiddleware, scheduleInterview);

module.exports = router;