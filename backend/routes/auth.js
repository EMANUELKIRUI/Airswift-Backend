const router = require("express").Router();
const {
  registerUser,
  verifyOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require("../controllers/authController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Health-check/test route
router.get("/me", (req, res) => {
  // later you can use JWT to get real user
  res.json({
    user: null,
    message: "Auth route working"
  });
});

// Protected route example
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;