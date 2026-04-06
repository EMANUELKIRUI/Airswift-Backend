const Joi = require('joi');
const { Profile } = require('../models');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

const profileSchema = Joi.object({
  skills: Joi.array().items(Joi.string()),
  experience: Joi.string(),
  education: Joi.string(),
  phone_number: Joi.string().pattern(/^\+256\d{9}$|^\+255\d{9}$|^\+250\d{9}$|^\+257\d{9}$/),
});

const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { error } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const [updated] = await Profile.update(req.body, { where: { user_id: req.user.id } });
    if (!updated) return res.status(404).json({ message: 'Profile not found' });

    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadCV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'airswift_cvs',
      resource_type: 'auto',
    });

    const cv_url = uploadResult.secure_url;

    await Profile.upsert({ user_id: req.user.id, cv_url });

    await fs.unlink(req.file.path).catch(() => null);

    res.json({ message: 'CV uploaded successfully', cv_url });
  } catch (error) {
    console.error('uploadCV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadCV,
};