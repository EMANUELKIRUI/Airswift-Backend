const Settings = require('../models/Settings');

// GET settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ singleton: true });

    if (!settings) {
      settings = await Settings.findOne();
    }

    if (!settings) {
      settings = await Settings.create({ singleton: true });
    } else if (!settings.singleton) {
      settings.singleton = true;
      await settings.save();
    }

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SAVE settings
exports.saveSettings = async (req, res) => {
  try {
    const payload = { ...req.body, singleton: true };

    const settings = await Settings.findOneAndUpdate(
      { singleton: true },
      payload,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        strict: false,
      }
    );

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings,
    });
  } catch (err) {
    console.error('❌ Save settings error:', err);
    res.status(500).json({ error: err.message });
  }
};
