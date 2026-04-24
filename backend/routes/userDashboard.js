const express = require('express');
const { Op } = require('sequelize');
const { protect, authorize } = require('../middleware/auth');
const { User } = require('../models');
const { Application } = require('../models');
const Interview = require('../models/Interview');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Job = require('../models/Job');

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

    // Get approved applications
    const approvedApplications = await Application.countDocuments({
      user_id: userId,
      status: 'approved',
    });

    // Get rejected applications
    const rejectedApplications = await Application.countDocuments({
      user_id: userId,
      status: 'rejected',
    });

    // Get interviews scheduled
    const interviewsScheduled = await Interview.count({
      include: [{
        model: Application,
        where: { user_id: userId },
        required: true,
      }],
      where: {
        status: 'scheduled',
      },
    });

    // Get unread messages
    const unreadMessages = await Message.countDocuments({
      receiverId: userId,
      is_read: false,
    });

    // Get recent activity (notifications)
    const recentActivity = await Notification.find({
      userId: userId,
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title message createdAt');

    // Get upcoming interviews
    const upcomingInterviews = await Interview.findAll({
      include: [{
        model: Application,
        where: { user_id: userId },
        required: true,
        include: [Job],
      }],
      where: {
        status: 'scheduled',
        scheduled_at: {
          [Op.gt]: new Date(),
        },
      },
      order: [['scheduled_at', 'ASC']],
      limit: 3,
    });

    // Get latest applications
    const latestApplications = await Application.findAll({
      where: { user_id: userId },
      include: [Job],
      order: [['created_at', 'DESC']],
      limit: 3,
    });

    // Get recent messages
    const recentMessages = await Message.find({
      receiverId: userId,
    })
    .populate('senderId', 'name role')
    .sort({ createdAt: -1 })
    .limit(3)
    .select('text senderId createdAt');

    // Get unread notifications
    const unreadNotifications = await Notification.countDocuments({
      userId: userId,
      is_read: false,
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
        approvedApplications: approvedApplications,
        rejectedApplications: rejectedApplications,
        interviewsScheduled: interviewsScheduled,
        unreadMessages: unreadMessages,
        unreadNotifications: unreadNotifications,
      },
      recentActivity: recentActivity.map(activity => ({
        title: activity.title,
        message: activity.message,
        date: activity.createdAt,
      })),
      upcomingInterviews: upcomingInterviews.map(interview => ({
        id: interview.id,
        jobTitle: interview.Application?.Job?.title || 'Unknown Job',
        scheduledAt: interview.scheduled_at,
        meetingLink: interview.meeting_link,
        status: interview.status,
        type: interview.type,
        mode: interview.mode,
      })),
      latestApplications: latestApplications.map(app => ({
        id: app.id,
        jobTitle: app.Job?.title || 'Unknown Job',
        status: app.status,
        appliedAt: app.created_at,
      })),
      recentMessages: recentMessages.map(msg => ({
        id: msg._id,
        text: msg.text,
        senderName: msg.senderId?.name || 'Admin',
        senderRole: msg.senderId?.role || 'admin',
        date: msg.createdAt,
      })),
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
