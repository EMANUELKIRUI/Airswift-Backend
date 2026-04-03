const express = require('express');
const adminMiddleware = require('../middleware/admin');
const {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getAllApplications,
  updateStatus,
  sendInterview,
} = require('../controllers/adminController');

const router = express.Router();

// Settings routes
router.get('/settings', adminMiddleware, getAllSettings);
router.get('/settings/:key', adminMiddleware, getSettingByKey);
router.post('/settings', adminMiddleware, createSetting);
router.put('/settings/:key', adminMiddleware, updateSetting);
router.delete('/settings/:key', adminMiddleware, deleteSetting);

// Admin application control routes
router.get('/applications', adminMiddleware, getAllApplications);
router.patch('/applications/:id', adminMiddleware, updateStatus);
router.post('/send-interview', adminMiddleware, sendInterview);

module.exports = router;