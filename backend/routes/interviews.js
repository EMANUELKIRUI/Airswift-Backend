const express = require('express');
const { scheduleInterview, getMyInterviews } = require('../controllers/interviewController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// Admin route
router.post('/schedule', adminMiddleware, scheduleInterview);

// User route
router.get('/my', authMiddleware, getMyInterviews);

module.exports = router;