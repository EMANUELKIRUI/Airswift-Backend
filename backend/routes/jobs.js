const express = require('express');
const { getJobs, getJobById, createJob, updateJob, deleteJob, getAllJobsAdmin } = require('../controllers/jobController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// Public routes
router.get('/', getJobs);
router.get('/:id', getJobById);

// Admin routes
router.post('/', adminMiddleware, createJob);
router.put('/:id', adminMiddleware, updateJob);
router.delete('/:id', adminMiddleware, deleteJob);
router.get('/admin/all', adminMiddleware, getAllJobsAdmin);

module.exports = router;