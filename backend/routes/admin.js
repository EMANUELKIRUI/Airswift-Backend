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
  getStats,
  sendInterview,
  generateOffer,
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
router.put('/application/:id', adminMiddleware, updateStatus);
router.patch('/applications/:id', adminMiddleware, updateStatus);
router.get('/stats', adminMiddleware, getStats);
router.post('/send-interview/:id', adminMiddleware, sendInterview);
router.post('/generate-offer/:id', adminMiddleware, generateOffer);

router.get('/dashboard', adminMiddleware, (req, res) => {
  res.json({
    message: 'Welcome Admin',
    stats: {
      users: 120,
      applications: 45,
    },
  });
});

module.exports = router;