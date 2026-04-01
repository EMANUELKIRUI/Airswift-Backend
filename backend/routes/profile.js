const express = require('express');
const multer = require('multer');
const { getProfile, updateProfile, uploadCV } = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.post('/upload-cv', authMiddleware, upload.single('cv'), uploadCV);

module.exports = router;