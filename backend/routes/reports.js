const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
} = require('../controllers/reportController');

const router = express.Router();

router.post('/', authMiddleware, createReport);
router.get('/my-reports', authMiddleware, getMyReports);
router.get('/', adminMiddleware, getAllReports);
router.put('/:id/status', adminMiddleware, updateReportStatus);

module.exports = router;