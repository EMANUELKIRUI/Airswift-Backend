const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/ProfileMongoose');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const { extractCVText, extractSkills, extractEducation, extractExperience } = require('../utils/cvParser');

// Check if User is a Mongoose model
const isMongooseModel = Boolean(User.schema);
const isSequelizeModel = Boolean(User.sequelize);

const profileSchema = Joi.object({
  skills: Joi.array().items(Joi.string()),
  experience: Joi.string(),
  education: Joi.string(),
  phone: Joi.string(),
  location: Joi.string(),
  name: Joi.string(),
  profilePicture: Joi.string(),
});

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user._id || user.id,
      email: user.email,
      role: 'admin'
    });
  } catch (error) {
    console.error('GET PROFILE ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user.id })

    if (profile) {
      // update
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        req.body,
        { new: true }
      )
    } else {
      // create
      profile = new Profile({
        user: req.user.id,
        ...req.body
      })
      await profile.save()
    }

    res.json(profile)
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
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

    console.log('UPLOAD CV - User ID:', req.user.id);
    console.log('UPLOAD CV - CV URL:', cv_url);

    let updatedUser;

    if (isMongooseModel) {
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { cv: cv_url },
        { new: true }
      );
    } else if (isSequelizeModel) {
      const [affectedRows] = await User.update(
        { cv: cv_url },
        { where: { id: req.user.id } }
      );

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      updatedUser = await User.findById(req.user.id);
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await fs.unlink(req.file.path).catch(() => null);

    console.log('UPLOAD CV - Success');

    res.json({
      message: 'CV uploaded successfully',
      cv_url,
      profile: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        location: updatedUser.location,
        skills: Array.isArray(updatedUser.skills) ? updatedUser.skills : (updatedUser.skills ? JSON.parse(updatedUser.skills) : []),
        education: updatedUser.education,
        experience: updatedUser.experience,
        cv: updatedUser.cv,
      },
    });
  } catch (error) {
    console.error('UPLOAD CV ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setupProfile = async (req, res) => {
  try {
    const { name, phone, location } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "CV file is required" });
    }

    const filePath = req.file.path;

    // 1. Extract CV text
    const cvText = await extractCVText(filePath);

    // 2. Extract skills
    const skills = extractSkills(cvText);

    // 3. Extract education and experience
    const education = extractEducation(cvText);
    const experience = extractExperience(cvText);

    // 4. Save user profile
    let user;

    if (isMongooseModel) {
      user = await User.findByIdAndUpdate(
        req.user.id,
        {
          name,
          phone,
          location,
          cv: filePath,
          skills,
          education,
          experience,
        },
        { new: true }
      );
    } else if (isSequelizeModel) {
      const [affectedRows] = await User.update(
        {
          name,
          phone,
          location,
          cv: filePath,
          skills,
          education,
          experience,
        },
        { where: { id: req.user.id } }
      );

      if (affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      user = await User.findById(req.user.id);
    } else {
      return res.status(500).json({ error: 'User model not properly configured' });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile setup complete",
      profile: {
        name: user.name,
        phone: user.phone,
        location: user.location,
        cv: user.cv,
        skills: Array.isArray(user.skills) ? user.skills : (user.skills ? JSON.parse(user.skills) : []),
        education: user.education,
        experience: user.experience,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Profile setup failed" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadCV,
  setupProfile,
};