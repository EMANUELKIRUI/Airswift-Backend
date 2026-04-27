const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  verifyRegistrationOTP,
  verifyOtp,
  verifyEmailToken,
  resendVerificationEmail,
  resendOTP,
  loginUser,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  // adminLogin // Removed - admin uses regular login
} = require("../controllers/authController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");
const { findUserById } = require("../utils/userHelpers");

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP resend requests
const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 OTP requests per hour
  message: 'Too many OTP requests from this IP, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ AUTHENTICATION ROUTES
router.post("/register", registerUser);
router.post("/verify-registration-otp", verifyRegistrationOTP);
router.post("/verify-otp", verifyOtp);
router.get("/verify-email", verifyEmailToken);
router.post("/resend-verification", otpRateLimiter, resendVerificationEmail);
router.post("/send-registration-otp", otpRateLimiter, resendVerificationEmail); // Alias for frontend compatibility
router.post("/resend-otp", otpRateLimiter, resendOTP);
router.post("/login", loginLimiter, loginUser);
// router.post("/admin-login", adminLogin); // Removed - admin uses regular login
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/forgot-password", forgotPassword);
router.put("/change-password", verifyToken, changePassword);
router.post("/reset-password/:token?", resetPassword);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Health-check/test route
router.get("/me", verifyToken, getMe);
router.get("/test", (req, res) => {
  res.send('Auth route works');
});

// Debug endpoint to check authentication
router.get("/debug", async (req, res) => {
  const cookies = req.cookies || {};
  const accessToken = cookies.accessToken || null;
  const refreshToken = cookies.refreshToken || null;
  const authHeader = req.headers.authorization || null;

  const accessTokenInfo = {
    present: !!accessToken,
    valid: false,
    decoded: null,
    error: null,
    source: accessToken ? 'cookie' : (authHeader && authHeader.startsWith('Bearer ') ? 'authHeader' : null),
  };

  const refreshTokenInfo = {
    present: !!refreshToken,
    valid: false,
    decoded: null,
    error: null,
    matchesStoredToken: null,
  };

  if (accessToken) {
    try {
      accessTokenInfo.decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      accessTokenInfo.valid = true;
    } catch (err) {
      accessTokenInfo.error = err.message;
    }
  }

  if (refreshToken) {
    try {
      refreshTokenInfo.decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET
      );
      refreshTokenInfo.valid = true;
      const userId = refreshTokenInfo.decoded.userId || refreshTokenInfo.decoded.id;
      if (userId) {
        const user = await findUserById(userId);
        refreshTokenInfo.matchesStoredToken = !!user && user.refreshToken === refreshToken;
      }
    } catch (err) {
      refreshTokenInfo.error = err.message;
    }
  }

  res.json({
    hasCookies: !!req.cookies,
    cookies: Object.keys(req.cookies || {}),
    hasAuthHeader: !!authHeader,
    authHeaderValue: authHeader ? authHeader.substring(0, 20) + "..." : null,
    accessTokenInfo,
    refreshTokenInfo,
    message: "Debug info - use /api/auth/debug in the browser to inspect auth state."
  });
});

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;