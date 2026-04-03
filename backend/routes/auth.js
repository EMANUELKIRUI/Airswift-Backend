const router = require("express").Router();
const {
  registerUser,
  verifyOTP,
  loginUser,
  resendOTP,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { logout, checkAuth, getCurrentUser } = require("../controllers/commonAuthController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/resend-otp", resendOTP);

// Password reset endpoints
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/change-password", verifyToken, changePassword);

// Common auth endpoints
router.post("/logout", logout);
router.get("/check", checkAuth);
router.get("/me", verifyToken, getCurrentUser);

// Protected route example
router.get("/dashboard", verifyToken, (req, res) => {
  res.json({ message: "Welcome user", user: req.user });
});

module.exports = router;