const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { verifyToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// GET settings
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne({ singleton: true });
    if (!settings) {
      settings = await Settings.create({ singleton: true });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE settings
router.put('/', verifyToken, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne({ singleton: true });
    if (!settings) {
      settings = new Settings({ singleton: true });
    }

    Object.assign(settings, req.body);
    await settings.save();

    if (global.io) {
      global.io.emit('settings_updated', settings);
    }

    res.json({
      success: true,
      message: 'Settings updated',
      settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;