const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { generateOTP } = require("../utils/generateOTP");
const { sendEmail } = require("../services/emailService");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    return res.status(201).json({ user });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ where: { email } });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await user.save();

  res.json({ message: "Email verified successfully" });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ error: "User not found" });

  if (!user.isVerified) return res.status(400).json({ error: "Please verify your email first" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.json({ message: "If user exists, email sent" });

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + 15 * 60 * 1000;

  await user.save();

  const resetLink = `https://airswift-frontend.vercel.app/reset-password/${resetToken}`;

  await sendEmail(email, "Reset your password", `<p>Reset your password: <a href="${resetLink}">${resetLink}</a></p>`);

  res.json({ message: "Reset link sent" });
};

const resetPassword = async (req, res) => {
  const user = await User.findOne({
    where: {
      resetToken: req.params.token,
      resetTokenExpires: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!user) return res.status(400).json({ error: "Invalid token" });

  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetToken = null;
  user.resetTokenExpires = null;

  await user.save();

  res.json({ message: "Password reset successful" });
};

const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user || user.refreshToken !== token) return res.status(401).json({ error: "Invalid token" });

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

module.exports = { registerUser, verifyOTP, loginUser, forgotPassword, resetPassword, refreshToken, logout };