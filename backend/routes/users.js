const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const Application = require('../models/ApplicationMongoose');
const { parseCVWithAI } = require('../utils/aiParser');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse-cv', verifyToken, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CV file required' });
    }

    const pdf = await pdfParse(req.file.buffer);
    const text = pdf.text;

    const extracted = await parseCVWithAI(text);

    res.json(extracted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get user status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const application = await Application.findOne({ userId: req.user.id });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasSubmittedApplication: user.hasSubmittedApplication,
        isVerified: user.isVerified
      },
      hasApplied: !!application,
      application,
      status: 'authenticated'
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Profile Endpoint (VERY IMPORTANT)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const application = await Application.findOne({ userId: req.user.id });
    const applicationResponse = application
      ? {
          status: application.applicationStatus || application.status || 'pending',
          interviewDate: application.interview?.date
            ? application.interview.date.toISOString()
            : null,
        }
      : null;

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      hasSubmittedApplication: user.hasSubmittedApplication,
      application: applicationResponse,
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;