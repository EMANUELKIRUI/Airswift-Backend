const Joi = require('joi');
const { Profile } = require('../models');

const profileSchema = Joi.object({
  skills: Joi.array().items(Joi.string()),
  experience: Joi.string(),
  education: Joi.string(),
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

    const cv_url = `/uploads/${req.file.filename}`;

    await Profile.upsert({ user_id: req.user.id, cv_url });

    res.json({ message: 'CV uploaded successfully', cv_url });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadCV,
};