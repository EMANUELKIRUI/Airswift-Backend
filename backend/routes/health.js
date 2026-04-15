const express = require("express");
const router = express.Router();
const os = require("os");

router.get("/", async (req, res) => {
  try {
    const health = {
      server: "UP",
      uptime: process.uptime(),

      cpu: {
        usage: os.loadavg()[0], // 1 min load
      },

      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      },

      database: "UP", // you can improve later
      responseTime: Date.now(),
    };

    res.json(health);
  } catch (err) {
    res.status(500).json({ message: "Health check failed" });
  }
});

module.exports = router;