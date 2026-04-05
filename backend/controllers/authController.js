const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../services/emailService");

// ✅ REGISTER - Send OTP
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("REGISTER BODY:", req.body);
    console.log(req.body);

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store OTP temporarily in DB
    await User.create({
      name,
      email,
      password: hashedPassword,
      resetToken: otp,
      resetTokenExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await sendOTP(email, otp);

    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ VERIFY OTP - Mark account as verified
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.resetToken != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: "Account verified" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ SEND LOGIN OTP
const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Account not verified. Please verify your email first." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();
    await sendOTP(email, otp);

    res.json({ message: "Login OTP sent" });
  } catch (err) {
    console.error("SEND LOGIN OTP ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ VERIFY LOGIN OTP
const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Account not verified" });
    }

    if (user.resetToken != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Clear OTP
    user.resetToken = null;
    user.resetTokenExpiry = null;

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshTokenValue = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshTokenValue;
    await user.save();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("token", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshTokenValue, cookieOptions);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      accessToken,
    });
  } catch (err) {
    console.error("VERIFY LOGIN OTP ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ FORGOT PASSWORD - Request reset OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    await sendOTP(email, resetToken);

    res.json({ message: "Reset OTP sent" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ RESET PASSWORD - Verify OTP and update password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email });

    if (!user || user.resetToken != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ REFRESH TOKEN
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("REFRESH TOKEN ERROR:", err);
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ LOGOUT
const logout = (req, res) => {
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

module.exports = {
  registerUser,
  verifyOTP,
  sendLoginOTP,
  verifyLoginOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
};