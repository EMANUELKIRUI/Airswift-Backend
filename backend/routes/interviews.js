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
router.get('/:id', protect, getInterview);

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