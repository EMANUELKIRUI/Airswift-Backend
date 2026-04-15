const express = require('express');
const router = express.Router();

const { getSettings, saveSettings } = require('../controllers/settingsController');
const { verifyToken } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

router.get('/', verifyToken, adminOnly, getSettings);
router.post('/', verifyToken, adminOnly, saveSettings);

module.exports = router;