const Settings = require('../models/Settings');

// GET settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SAVE settings
exports.saveSettings = async (req, res) => {
  try {
    console.log('Incoming settings:', req.body);
    console.log('User:', req.user);

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings
    });
  } catch (err) {
    console.error('❌ Save settings error:', err);
    res.status(500).json({ error: err.message });
  }
};
