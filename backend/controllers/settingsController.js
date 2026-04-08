const Joi = require('joi');
const settingsService = require('../services/settingsService');

const settingsSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
  description: Joi.string().optional().allow('', null),
  category: Joi.string().optional().default('general'),
});

const updateSettingsSchema = Joi.object({
  value: Joi.any().required(),
  description: Joi.string().optional().allow('', null),
  category: Joi.string().optional(),
});

const getAllSettings = async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json({ settings });
  } catch (error) {
    console.error('getAllSettings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await settingsService.getSettingsByCategory(category);
    res.json({ settings });
  } catch (error) {
    console.error('getSettingsByCategory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSettingByKey(key);
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json({ setting });
  } catch (error) {
    console.error('getSettingByKey error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSetting = async (req, res) => {
  try {
    const { error, value } = settingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const setting = await settingsService.createSetting(value);
    res.status(201).json({ message: 'Setting created successfully', setting });
  } catch (error) {
    console.error('createSetting error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { error, value } = updateSettingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const setting = await settingsService.updateSetting(key, value);
    res.json({ message: 'Setting updated successfully', setting });
  } catch (error) {
    console.error('updateSetting error:', error);
    if (error.message === 'Setting not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    await settingsService.deleteSetting(key);
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('deleteSetting error:', error);
    if (error.message === 'Setting not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const getFeatureFlags = async (req, res) => {
  try {
    const flags = await settingsService.getFeatureFlags();
    res.json({ featureFlags: flags });
  } catch (error) {
    console.error('getFeatureFlags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getFeatureFlags,
};
