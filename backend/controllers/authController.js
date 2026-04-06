const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../services/emailService");
const { sendEmail } = require("../utils/email");
const { otpTemplate } = require("../utils/templates/otpTemplate");
const { generateOTP } = require("../utils/generateOTP");

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

    // Store OTP temporarily in DB for account verification
    await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    let emailSent = false;
    try {
      await sendEmail(email, "Your Airswift OTP Code", otpTemplate(otp));
      emailSent = true;
    } catch (error) {
      console.error(`REGISTER EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "OTP sent"
      : "User registered, but OTP email could not be delivered";

    res.status(emailSent ? 200 : 201).json({ message: responseMessage });
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

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    // 🔥 AUTO LOGIN after verification
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    res.status(200).json({
      message: "Verified & logged in",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ RESEND OTP (for registration)
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    let emailSent = false;
    try {
      await sendEmail(email, "Your Airswift OTP Code", otpTemplate(otp));
      emailSent = true;
    } catch (error) {
      console.error(`RESEND OTP EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "OTP resent successfully"
      : "OTP generated, but email delivery failed";

    res.status(emailSent ? 200 : 201).json({ message: responseMessage });
  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // TEMPORARY BYPASS - DEV MODE
    user.isVerified = true;
    await user.save();

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("LOGIN USER ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
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

    // TEMPORARY BYPASS - DEV MODE
    user.isVerified = true;
    await user.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    let emailSent = false;
    try {
      await sendOTP(email, otp);
      emailSent = true;
    } catch (error) {
      console.error(`SEND LOGIN OTP EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "Login OTP sent"
      : "OTP generated, but email delivery failed";

    res.status(emailSent ? 200 : 201).json({ message: responseMessage });
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

    // TEMPORARY BYPASS - DEV MODE
    user.isVerified = true;
    await user.save();

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
      return res.status(404).json({ message: "User not found" });
    }

    // 🔴 CHECK IF VERIFIED FIRST
    if (!user.isVerified) {
      const otp = generateOTP();
      console.log("OTP:", otp); // 👉 For testing since email might fail

      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // send verification email instead
      try {
        await sendOTP(user.email, otp);
      } catch (emailError) {
        console.error(`VERIFICATION OTP EMAIL ERROR for ${email}:`, emailError.message);
      }

      return res.status(400).json({
        type: "NOT_VERIFIED",
        message: "Account not verified. Verification code sent to your email."
      });
    }

    // ✅ VERIFIED USER - Send reset email
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail(
        user.email,
        "Reset Password",
        `
          <h2>Password Reset</h2>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 15 minutes.</p>
        `
      );
    } catch (emailError) {
      console.error(`FORGOT PASSWORD EMAIL ERROR for ${email}:`, emailError.message);
    }

    res.json({
      type: "RESET_SENT",
      message: "Check your email for reset instructions"
    });
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
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

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

// ✅ GET ME
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ message: "Server error" });
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
  resendOTP,
  loginUser,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
};