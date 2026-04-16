const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const adminOnly = adminMiddleware;
const Application = require('../models/ApplicationMongoose');
const { sendEmail } = require('../utils/sendEmail');
const { logAction } = require('../utils/auditLogger');
const {
  applyJob,
  updateApplicationStatus,
  getUserApplications,
  getAllApplications,
  getApplicationAnalytics,
  downloadFile,
} = require('../controllers/applicationMongooseController');

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = express.Router();

router.post('/apply', verifyToken, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
]), applyJob);
// GET user application
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const application = await Application.findOne({ userId: userId })
      .populate("jobId");

    if (!application) {
      return res.status(404).json({ message: "No application found" });
    }

    res.json(application);

  } catch (err) {
    console.error("FETCH APPLICATION ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/admin", verifyToken, adminOnly, async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("userId", "name email")
      .populate("jobId", "title");

    res.json(applications);

  } catch (err) {
    console.error("ADMIN FETCH ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});
// Approve
router.put("/admin/:id/approve", verifyToken, adminOnly, async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { status: "Hired" },
      { new: true }
    ).populate("userId jobId");

    // 🔥 SEND EMAIL
    await sendEmail({
      to: app.userId.email,
      subject: "Application Approved 🎉",
      html: `
        <h2>Congratulations ${app.userId.name}!</h2>
        <p>Your application for <strong>${app.jobId.title}</strong> has been <b>APPROVED</b>.</p>
        <p>We will contact you soon.</p>
      `,
      type: 'application_approved',
      sentBy: req.user.id,
      req,
    });

    // Audit log
    await logAction(req.user.id, "APPLICATION_APPROVED", `Admin approved application for ${app.userId.name}`);

    res.json(app);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject
router.put("/admin/:id/reject", verifyToken, adminOnly, async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    ).populate("userId jobId");

    await sendEmail({
      to: app.userId.email,
      subject: "Application Update",
      html: `
        <h2>Hello ${app.userId.name},</h2>
        <p>We regret to inform you that your application for <strong>${app.jobId.title}</strong> was not successful.</p>
        <p>Thank you for applying. Keep trying!</p>
      `,
      type: 'application_rejected',
      sentBy: req.user.id,
      req,
    });

    // Audit log
    await logAction(req.user.id, "APPLICATION_REJECTED", `Admin rejected application for ${app.userId.name}`);

    res.json(app);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/:id/download/:fileType', verifyToken, adminOnly, downloadFile);
router.get('/admin/all', adminMiddleware, getAllApplications);
router.get('/admin/analytics', adminMiddleware, getApplicationAnalytics);
router.put('/status', adminMiddleware, updateApplicationStatus);

module.exports = router;
