const Joi = require('joi');
const { Settings } = require('../models');

// Validation schemas
const settingsSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
  description: Joi.string().optional(),
});

const updateSettingsSchema = Joi.object({
  value: Joi.any().required(),
  description: Joi.string().optional(),
});

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific setting by key
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    res.json({ setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new setting
const createSetting = async (req, res) => {
  try {
    const { error } = settingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { key, value, description } = req.body;

    const existingSetting = await Settings.findOne({ where: { key } });
    if (existingSetting) {
      return res.status(400).json({ message: 'Setting with this key already exists' });
    }

    const setting = await Settings.create({ key, value, description });

    res.status(201).json({ message: 'Setting created successfully', setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a setting by key
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { error } = updateSettingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { value, description } = req.body;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    await setting.update({ value, description, updated_at: new Date() });

    res.json({ message: 'Setting updated successfully', setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a setting by key
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    await setting.destroy();

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};
