const express = require('express');
const { applyForJob, getMyApplications, getAllApplicationsAdmin, updateApplicationStatus } = require('../controllers/applicationController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// User routes
router.post('/apply', authMiddleware, applyForJob);
router.get('/my', authMiddleware, getMyApplications);

// Admin routes
router.get('/admin/all', adminMiddleware, getAllApplicationsAdmin);
router.put('/:id/status', adminMiddleware, updateApplicationStatus);

module.exports = router;