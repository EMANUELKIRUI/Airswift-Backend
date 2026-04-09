const router = require("express").Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  verifyEmailToken,
  verifyRegistrationOTP,
  resendVerificationEmail,
  loginUser,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require("../controllers/authController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ AUTHENTICATION ROUTES
router.post("/register", registerUser);
router.get("/verify", verifyEmailToken);
router.post("/verify-registration-otp", verifyRegistrationOTP);
router.post("/resend-verification", resendVerificationEmail);
router.post("/send-registration-otp", resendVerificationEmail); // Alias for frontend compatibility
router.post("/login", loginLimiter, loginUser);
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Health-check/test route
router.get("/me", verifyToken, getMe);

// Debug endpoint to check authentication
router.get("/debug", (req, res) => {
  res.json({
    hasCookies: !!req.cookies,
    cookies: Object.keys(req.cookies || {}),
    hasAuthHeader: !!req.headers.authorization,
    authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 20) + "..." : null,
    message: "Debug info - check browser console for full details"
  });
});

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;