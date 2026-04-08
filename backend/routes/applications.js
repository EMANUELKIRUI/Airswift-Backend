const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const {
  createApplication,
  getUserApplications,
  applyForJob,
  getMyApplications,
  getAllApplicationsAdmin,
  downloadCV,
  updateApplicationStatus,
  sendMessageToApplicants,
  scheduleInterview,
  markInterviewAttended,
  uploadApplicantDocs,
} = require('../controllers/applicationController');
const { verifyToken } = require('../middleware/auth');
const { authMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const adminMiddleware = require('../middleware/admin');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'talex_uploads',
    resource_type: 'auto',
  },
});

const cloudUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF allowed'), false);
    }

    cb(null, true);
  },
});

const router = express.Router();

// User routes
router.get('/', authMiddleware, getUserApplications);
router.post('/', authMiddleware, upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
]), createApplication);
router.post('/apply', verifyToken, cloudUpload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
]), applyForJob);
router.get('/my', verifyToken, getMyApplications);
router.post('/upload-documents', verifyToken, cloudUpload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'certificate', maxCount: 5 },
]), uploadApplicantDocs);
router.post('/:id/attend-interview', verifyToken, markInterviewAttended);

// Admin routes
router.get('/admin/all', adminMiddleware, getAllApplicationsAdmin);
router.get('/:id/download', adminMiddleware, downloadCV);
router.put('/:id/status', adminMiddleware, updateApplicationStatus);
router.post('/admin/message-applicants', adminMiddleware, sendMessageToApplicants);
router.post('/admin/:id/schedule-interview', adminMiddleware, scheduleInterview);

module.exports = router;