const router = require("express").Router();
const passport = require("passport");
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

// Google OAuth routes
router.get("/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login-failed"
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.status(400).json({ message: "Google auth failed" });
      }

      const token = jwt.sign(
        { id: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.redirect(
        `https://airswift-frontend.vercel.app?token=${token}`
      );

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error in callback" });
    }
  }
);

const jwt = require('jsonwebtoken');

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
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

module.exports = router;