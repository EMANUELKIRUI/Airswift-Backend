const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Application = require('../models/ApplicationMongoose');
const {
  getUserApplications,
  applyForJob,
  getMyApplications,
  getMyApplication,
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
const { verifyToken, protect, permit } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { authMiddleware } = require('../middleware/authMiddleware');
const { cloudUpload } = require('../middleware/cloudinaryUpload');
const adminOnly = require('../middleware/admin');
const isAdmin = adminOnly;

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum file size is 10MB.' 
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
router.get('/', protect, getUserApplications);
router.get("/check", protect, async (req, res) => {
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

// ✅ Main application submission route (requires apply_jobs permission)
router.post('/', protect, permit('apply_jobs'), upload.fields([
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

    if (!req.files.passport) {
      return res.status(400).json({ message: "Passport is required" });
    }

    if (!req.files.nationalId) {
      return res.status(400).json({ message: "National ID is required" });
    }

    const { jobId, phone } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Create new application document
    const newApplication = new Application({
      userId: req.user.id,
      jobId: jobId,
      phone: phone,
      cv: req.files.cv[0].filename,
      passport: req.files.passport[0].filename,
      nationalId: req.files.nationalId[0].filename,
      applicationStatus: 'pending',
    });

    // Save to database
    const savedApplication = await newApplication.save();

    console.log("✅ Application saved:", savedApplication._id);

    res.status(201).json({ 
      message: "Application submitted successfully",
      application: savedApplication 
    });

  } catch (err) {
    console.error("APPLICATION ERROR:", err);
    res.status(500).json({ message: err.message }); // ✅ IMPORTANT
  }
});

// Alias route for backward compatibility (requires apply_jobs permission)
router.post('/create', protect, permit('apply_jobs'), upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
]), handleMulterError, async (req, res) => {
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

    if (!req.files.nationalId || req.files.nationalId.length === 0) {
      return res.status(400).json({
        error: "National ID file is required",
      });
    }

    const { jobId, phone } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const cv = req.files.cv[0];
    const passport = req.files.passport?.[0];
    const nationalId = req.files.nationalId?.[0];

    console.log("✅ CV:", cv.filename);
    console.log("✅ Passport:", passport?.filename);
    console.log("✅ National ID:", nationalId?.filename);

    // Create and save new application
    const newApplication = new Application({
      userId: req.user.id,
      jobId: jobId,
      phone: phone,
      cv: cv.filename,
      passport: passport.filename,
      nationalId: nationalId.filename,
      applicationStatus: 'pending',
    });

    const savedApplication = await newApplication.save();

    res.json({
      success: true,
      message: "Application submitted successfully",
      application: savedApplication,
    });

  } catch (err) {
    console.error("🔥 BACKEND CRASH:", err);

    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
});

// Existing local upload route for /apply with safe, no-crash logic (requires apply_jobs permission)
router.post('/apply', protect, permit('apply_jobs'), upload.fields([
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

    if (!req.files.passport || req.files.passport.length === 0) {
      return res.status(400).json({
        error: 'Passport file is required',
      });
    }

    if (!req.files.nationalId || req.files.nationalId.length === 0) {
      return res.status(400).json({
        error: 'National ID file is required',
      });
    }

    const { jobId, phone } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cv = req.files.cv[0];
    const passport = req.files.passport?.[0];
    const nationalId = req.files.nationalId?.[0];

    console.log('✅ CV:', cv.filename);
    console.log('✅ Passport:', passport?.filename);
    console.log('✅ National ID:', nationalId?.filename);

    // Create and save new application
    const newApplication = new Application({
      userId: req.user.id,
      jobId: jobId,
      phone: phone,
      cv: cv.filename,
      passport: passport.filename,
      nationalId: nationalId.filename,
      applicationStatus: 'pending',
    });

    const savedApplication = await newApplication.save();
    console.log('✅ Application saved:', savedApplication._id);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: savedApplication,
    });
  } catch (err) {
    console.error('🔥 ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});
// 🔐 ADMIN - Get all applications (requires view_all_applications permission)
router.get('/admin', protect, permit('view_all_applications'), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('userId', 'name email phone location')
      .populate('jobId', 'title description')
      .sort({ createdAt: -1 });

    console.log('✅ Retrieved', applications.length, 'applications for admin');

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (err) {
    console.error('❌ Admin fetch error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message
    });
  }
});
router.put('/admin/application/:id/status', protect, permit('manage_applications'), updateApplicationStatus);
router.put('/admin/application/:id/notes', protect, permit('manage_applications'), updateApplicationNotes);
router.get('/admin/stats', protect, permit('view_analytics'), getAdminStats);
router.get('/user/applications', verifyToken, getMyApplications);
// 🔐 USER - Get their single application
router.get('/me', verifyToken, getMyApplication);
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

// NOTE: CONSOLIDATED - Use /admin endpoint instead of /admin/all
router.get('/:id/download', protect, permit('view_applications'), downloadCV);
router.put('/:id/status', protect, permit('manage_applications'), updateApplicationStatus);
router.patch('/admin/:id/verify-documents', protect, permit('manage_applications'), verifyApplicationDocuments);
router.patch('/admin/:id/shortlist', protect, permit('manage_applications'), shortlistApplication);
router.post('/admin/message-applicants', protect, permit('manage_applications'), sendMessageToApplicants);
router.post('/admin/:id/schedule-interview', protect, permit('manage_applications'), scheduleInterview);

module.exports = router;