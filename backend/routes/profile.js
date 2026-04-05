const express = require('express');
const multer = require('multer');
const { getProfile, updateProfile, uploadCV } = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.get('/', verifyToken, getProfile);
router.put('/', verifyToken, updateProfile);
router.post('/upload-cv', verifyToken, upload.single('cv'), uploadCV);

module.exports = router;