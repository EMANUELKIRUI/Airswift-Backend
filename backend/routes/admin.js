const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const User = require("../models/User");
const Application = require("../models/ApplicationMongoose");
const Interview = require("../models/Interview");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLogMongo");

// 🔐 Protect all admin routes
router.use(verifyToken, adminOnly);

//
// ✅ USERS
//
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ APPLICATIONS
//
router.get("/applications", async (req, res) => {
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
// ✅ INTERVIEWS
//
router.get("/interviews", async (req, res) => {
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
// ✅ PAYMENTS
//
router.get("/payments", async (req, res) => {
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
// ✅ AUDIT LOGS
//
router.get("/audit", async (req, res) => {
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
