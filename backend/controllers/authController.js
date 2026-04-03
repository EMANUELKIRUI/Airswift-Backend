const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/generateOTP");
const { sendEmail } = require("../services/emailService");
const { otpTemplate } = require("../utils/templates/otpTemplate");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();

    // Create user
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 min
    });

    // Send OTP email
    await sendEmail(email, "Verify your email", otpTemplate(otp));

    res.status(201).json({
      message: "User registered. OTP sent to email.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    // Mark as verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

const user = await User.findOne({ where: { email } });

  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isVerified) {
    return res.status(403).json({
      message: "Please verify your email first",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch)
    return res.status(400).json({ message: "Invalid credentials" });

  // 🔥 CREATE TOKEN
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
};

const resendOTP = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });

  if (!user) return res.status(400).json({ message: "User not found" });

  const otp = generateOTP();

  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail(email, "Resend OTP", otpTemplate(otp));

  res.json({ message: "OTP resent successfully" });
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate reset token (similar to OTP)
    const resetToken = generateOTP();
    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Send reset token via email
    await sendEmail(
      email,
      "Password Reset Request",
      `Your password reset code is: ${resetToken}\nThis code expires in 15 minutes.`
    );

    res.json({ message: "Password reset code sent to email" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.resetToken !== resetToken) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    if (user.resetTokenExpire < Date.now()) {
      return res.status(400).json({ message: "Reset token expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpire = null;

    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  loginUser,
  resendOTP,
  requestPasswordReset,
  resetPassword,
  changePassword,
};