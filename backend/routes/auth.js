const router = require("express").Router();
const jwt = require('jsonwebtoken');
const {
  registerUser,
  verifyOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} = require("../controllers/authController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// ✅ AUTHENTICATION ROUTES
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Health-check/test route
router.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      user: { id: decoded.id, email: decoded.email }
    });
  } catch (err) {
    return res.status(401).json({ user: null });
  }
});

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;