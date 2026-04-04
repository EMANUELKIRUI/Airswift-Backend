const express = require('express');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { askAIInterview, scoreCV, autonomousRecruiter } = require('../controllers/interviewController');

const router = express.Router();

// AI Interview Bot - Interactive Q&A
router.post('/interview/ask', verifyToken, askAIInterview);

// CV AI Scorer
router.post('/cv/score', verifyToken, scoreCV);

// Autonomous Recruiter AI Agent (Admin only)
router.post('/recruiter-agent', adminMiddleware, autonomousRecruiter);

module.exports = router;