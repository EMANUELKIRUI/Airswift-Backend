const express = require('express');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
} = require('../controllers/reportController');

const router = express.Router();

router.post('/', verifyToken, createReport);
router.get('/my-reports', verifyToken, getMyReports);
router.get('/', adminMiddleware, getAllReports);
router.put('/:id/status', adminMiddleware, updateReportStatus);

module.exports = router;