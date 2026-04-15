const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Application = require('../models/ApplicationMongoose');
const {
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

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

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
router.get("/check", authMiddleware, async (req, res) => {
  try {
    const existing = await Application.findOne({
      userId: req.user.id,
    });

    res.json({ hasApplied: !!existing });
  } catch (err) {
    res.status(500).json({ message: "Error checking application" });
  }
});
router.get('/job-options', getApplicationJobs); // ✅ Application form job dropdown options

// ✅ Main application submission route (local multer upload)
router.post('/', authMiddleware, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
]), handleMulterError, async (req, res) => {
  try {
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    if (!req.files || !req.files.cv) {
      return res.status(400).json({ message: "CV is required" });
    }

    // continue saving...

    res.status(200).json({ message: "Application submitted successfully" });

  } catch (err) {
    console.error("APPLICATION ERROR:", err);
    res.status(500).json({ message: err.message }); // ✅ IMPORTANT
  }
});

// Alias route for backward compatibility
router.post('/create', authMiddleware, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log("📦 BODY:", req.body);
    console.log("📁 FILES:", req.files);

    // ✅ SAFE CHECK (prevents crash)
    if (!req.files || !req.files.cv || req.files.cv.length === 0) {
      return res.status(400).json({
        error: "CV file is required",
      });
    }

    if (!req.files.passport || req.files.passport.length === 0) {
      return res.status(400).json({
        error: "Passport file is required",
      });
    }

    const cv = req.files.cv[0];
    const passport = req.files.passport?.[0];

    console.log("✅ CV:", cv.filename);
    console.log("✅ Passport:", passport?.filename);

    // 👉 simulate save
    res.json({
      success: true,
      message: "Application submitted successfully",
    });

  } catch (err) {
    console.error("🔥 BACKEND CRASH:", err);

    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
});

// Existing local upload route for /apply with safe, no-crash logic
router.post('/apply', authMiddleware, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('📦 BODY:', req.body);
    console.log('📁 FILES:', req.files);

    if (!req.files || !req.files.cv || req.files.cv.length === 0) {
      return res.status(400).json({
        error: 'CV file is required',
      });
    }

    const cv = req.files.cv[0];
    const passport = req.files.passport?.[0];

    console.log('✅ CV:', cv.filename);
    console.log('✅ Passport:', passport?.filename);

    return res.json({
      success: true,
      message: 'Application submitted',
    });
  } catch (err) {
    console.error('🔥 ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});
// 🔐 ADMIN - Get all applications
router.get('/admin', verifyToken, adminOnly, async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('userId', 'name email')
      .populate('jobId')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put('/admin/application/:id/status', verifyToken, isAdmin, updateApplicationStatus);
router.put('/admin/application/:id/notes', verifyToken, isAdmin, updateApplicationNotes);
router.get('/admin/stats', verifyToken, isAdmin, getAdminStats);
router.get('/user/applications', verifyToken, getMyApplications);
// 🔐 USER - Get their applications
router.get('/my', verifyToken, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id })
      .populate('jobId')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/upload-documents', verifyToken, cloudUpload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'certificate', maxCount: 5 },
]), handleMulterError, uploadApplicantDocs);
router.post('/:id/attend-interview', verifyToken, markInterviewAttended);

// UPDATE USER PROFILE
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: req.body.name,
        phone: req.body.phone,
        location: req.body.location,
        skills: req.body.skills,
        experience: req.body.experience,
      },
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin routes
router.get('/admin/all', verifyToken, adminOnly, getAllApplicationsAdmin);
router.get('/:id/download', verifyToken, adminOnly, downloadCV);
router.put('/:id/status', verifyToken, adminOnly, updateApplicationStatus);
router.patch('/admin/:id/verify-documents', verifyToken, adminOnly, verifyApplicationDocuments);
router.patch('/admin/:id/shortlist', verifyToken, adminOnly, shortlistApplication);
router.post('/admin/message-applicants', verifyToken, adminOnly, sendMessageToApplicants);
router.post('/admin/:id/schedule-interview', verifyToken, adminOnly, scheduleInterview);

module.exports = router;