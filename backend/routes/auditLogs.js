const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLogMongo");
const { verifyToken, permit } = require("../middleware/auth");

router.get("/", verifyToken, permit("view_audit_logs"), async (req, res) => {
  try {
    const { search, action, user, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};

    // 🔍 Search (description)
    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    // 🎯 Filter by action
    if (action && action !== "all") {
      query.action = action;
    }

    // 👤 Filter by user
    if (user && user !== "all") {
      query.user_id = user;
    }

    // 📅 Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate("user_id", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    console.log(`✅ Fetched ${logs.length} audit logs (Total: ${total}, Page: ${pageNum})`);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("❌ Audit logs fetch error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch audit logs",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET single audit log by ID
router.get("/:id", verifyToken, permit("view_audit_logs"), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate("user_id", "name email role");

    if (!log) {
      return res.status(404).json({ 
        success: false,
        message: "Audit log not found" 
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (err) {
    console.error("❌ Audit log fetch error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch audit log",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
