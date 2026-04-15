const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLogMongo");
const { verifyToken } = require("../middleware/auth");

// GET single audit log
router.get("/:id", async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate("userId", "email name");

    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch log" });
  }
});

// GET logs with filters
router.get("/", verifyToken, async (req, res) => {
  try {
    const { search, action, resource } = req.query;

    let query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;

    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    const logs = await AuditLog.find(query)
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .limit(100); // Limit to prevent large responses

    res.json(logs);
  } catch (err) {
    console.error("Audit logs fetch error:", err);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

module.exports = router;