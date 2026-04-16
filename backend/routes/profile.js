const express = require('express');
const { getProfile, updateProfile, uploadCV, setupProfile } = require('../controllers/profileController');
const { protect, permit } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

router.get('/', protect, permit('view_profile'), getProfile);
router.put('/', protect, permit('edit_profile'), updateProfile);
router.post('/upload-cv', protect, permit('edit_profile'), upload.single('cv'), handleMulterError, uploadCV);
router.post('/setup-profile', protect, permit('edit_profile'), upload.single('cv'), handleMulterError, setupProfile);

module.exports = router;