const express = require('express');
const { getProfile, updateProfile, uploadCV, setupProfile } = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', verifyToken, getProfile);
router.put('/', verifyToken, updateProfile);
router.post('/upload-cv', verifyToken, upload.single('cv'), uploadCV);
router.post('/setup-profile', verifyToken, upload.single('cv'), setupProfile);

module.exports = router;