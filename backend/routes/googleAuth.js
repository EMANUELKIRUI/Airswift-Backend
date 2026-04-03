const router = require('express').Router();
const GoogleAuthController = require('../controllers/googleAuthController');
const { logout, checkAuth, getCurrentUser } = require('../controllers/commonAuthController');
const { verifyToken } = require('../middleware/auth');

// Get Google OAuth URL to redirect user from front-end
router.get('/url', GoogleAuthController.getAuthUrl);

// Google callback route (for OAuth code flow)
router.get('/callback', GoogleAuthController.callback);

// Verify Google ID token directly (client-supplied)
router.post('/verify-id-token', GoogleAuthController.verifyId);

// Get authenticated user profile
router.get('/profile', verifyToken, GoogleAuthController.getProfile);

// Update authenticated user profile
router.put('/profile', verifyToken, GoogleAuthController.updateProfile);

// Common auth endpoints
router.post('/logout', logout);
router.get('/check', checkAuth);
router.get('/me', verifyToken, getCurrentUser);

module.exports = router;
