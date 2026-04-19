const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLogMongo");
const { verifyToken, permit } = require("../middleware/auth");

router.get("/", verifyToken, permit("view_audit_logs"), async (req, res) => {
  try {
    const { search, action, user, startDate, endDate } = req.query;

    let query = {};

    // 🔍 Search (description)
    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    // 🎯 Filter by action
    if (action) {
      query.action = action;
    }

    // 👤 Filter by user
    if (user) {
      query.user_id = user;
    }

    // 📅 Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate("user_id", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    console.error("Audit logs fetch error:", err);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// GET single audit log by ID
router.get("/:id", verifyToken, permit("view_audit_logs"), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate("user_id", "name email");

    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.json(log);
  } catch (err) {
    console.error("Audit log fetch error:", err);
    res.status(500).json({ message: "Failed to fetch audit log" });
  }
});

module.exports = router;
