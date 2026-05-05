const express = require('express');
const { register, login, getMe, verifyEmail } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', login);
router.get('/verify-email', verifyEmail);
router.get('/me', authMiddleware, getMe);

module.exports = router;
