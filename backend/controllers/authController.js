const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");
const { sendEmail } = require("../services/emailService");
const { otpTemplate } = require("../utils/templates/otpTemplate");
const { generateOTP } = require("../utils/generateOTP");
const { generateAccessToken, generateRefreshToken } = require("../utils/tokenHelpers");

// ✅ REGISTER - Send verification email
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("REGISTER BODY:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate secure verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Create user with verification token
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken: hashedToken,
      verificationTokenExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isVerified: false,
    });

    // Send verification email with raw token
    const activationLink = `${process.env.FRONTEND_URL}/verify?token=${rawToken}`;

    let emailSent = false;
    try {
      await sendEmail(
        user.email,
        "Activate your Airswift account",
        `Click this link to activate your account: ${activationLink}`
      );
      emailSent = true;
    } catch (error) {
      console.error(`REGISTER EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "Verification email sent"
      : "User registered, but verification email could not be delivered";

    res.status(emailSent ? 200 : 201).json({ message: responseMessage });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ VERIFY EMAIL TOKEN - Activate account via email link
const verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Hash the incoming token to compare with stored hashed token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() } // Check expiry
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    // Generate access and refresh tokens using helpers
    const accessToken = generateAccessToken(user._id);
    const refreshTokenValue = generateRefreshToken(user._id);

    user.refreshToken = refreshTokenValue;
    await user.save();

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshTokenValue, cookieOptions);

    res.status(200).json({
      message: "Account verified successfully",
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error("VERIFY TOKEN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ RESEND VERIFICATION EMAIL (for registration)
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    // Generate new secure verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.verificationToken = hashedToken;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send verification email with raw token
    const activationLink = `${process.env.FRONTEND_URL}/verify?token=${rawToken}`;

    let emailSent = false;
    try {
      await sendEmail(
        user.email,
        "Activate your Airswift account",
        `Click this link to activate your account: ${activationLink}`
      );
      emailSent = true;
    } catch (error) {
      console.error(`RESEND VERIFICATION EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "Verification email resent successfully"
      : "Verification email generated, but delivery failed";

    res.status(emailSent ? 200 : 201).json({ message: responseMessage });
  } catch (err) {
    console.error("RESEND VERIFICATION EMAIL ERROR:", err);
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first. Check your inbox for the verification link.",
        redirect: "/verify-email",
        email: user.email
      });
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
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

// ✅ ADMIN LOGIN
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await User.findOne({ email: email.toLowerCase() });

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate access and refresh tokens using helpers
    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = refreshToken;
    await admin.save();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ✅ SEND LOGIN OTP
const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      console.log("SEND LOGIN OTP VERIFICATION:", otp); // For testing

      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.error(`SEND LOGIN OTP VERIFICATION EMAIL ERROR for ${email}:`, emailError.message);
      }

      return res.status(403).json({
        message: "Account not verified",
        redirect: "/verify-otp"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    let emailSent = false;
    try {
      await sendOTPEmail(email, otp);
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      console.log("VERIFY LOGIN OTP VERIFICATION:", otp); // For testing

      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.error(`VERIFY LOGIN OTP VERIFICATION EMAIL ERROR for ${email}:`, emailError.message);
      }

      return res.status(403).json({
        message: "Account not verified",
        redirect: "/verify-otp"
      });
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

    const user = await User.findOne({ email: email.toLowerCase() });

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
        await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.error(`VERIFICATION OTP EMAIL ERROR for ${email}:`, emailError.message);
      }

      return res.status(403).json({
        message: "Account not verified",
        redirect: "/verify-otp"
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
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.cookie("accessToken", newAccessToken, {
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
const logout = async (req, res) => {
  try {
    const { userId } = req.body;

    // Clear refresh token from database
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("token");

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  verifyEmailToken,
  resendVerificationEmail,
  loginUser,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  adminLogin
};