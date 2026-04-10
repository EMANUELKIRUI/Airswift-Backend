const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { generateToken } = require("../utils/generateToken");
const { sendEmail, sendOTPEmail } = require("../services/emailService");
const { otpTemplate } = require("../utils/templates/otpTemplate");
const { generateOTP } = require("../utils/generateOTP");
const { generateAccessToken, generateRefreshToken } = require("../utils/tokenHelpers");
const { findUserByEmail, findUserById, createUser } = require("../utils/userHelpers");
const { logUserActivity, logLogin, logFailedLogin, logEmailVerification } = require("../utils/auditLogger");
const { logAction } = require("../utils/logger");

const buildCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? "airswift-backend-fjt3.onrender.com" : undefined;

  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    domain,
  };
};

const isDatabaseError = (error) => {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return (
    error instanceof mongoose.Error ||
    error.name === 'MongoNetworkError' ||
    error.name === 'MongooseServerSelectionError' ||
    /failed to connect|connection refused|network error|timed out|timeout|database temporarily unavailable|mongo.*error|econnrefused|etimedout|esocket/i.test(message)
  );
};

// Check if User is a Mongoose model or Sequelize model
const isMongooseModel = User.prototype && User.prototype.save;
const isSequelizeModel = User.prototype && User.prototype.update;

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

    const existing = await findUserByEmail(email);

    if (existing) {
      if (existing.isVerified) {
        return res.status(400).json({ message: "User already exists" });
      }

      const otp = generateOTP().toString();
      existing.otp = otp;
      existing.otpExpires = Date.now() + 10 * 60 * 1000;
      existing.name = name;
      existing.password = await bcrypt.hash(password, 10);
      await existing.save();

      let emailSent = false;
      try {
        await sendOTPEmail(existing.email, otp);
        emailSent = true;
      } catch (error) {
        console.error(`REGISTER OTP EMAIL ERROR for ${email}:`, error.message);
      }

      return res.status(409).json({
        message: "Email already exists - not verified",
        error: "EMAIL_NOT_VERIFIED",
        unverified: true,
        redirect: "/verify-otp",
        email: existing.email,
        otpSent: emailSent,
      });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP().toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    // Log user registration
    await logAction({
      userId: user._id,
      action: "SIGNUP",
      description: "User registered successfully",
      req
    });

    let emailSent = false;
    try {
      await sendOTPEmail(user.email, otp);
      emailSent = true;
    } catch (error) {
      console.error(`REGISTER OTP EMAIL ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "Verification OTP sent"
      : "User registered, but verification OTP could not be delivered";

    res.status(emailSent ? 200 : 201).json({
      message: responseMessage,
      redirect: "/verify-otp",
      email: user.email,
      user: {
        _id: user._id,
        role: user.role || "user",
        has_submitted: user.has_submitted || false,
      },
    });
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

    let user;
    if (isMongooseModel) {
      user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() } // Check expiry
      });
    } else if (isSequelizeModel) {
      user = await User.findOne({
        where: {
          verificationToken: hashedToken,
          verificationTokenExpires: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    user.otp = null;
    user.otpExpires = null;

    // Generate access and refresh tokens using helpers
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    user.refreshToken = refreshTokenValue;
    await user.save();

    const cookieOptions = buildCookieOptions(req);

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

// ✅ VERIFY REGISTRATION OTP
const verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    user.refreshToken = refreshTokenValue;
    await user.save();

    const cookieOptions = buildCookieOptions(req);

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
    console.error("VERIFY REGISTRATION OTP ERROR:", err);
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

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    const otp = generateOTP().toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await user.save();

    let emailSent = false;
    try {
      await sendOTPEmail(user.email, otp);
      emailSent = true;
    } catch (error) {
      console.error(`RESEND VERIFICATION OTP ERROR for ${email}:`, error.message);
    }

    const responseMessage = emailSent
      ? "Verification OTP resent successfully"
      : "Verification OTP generated, but delivery failed";

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
  console.log("LOGIN HIT - Request body:", req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("LOGIN FAILED - Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("LOGIN FAILED - MongoDB not connected");
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }

    console.log("LOGIN - Looking up user:", email);
    let user;
    try {
      user = await findUserByEmail(email);
    } catch (error) {
      console.error("LOGIN USER DB LOOKUP ERROR:", error);
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }

    if (!user) {
      console.log("LOGIN FAILED - User not found:", email);
      try {
        await logAction({
          action: "LOGIN_FAILED",
          description: "Invalid login attempt - user not found",
          req,
          status: "error"
        });
      } catch (error) {
        console.error("LOGIN FAILED - logAction error:", error);
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("LOGIN FAILED - Password mismatch for user:", user._id);
      try {
        await logAction({
          action: "LOGIN_FAILED",
          description: "Invalid login attempt - wrong password",
          req,
          status: "error"
        });
      } catch (error) {
        console.error("LOGIN FAILED - logAction error:", error);
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      console.log("LOGIN ATTEMPT - User not verified, sending OTP:", user._id);

      // Generate new OTP for verification
      const otp = generateOTP().toString();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update user with new OTP
      user.otp = otp;
      user.otpExpires = otpExpires;
      try {
        await user.save();
      } catch (error) {
        console.error("LOGIN USER DB SAVE ERROR (OTP):", error);
        return res.status(503).json({
          message: "Database temporarily unavailable. Please try again in a few moments.",
          error: "DATABASE_UNAVAILABLE"
        });
      }

      // Send OTP email
      let emailSent = false;
      try {
        await sendOTPEmail(user.email, otp);
        emailSent = true;
        console.log("LOGIN OTP SENT - OTP sent to:", user.email);
      } catch (error) {
        console.error(`LOGIN OTP EMAIL ERROR for ${user.email}:`, error.message);
      }

      const responseMessage = emailSent
        ? "Verification OTP sent to your email. Please verify your account to login."
        : "Please verify your email first. Check your inbox for the verification OTP.";

      return res.status(403).json({
        message: responseMessage,
        redirect: "/verify-otp",
        email: user.email
      });
    }

    console.log("LOGIN SUCCESS - Generating tokens for user:", user._id);
    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database
    user.refreshToken = refreshToken;
    try {
      await user.save();
    } catch (error) {
      console.error("LOGIN USER DB SAVE ERROR (refresh token):", error);
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }

    const cookieOptions = buildCookieOptions(req);

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    console.log("LOGIN SUCCESS - User logged in:", user._id);

    // Log successful login
    try {
      await logAction({
        userId: user._id,
        action: "LOGIN_SUCCESS",
        description: "User logged in successfully",
        req
      });
    } catch (error) {
      console.error("LOGIN SUCCESS - logAction error:", error);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        has_submitted: user.has_submitted || false,
      },
      token: accessToken,
      has_submitted: user.has_submitted || false,
      redirect_to: (user.has_submitted || false) ? '/dashboard' : '/application-form'
    });
  } catch (err) {
    console.error("LOGIN USER ERROR:", err);
    if (isDatabaseError(err)) {
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }
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

    // Only allow specific admin credentials
    const ADMIN_EMAIL = "admin@talex.com";
    const ADMIN_PASSWORD = "Admin123!";

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: "Invalid admin credentials" });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }

    const admin = await findUserByEmail(email);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Admin account not found or invalid" });
    }

    // Verify the admin account is verified
    if (!admin.isVerified) {
      return res.status(403).json({ error: "Admin account not verified" });
    }

    // Generate access and refresh tokens using helpers
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshToken = refreshToken;
    await admin.save();

    const cookieOptions = buildCookieOptions(req);

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

    const user = await findUserByEmail(email);
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

    const user = await findUserByEmail(email);
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
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshTokenValue;
    await user.save();

    const cookieOptions = buildCookieOptions(req);

    res.cookie("accessToken", accessToken, cookieOptions);
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

    const user = await findUserByEmail(email);

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

    const userId = decoded.userId || decoded.id;
    const user = await findUserById(userId);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const newAccessToken = generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, buildCookieOptions(req));

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("REFRESH TOKEN ERROR:", err);
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ GET ME
const getMe = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data without password
    let userData;
    if (isMongooseModel) {
      userData = user.toObject();
      delete userData.password;
    } else if (isSequelizeModel) {
      userData = user.toJSON();
      delete userData.password;
    }

    res.json({ user: userData });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ LOGOUT
const logout = async (req, res) => {
  try {
    const { userId } = req.body;

    // Log logout activity
    if (userId) {
      await logAction({
        userId,
        action: "LOGOUT",
        description: "User logged out",
        req
      });
    }

    // Clear refresh token from database
    if (userId) {
      const user = await findUserById(userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    const cookieOptions = buildCookieOptions(req);
    res.clearCookie("accessToken", { ...cookieOptions, httpOnly: false, secure: false });
    res.clearCookie("refreshToken", { ...cookieOptions, httpOnly: false, secure: false });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  verifyEmailToken,
  verifyRegistrationOTP,
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