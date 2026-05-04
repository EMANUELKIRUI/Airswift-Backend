const express = require('express');
const { applyForJob, getAdminApplications } = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// User: Apply for job
router.post('/apply', authMiddleware, applyForJob);

// Admin: Get all applications
router.get('/admin', authMiddleware, getAdminApplications);

module.exports = router;
