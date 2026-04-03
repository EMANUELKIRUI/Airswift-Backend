const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { verifyToken, verifyRole } = require("../middleware/auth");

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// Send OTP email
const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: "AIRSWIFT <no-reply@airswift.com>",
    to: email,
    subject: "Your OTP Code",
    text: `Your verification code is: ${otp}`
  });
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000 // 10 min
    });

    await user.save();
    await sendOTP(email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({ message: "Account verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // create tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    // Set cookie
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: "lax",
      maxAge: 15 * 60 * 1000 // 15 min
    });

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REFRESH TOKEN
router.post("/refresh-token", async (req, res) => {
  const { token } = req.body;

  if (!token) return res.sendStatus(401);

  const user = await User.findOne({ refreshToken: token });

  if (!user) return res.sendStatus(403);

  jwt.verify(token, process.env.REFRESH_SECRET, (err) => {
    if (err) return res.sendStatus(403);

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  });
});

// LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) return res.json({ message: "If email exists, link sent" });

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    // send email link (for demo, logging to console)
    console.log(`Reset link: http://localhost:3000/reset/${token}`);

    res.json({ message: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetToken = null;
    user.resetTokenExpire = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTE EXAMPLE
router.get("/admin", verifyToken, verifyRole("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

module.exports = router;