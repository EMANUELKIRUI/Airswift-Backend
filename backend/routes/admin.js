const express = require("express");
const router = express.Router();
const { protect, authorize, permit } = require("../middleware/auth");

const User = require("../models/User");
const Application = require("../models/ApplicationMongoose");
const Interview = require("../models/Interview");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLogMongo");

// 🔐 Protect all admin routes - requires admin role
router.use(protect, authorize('admin'));

//
// ✅ USERS - requires manage_users permission
//
router.get("/users", permit('manage_users'), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id", permit('manage_users'), async (req, res) => {
  try {
    const { applicationStatus } = req.body;
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { applicationStatus },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit real-time update to user
    const io = require('../utils/socket').getIO();
    io.to(userId).emit('statusUpdate', { status: applicationStatus });

    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ APPLICATIONS - requires view_all_applications permission
//
router.get("/applications", permit('view_all_applications'), async (req, res) => {
  try {
    const apps = await Application.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ INTERVIEWS - requires manage_interviews permission
//
router.get("/interviews", permit('manage_interviews'), async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate("user", "name email")
      .populate("application");

    res.json(interviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ PAYMENTS - requires view_analytics permission
//
router.get("/payments", permit('view_analytics'), async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ AUDIT LOGS - requires view_audit_logs permission
//
router.get("/audit", permit('view_audit_logs'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
