const express = require('express');
const {
  createInterview,
  createVoiceSession,
  getInterview,
  updateInterview,
  getAdminInterviews,
  getMyInterviews,
  scoreResponse,
  scheduleInterview, // Legacy
  askAIInterview,
  scoreCV,
  autonomousRecruiter,
  rankApplicationsViaAI,
} = require('../controllers/interviewController');
const { protect, permit } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// Admin routes (requires manage_interviews permission)
router.post('/', protect, permit('manage_interviews'), createInterview);
router.post('/session', protect, createVoiceSession);
router.get('/admin', protect, permit('manage_interviews'), getAdminInterviews);
router.put('/:id', protect, permit('manage_interviews'), updateInterview);

// Public routes (with auth)
router.get('/my', protect, getMyInterviews);
router.get('/me', protect, getMyInterviews); // Alias for frontend compatibility
router.get('/:id', protect, getInterview);

// Interview submission
router.post('/submit', protect, async (req, res) => {
  try {
    const { interviewId, answers } = req.body;
    const userId = req.user.id;

    // Find the interview
    const Interview = require('../models/Interview');
    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Save answers
    interview.answers = answers;
    interview.completed = true;
    interview.completedAt = new Date();
    await interview.save();

    // Update user application status
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, {
      applicationStatus: 'interview_completed'
    });

    // Emit real-time update
    const io = require('../utils/socket').getIO();
    io.to(userId).emit('statusUpdate', { status: 'interview_completed' });

    res.json({ success: true, message: 'Interview submitted successfully' });
  } catch (error) {
    console.error('Interview submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AI scoring endpoint
router.post('/score', protect, scoreResponse);

// AI Interview Bot - Interactive Q&A
router.post('/ask', protect, askAIInterview);

// CV AI Scorer
router.post('/cv/score', protect, scoreCV);

// Autonomous Recruiter AI Agent (requires manage_interviews permission)
router.post('/ai/recruiter-agent', protect, permit('manage_interviews'), autonomousRecruiter);

// Rank applications for a job (requires manage_interviews permission)
router.post('/ai/rank-applications', protect, permit('manage_interviews'), rankApplicationsViaAI);

// Legacy routes for backward compatibility
router.post('/schedule', protect, permit('manage_interviews'), scheduleInterview);

module.exports = router;