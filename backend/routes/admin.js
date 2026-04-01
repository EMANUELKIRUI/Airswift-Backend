const express = require('express');
const adminMiddleware = require('../middleware/admin');
const {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
} = require('../controllers/adminController');

const router = express.Router();

// Settings routes
router.get('/settings', adminMiddleware, getAllSettings);
router.get('/settings/:key', adminMiddleware, getSettingByKey);
router.post('/settings', adminMiddleware, createSetting);
router.put('/settings/:key', adminMiddleware, updateSetting);
router.delete('/settings/:key', adminMiddleware, deleteSetting);

module.exports = router;