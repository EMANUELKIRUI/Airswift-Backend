const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const {
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
const adminMiddleware = require('../middleware/admin');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'talex_uploads',
    resource_type: 'auto',
  },
});

const upload = multer({
  storage,
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
router.post('/apply', verifyToken, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
]), applyForJob);
router.get('/my', verifyToken, getMyApplications);
router.post('/upload-documents', verifyToken, upload.fields([
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