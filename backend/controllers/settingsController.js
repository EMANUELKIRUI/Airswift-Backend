const Settings = require('../models/Settings');
const auditLogger = require('../utils/auditLogger');

// Get all settings (admin only)
const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.find({})
      .populate('updatedBy', 'name email')
      .sort({ category: 1, key: 1 });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get settings by category
const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await Settings.find({ category })
      .populate('updatedBy', 'name email')
      .sort({ key: 1 });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public settings
const getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.find({ isPublic: true })
      .select('key value description category')
      .sort({ category: 1, key: 1 });

    // Convert to key-value pairs
    const publicSettings = {};
    settings.forEach(setting => {
      publicSettings[setting.key] = setting.value;
    });

    res.json(publicSettings);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single setting
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({ key })
      .populate('updatedBy', 'name email');

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update setting
const setSetting = async (req, res) => {
  try {
    const { key, value, description, category, isPublic } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      {
        value,
        description: description || '',
        category: category || 'general',
        isPublic: isPublic || false,
        updatedBy: req.user?.id
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    ).populate('updatedBy', 'name email');

    // Log the setting change
    await auditLogger.logAction(
      req.user?.id || null,
      'SETTING_UPDATE',
      `Updated setting: ${key}`,
      req.ip,
      { oldValue: setting._doc ? undefined : setting.value, newValue: value }
    );

    res.json(setting);
  } catch (error) {
    console.error('Error setting value:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update setting (alias for setSetting)
const updateSetting = async (req, res) => {
  return setSetting(req, res);
};

// Create setting
const createSetting = async (req, res) => {
  try {
    const { key, value, description, category, isPublic } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    // Check if setting already exists
    const existing = await Settings.findOne({ key });
    if (existing) {
      return res.status(409).json({ message: 'Setting already exists' });
    }

    const setting = new Settings({
      key,
      value,
      description: description || '',
      category: category || 'general',
      isPublic: isPublic || false,
      updatedBy: req.user?.id
    });

    await setting.save();
    await setting.populate('updatedBy', 'name email');

    // Log the creation
    await auditLogger.logAction(
      req.user?.id || null,
      'SETTING_CREATE',
      `Created setting: ${key}`,
      req.ip,
      { value }
    );

    res.status(201).json(setting);
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete setting
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOneAndDelete({ key });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    // Log the deletion
    await auditLogger.logAction(
      req.user?.id || null,
      'SETTING_DELETE',
      `Deleted setting: ${key}`,
      req.ip,
      { deletedValue: setting.value }
    );

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get feature flags
const getFeatureFlags = async (req, res) => {
  try {
    const settings = await Settings.find({
      category: 'features',
      isPublic: true
    }).select('key value description');

    const flags = {};
    settings.forEach(setting => {
      flags[setting.key] = setting.value;
    });

    res.json(flags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getPublicSettings,
  getSettingByKey,
  createSetting,
  setSetting,
  updateSetting,
  deleteSetting,
  getFeatureFlags
};
