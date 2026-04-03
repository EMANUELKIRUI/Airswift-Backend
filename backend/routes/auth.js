const router = require("express").Router();
const {
  registerUser,
  verifyOTP,
  loginUser,
  resendOTP,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/resend-otp", resendOTP);

// Protected route example
router.get("/dashboard", verifyToken, (req, res) => {
  res.json({ message: "Welcome user", user: req.user });
});

module.exports = router;