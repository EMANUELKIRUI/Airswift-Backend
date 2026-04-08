const Joi = require('joi');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const { extractCVText, extractSkills, extractEducation, extractExperience } = require('../utils/cvParser');

// Check if User is a Mongoose model or Sequelize model
const isMongooseModel = User.prototype && User.prototype.save;
const isSequelizeModel = User.prototype && User.prototype.update;

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
    let user;
    
    if (isMongooseModel) {
      user = await User.findById(req.user.id).select('-password');
    } else if (isSequelizeModel) {
      user = await User.findByPk(req.user.id);
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      skills: Array.isArray(user.skills) ? user.skills : (user.skills ? JSON.parse(user.skills) : []),
      education: user.education,
      experience: user.experience,
      profilePicture: user.profilePicture,
      cv: user.cv,
    };

    res.json(profile);
  } catch (error) {
    console.error('GET PROFILE ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    console.log('UPDATE PROFILE - User ID:', req.user.id);
    console.log('UPDATE PROFILE - Data:', value);

    let updatedUser;

    if (isMongooseModel) {
      // Build update object with only defined values
      const updateData = {};
      if (value.name !== undefined) updateData.name = value.name;
      if (value.phone !== undefined) updateData.phone = value.phone;
      if (value.location !== undefined) updateData.location = value.location;
      if (value.skills !== undefined) updateData.skills = value.skills;
      if (value.education !== undefined) updateData.education = value.education;
      if (value.experience !== undefined) updateData.experience = value.experience;
      if (value.profilePicture !== undefined) updateData.profilePicture = value.profilePicture;

      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true }
      ).select('-password');
    } else if (isSequelizeModel) {
      // Build update object for Sequelize
      const updateData = {};
      if (value.name !== undefined) updateData.name = value.name;
      if (value.phone !== undefined) updateData.phone = value.phone;
      if (value.location !== undefined) updateData.location = value.location;
      if (value.skills !== undefined) updateData.skills = value.skills;
      if (value.education !== undefined) updateData.education = value.education;
      if (value.experience !== undefined) updateData.experience = value.experience;
      if (value.profilePicture !== undefined) updateData.profilePicture = value.profilePicture;

      const [affectedRows] = await User.update(updateData, {
        where: { id: req.user.id }
      });

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      updatedUser = await User.findByPk(req.user.id);
    } else {
      return res.status(500).json({ message: 'User model not properly configured' });
    }

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    console.log('UPDATE PROFILE - Success:', isMongooseModel ? updatedUser._id : updatedUser.id);

    const profile = {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      location: updatedUser.location,
      skills: Array.isArray(updatedUser.skills) ? updatedUser.skills : (updatedUser.skills ? JSON.parse(updatedUser.skills) : []),
      education: updatedUser.education,
      experience: updatedUser.experience,
      profilePicture: updatedUser.profilePicture,
      cv: updatedUser.cv,
    };

    res.status(200).json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadCV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'talex_cvs',
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

      updatedUser = await User.findByPk(req.user.id);
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

      user = await User.findByPk(req.user.id);
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