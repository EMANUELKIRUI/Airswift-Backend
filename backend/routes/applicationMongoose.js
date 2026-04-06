const express = require('express');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  applyJob,
  updateApplicationStatus,
  getUserApplications,
  getAllApplications,
} = require('../controllers/applicationMongooseController');

const router = express.Router();

router.post('/apply', verifyToken, applyJob);
router.get('/my', verifyToken, getUserApplications);
router.get('/admin/all', adminMiddleware, getAllApplications);
router.put('/status', adminMiddleware, updateApplicationStatus);

module.exports = router;
