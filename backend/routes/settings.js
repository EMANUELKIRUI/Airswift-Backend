const express = require('express');
const router = express.Router();

const { getSettings, saveSettings } = require('../controllers/settingsController');
const { protect, permit } = require('../middleware/auth');

router.get('/', protect, permit('manage_settings'), getSettings);
router.post('/', protect, permit('manage_settings'), saveSettings);

module.exports = router;