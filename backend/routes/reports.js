const express = require('express');
const { verifyToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
} = require('../controllers/reportController');

const router = express.Router();

router.post('/', verifyToken, createReport);
router.get('/my-reports', verifyToken, getMyReports);
router.get('/', verifyToken, adminOnly, getAllReports);
router.put('/:id/status', verifyToken, adminOnly, updateReportStatus);

module.exports = router;