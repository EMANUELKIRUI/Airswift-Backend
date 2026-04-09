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
const { verifyToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// Admin routes
router.post('/', verifyToken, adminOnly, createInterview);
router.post('/session', verifyToken, createVoiceSession);
router.get('/admin', verifyToken, adminOnly, getAdminInterviews);
router.put('/:id', verifyToken, adminOnly, updateInterview);

// Public routes (with auth)
router.get('/my', verifyToken, getMyInterviews);
router.get('/:id', verifyToken, getInterview);

// AI scoring endpoint
router.post('/score', verifyToken, scoreResponse);

// AI Interview Bot - Interactive Q&A
router.post('/ask', verifyToken, askAIInterview);

// CV AI Scorer
router.post('/cv/score', verifyToken, scoreCV);

// Autonomous Recruiter AI Agent
router.post('/ai/recruiter-agent', verifyToken, adminOnly, autonomousRecruiter);

// Rank applications for a job
router.post('/ai/rank-applications', verifyToken, adminOnly, rankApplicationsViaAI);

// Legacy routes for backward compatibility
router.post('/schedule', verifyToken, adminOnly, scheduleInterview);

module.exports = router;