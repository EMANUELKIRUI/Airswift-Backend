const express = require('express');
const multer = require('multer');
const {
  createApplication,
  getUserApplications,
  applyForJob,
  getMyApplications,
  getApplicationJobs,
  getAllApplicationsAdmin,
  downloadCV,
  updateApplicationStatus,
  updateApplicationNotes,
  getAdminStats,
  sendMessageToApplicants,
  scheduleInterview,
  markInterviewAttended,
  uploadApplicantDocs,
  verifyApplicationDocuments,
  shortlistApplication,
} = require('../controllers/applicationController');
const { verifyToken } = require('../middleware/auth');
const { authMiddleware } = require('../middleware/authMiddleware');
const { cloudUpload } = require('../middleware/cloudinaryUpload');
const adminOnly = require('../middleware/admin');
const isAdmin = adminOnly;

const upload = multer({ dest: 'uploads/' });

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum file size is 5MB.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'File upload error: too many files.' 
      });
    }
    // Handle other multer errors
    return res.status(400).json({ 
      message: 'File upload error: ' + err.message 
    });
  } else if (err) {
    console.error('Upload middleware error:', err);
    return res.status(400).json({ 
      message: err.message || 'File upload failed' 
    });
  }
  next();
};

const router = express.Router();

// User routes
router.get('/', authMiddleware, getUserApplications);
router.get('/job-options', getApplicationJobs); // ✅ Application form job dropdown options

const logUploadDebug = (req, res, next) => {
  console.log('BODY:', req.body);
  console.log('FILES:', req.files);
  next();
};

// ✅ Main application submission route (local multer upload)
router.post('/', authMiddleware, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 }
]), logUploadDebug, handleMulterError, createApplication);

// Alias route for backward compatibility
router.post('/create', authMiddleware, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 }
]), logUploadDebug, handleMulterError, createApplication);

// Existing cloud upload route remains available under /apply
router.post('/apply', verifyToken, cloudUpload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
]), handleMulterError, applyForJob);
router.get('/admin/applications', verifyToken, isAdmin, getAllApplicationsAdmin);
router.put('/admin/application/:id/status', verifyToken, isAdmin, updateApplicationStatus);
router.put('/admin/application/:id/notes', verifyToken, isAdmin, updateApplicationNotes);
router.get('/admin/stats', verifyToken, isAdmin, getAdminStats);
router.get('/user/applications', verifyToken, getMyApplications);
router.get('/my', verifyToken, getMyApplications);
router.post('/upload-documents', verifyToken, cloudUpload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'certificate', maxCount: 5 },
]), handleMulterError, uploadApplicantDocs);
router.post('/:id/attend-interview', verifyToken, markInterviewAttended);

// Admin routes
router.get('/admin/all', verifyToken, adminOnly, getAllApplicationsAdmin);
router.get('/:id/download', verifyToken, adminOnly, downloadCV);
router.put('/:id/status', verifyToken, adminOnly, updateApplicationStatus);
router.patch('/admin/:id/verify-documents', verifyToken, adminOnly, verifyApplicationDocuments);
router.patch('/admin/:id/shortlist', verifyToken, adminOnly, shortlistApplication);
router.post('/admin/message-applicants', verifyToken, adminOnly, sendMessageToApplicants);
router.post('/admin/:id/schedule-interview', verifyToken, adminOnly, scheduleInterview);

module.exports = router;