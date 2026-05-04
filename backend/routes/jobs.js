const express = require('express');
const { getJobs, createJob } = require('../controllers/jobController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public: Get all jobs
router.get('/', getJobs);

// Admin only: Create job
router.post('/', authMiddleware, createJob);

module.exports = router;
