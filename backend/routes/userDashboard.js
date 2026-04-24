const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { User } = require('../models');
const { Application } = require('../models');
const Interview = require('../models/Interview');
const Message = require('../models/Message');

const router = express.Router();

// ✅ USER DASHBOARD - For regular users
// Get user dashboard data (applications, interviews, profile info)
router.get('/', protect, authorize('user', 'recruiter'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await User.findById(userId).select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's applications count
    const applicationsCount = await Application.countDocuments({
      user_id: userId,
    });

    // Get pending applications
    const pendingApplications = await Application.countDocuments({
      user_id: userId,
      status: { $in: ['pending', 'reviewed'] },
    });

    // Get accepted applications
    const acceptedApplications = await Application.countDocuments({
      user_id: userId,
      status: 'accepted',
    });

    // Get interviews scheduled
    const interviewsScheduled = await Interview.countDocuments({
      user_id: userId,
      status: 'scheduled',
    });

    // Get unread messages
    const unreadMessages = await Message.countDocuments({
      recipient_id: userId,
      read: false,
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasSubmittedApplication: user.hasSubmittedApplication,
      },
      stats: {
        totalApplications: applicationsCount,
        pendingApplications: pendingApplications,
        acceptedApplications: acceptedApplications,
        interviewsScheduled: interviewsScheduled,
        unreadMessages: unreadMessages,
      },
    });
  } catch (error) {
    console.error('USER DASHBOARD ERROR:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
