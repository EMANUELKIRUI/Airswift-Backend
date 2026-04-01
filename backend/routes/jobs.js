const express = require('express');
const { getJobs, getJobById, createJob, updateJob, deleteJob, getAllJobsAdmin, getJobCategories, createJobCategory, updateJobCategory, deleteJobCategory, getJobCategoryDashboard, getInterviewPipeline } = require('../controllers/jobController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// Public routes
router.get('/categories', getJobCategories);
router.get('/', getJobs);
router.get('/:id', getJobById);

// Admin category management
router.post('/categories', adminMiddleware, createJobCategory);
router.put('/categories/:id', adminMiddleware, updateJobCategory);
router.delete('/categories/:id', adminMiddleware, deleteJobCategory);

// Admin dashboards
router.get('/dashboard/categories', adminMiddleware, getJobCategoryDashboard);
router.get('/dashboard/interview-pipeline', adminMiddleware, getInterviewPipeline);

// Admin routes
router.post('/', adminMiddleware, createJob);
router.put('/:id', adminMiddleware, updateJob);
router.delete('/:id', adminMiddleware, deleteJob);
router.get('/admin/all', adminMiddleware, getAllJobsAdmin);

module.exports = router;