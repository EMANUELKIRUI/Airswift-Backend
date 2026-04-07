const router = require("express").Router();
const jwt = require('jsonwebtoken');
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

// ✅ AUTHENTICATION ROUTES
router.post("/register", registerUser);
router.get("/verify", verifyEmailToken);
router.post("/verify-registration-otp", verifyRegistrationOTP);
router.post("/resend-verification", resendVerificationEmail);
router.post("/login", loginUser);
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Health-check/test route
router.get("/me", verifyToken, getMe);

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;