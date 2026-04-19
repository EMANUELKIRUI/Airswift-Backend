const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { generateToken } = require("../utils/generateToken");
const { sendEmail, sendOTP } = require("../services/emailService");
const { otpTemplate } = require("../utils/templates/otpTemplate");
const { generateOTP } = require("../utils/generateOTP");
const { generateAccessToken, generateRefreshToken } = require("../utils/tokenHelpers");
const { findUserByEmail, findUserById, createUser } = require("../utils/userHelpers");
const { logUserActivity, logRegistration, logLogin, logFailedLogin, logEmailVerification } = require("../utils/auditLogger");
const { logAction } = require("../utils/logger");
const auditLog = logAction;
const { trackFailedLogin, checkLoginSecurity, detectNewIP, trackOTPRequests } = require("../services/securityService");
const { getPermissions } = require("../config/roles");

const AuditLog = require("../models/AuditLog");

const logEvent = async ({ userId, action, resource = 'auth', details }) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      resource,
      description: details,
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

const buildCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const domain = isProduction ? "airswift-backend-fjt3.onrender.com" : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
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

// Check if User is a Mongoose model
const isMongooseModel = Boolean(User.schema);
const isSequelizeModel = Boolean(User.sequelize);

// ✅ REGISTER - Send verification email
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("REGISTER BODY:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Account already exists. Please login."
        });
      }

      // ⚠️ Not verified → RESEND OTP
      const otp = generateOTP();

      existingUser.otp = otp;
      existingUser.otpExpires = Date.now() + 10 * 60 * 1000;

      await existingUser.save();

      await sendEmail(
        existingUser.email,
        "Verify your account",
        `Your OTP is ${otp}`
      );

      return res.status(200).json({
        success: true,
        message: "Account not verified. OTP resent.",
        redirect: "/verify-otp",
        email: existingUser.email
      });
    }

    // 🟢 CASE 2: NEW USER
    // Determine role based on email
    let role = 'user';
    if (normalizedEmail === 'admin@talex.com') {
      role = 'admin';
    } else if (!normalizedEmail.endsWith('@email.com')) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format. Only emails ending with @email.com are allowed for regular users."
      });
    }

    const otp = generateOTP();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isVerified: false,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000
    });

    await sendEmail(
      user.email,
      "Verify your account",
      `Your OTP is ${otp}`
    );

    return res.status(201).json({
      success: true,
      message: "Account created. OTP sent.",
      redirect: "/verify-otp",
      email: user.email
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    const isDuplicateKeyError = error && (
      error.code === 11000 ||
      error.codeName === "DuplicateKey" ||
      /duplicate key/i.test(error.message || "")
    );

    if (isDuplicateKeyError) {
      const duplicateEmail = normalizedEmail || (error.keyValue && error.keyValue.email) || email;
      const existingUser = await User.findOne({ email: duplicateEmail });

      if (existingUser) {
        if (existingUser.isVerified) {
          return res.status(200).json({
            message: "Account already exists. Please login.",
            redirect: "login",
            email: duplicateEmail,
          });
        }

        const otp = generateOTP();
        existingUser.otp = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        await sendEmail(
          existingUser.email,
          "Verify your account",
          `Your OTP is ${otp}`
        );

        return res.status(200).json({
          success: true,
          message: "Account not verified. OTP resent.",
          redirect: "/verify-otp",
          email: existingUser.email
        });
      }

      return res.status(400).json({
        message: "Email already registered",
        redirect: "login",
        email: duplicateEmail,
      });
    }

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ✅ VERIFY REGISTRATION OTP
const verifyRegistrationOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : email;
    const enteredOtp = typeof otp === 'string' ? otp.trim() : String(otp);

    if (!normalizedEmail || !enteredOtp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    console.log("Entered OTP:", enteredOtp);
    console.log("Stored OTP:", user.otp);

    if (!user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(enteredOtp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Account verified successfully",
      redirect: "login"
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

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

  res.json({
    success: true,
    message: "Account verified successfully"
  });
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

    trackOTPRequests(email);
    const otp = generateOTP().toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    user.otp = hashedOtp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    let emailSent = false;
    try {
      await sendOTP(user.email, otp);
      emailSent = true;
    } catch (error) {
      console.error(`RESEND VERIFICATION OTP ERROR for ${email}:`, error.response?.data || error.message);
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

const resendOTP = async (req, res) => {
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
      return res.status(400).json({ message: "Account already verified. Please login." });
    }

    const now = Date.now();
    const lastSentAt = user.lastOtpSentAt ? new Date(user.lastOtpSentAt).getTime() : user.lastOtpSent ? new Date(user.lastOtpSent).getTime() : null;
    const ONE_MINUTE = 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;

    if (lastSentAt && now - lastSentAt < ONE_MINUTE) {
      const waitTime = Math.ceil((ONE_MINUTE - (now - lastSentAt)) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitTime}s before requesting another OTP`,
      });
    }

    if (!user.resendCount && user.resendCount !== 0) {
      user.resendCount = 0;
    }

    if (lastSentAt && now - lastSentAt < ONE_HOUR && user.resendCount >= 5) {
      return res.status(429).json({ message: "Too many OTP requests. Try again later." });
    }

    if (!lastSentAt || now - lastSentAt > ONE_HOUR) {
      user.resendCount = 0;
    }

    const otp = generateOTP().toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.otp = hashedOtp;
    user.otpExpires = now + 10 * 60 * 1000;
    user.lastOtpSentAt = now;
    user.lastOtpSent = now;
    user.resendCount += 1;

    await user.save();

    console.log("🔁 Resending OTP to:", email);

    await sendOTP(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ LOGIN USER
const loginUser = async (req, res) => {
  console.log("LOGIN HIT - Request body:", req.body);
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!normalizedEmail || !password) {
      console.log("LOGIN FAILED - Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    console.log("LOGIN - Looking up user:", normalizedEmail);
    let user;
    try {
      user = await findUserByEmail(normalizedEmail);
    } catch (error) {
      console.error("LOGIN USER DB LOOKUP ERROR:", error);
      if (isDatabaseError(error)) {
        return res.status(503).json({
          message: "Database temporarily unavailable. Please try again in a few moments.",
          error: "DATABASE_UNAVAILABLE"
        });
      }
      return res.status(500).json({ message: "Server error during login" });
    }

    // Ensure admin email always gets admin privileges
    if (normalizedEmail === 'admin@talex.com' && user && user.role !== 'admin') {
      user.role = 'admin';
      try {
        await user.save();
        console.log('LOGIN - Upgraded admin@talex.com to admin role');
      } catch (saveError) {
        console.error('LOGIN - Failed to persist admin role upgrade:', saveError);
      }
    }

    if (!user) {
      console.log("LOGIN FAILED - User not found:", normalizedEmail);
      try {
        await checkLoginSecurity(normalizedEmail, req);
        await logFailedLogin(req, normalizedEmail);
      } catch (error) {
        console.error("LOGIN FAILED - logFailedLogin error:", error);
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      console.log("LOGIN FAILED - Missing stored password for user:", user._id || normalizedEmail);
      try {
        await logFailedLogin(req, normalizedEmail);
      } catch (error) {
        console.error("LOGIN FAILED - logFailedLogin error:", error);
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("LOGIN FAILED - Password mismatch for user:", user._id || normalizedEmail);
      try {
        await checkLoginSecurity(normalizedEmail, req);
        await logFailedLogin(req, normalizedEmail);
      } catch (error) {
        console.error("LOGIN FAILED - logFailedLogin error:", error);
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      console.log("LOGIN ATTEMPT - User not verified, sending verification link:", user._id);

      const otp = generateOTP().toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      user.otp = hashedOtp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      try {
        await user.save();
      } catch (error) {
        console.error("LOGIN USER DB SAVE ERROR (OTP):", error);
        if (isDatabaseError(error)) {
          return res.status(503).json({
            message: "Database temporarily unavailable. Please try again in a few moments.",
            error: "DATABASE_UNAVAILABLE"
          });
        }
        return res.status(500).json({ message: "Server error during OTP generation" });
      }

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

    try {
      // ✅ Generate short-lived access token (15m) and long-lived refresh token (7d)
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // ✅ Store refresh token in user (for token rotation security)
      user.refreshToken = refreshToken;
      await user.save();

      // ✅ Send refresh token as HTTP-only cookie (secure + not accessible to JavaScript)
      res.cookie('refreshToken', refreshToken, buildCookieOptions(req));

      // ✅ Audit logging
      await auditLog({
        action: "USER_LOGIN",
        userId: user._id,
        entity: "Auth",
        entityId: user._id,
        details: { email: user.email }
      });

      await logEvent({
        userId: user._id,
        action: "LOGIN",
        resource: 'auth',
        details: `User logged in`,
      });

      const logAction = require('../utils/auditLogger');
      await logAction({
        userId: user._id,
        action: "LOGIN",
        resource: "AUTH",
        description: "User logged in successfully",
        metadata: { email: user.email, ip: req.ip }
      });

      const permissions = getPermissions(user.role || 'user');

      // ✅ Return clean response with token and user info
      return res.json({
        token: accessToken,  // Short-lived token for API requests
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          hasSubmittedApplication: user.hasSubmittedApplication,
          permissions,
        }
        // refreshToken NOT sent in JSON (it's in secure cookie)
      });
    } catch (err) {
      console.error("AUTH ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
  } catch (err) {
    console.error("LOGIN USER ERROR:", err);
    console.error("LOGIN ERROR DETAILS:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    if (isDatabaseError(err)) {
      return res.status(503).json({
        message: "Database temporarily unavailable. Please try again in a few moments.",
        error: "DATABASE_UNAVAILABLE"
      });
    }
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ ADMIN LOGIN - REMOVED: Admin now uses regular login endpoint
/*
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

    let admin = await findUserByEmail(email);

    // Create admin user if it doesn't exist
    if (!admin) {
      console.log("Creating admin user...");
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = await User.create({
        name: "Admin User",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        isVerified: true,
        authProvider: "local",
      });
      console.log("Admin user created");
    }

    if (admin.role !== "admin") {
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

    // Log admin login
    try {
      await logAction({
        userId: admin._id,
        action: "ADMIN_LOGIN",
        entity: "Admin",
        entityId: admin._id,
        details: { email: admin.email, role: admin.role },
        description: "Admin successfully logged in",
        req
      });
      await detectNewIP(admin, req);
    } catch (error) {
      console.error("ADMIN LOGIN - logAction error:", error);
    }

    res.json({
      token: accessToken,  // ✅ FIX: Use 'token' instead of 'accessToken'
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
*/

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

    trackOTPRequests(email);
    if (!user.isVerified) {
      const otp = generateOTP().toString();
      console.log("SEND LOGIN OTP VERIFICATION:", otp); // For testing

      user.otp = await bcrypt.hash(otp, 10);
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

    const otp = generateOTP().toString();
    user.resetToken = await bcrypt.hash(otp, 10);
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
    trackOTPRequests(email);    if (!user.isVerified) {
      const generatedOtp = generateOTP().toString();
      console.log("VERIFY LOGIN OTP VERIFICATION:", generatedOtp); // For testing

      user.otp = await bcrypt.hash(generatedOtp, 10);
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await sendOTPEmail(user.email, generatedOtp);
      } catch (emailError) {
        console.error(`VERIFY LOGIN OTP VERIFICATION EMAIL ERROR for ${email}:`, emailError.message);
      }

      return res.status(403).json({
        message: "Account not verified",
        redirect: "/verify-otp"
      });
    }

    if (!user.resetToken) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const isMatch = await bcrypt.compare(otp, user.resetToken);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Clear OTP
    user.resetToken = null;
    user.resetTokenExpiry = null;

    const userId = user._id ? user._id.toString() : user.id;

    const accessToken = jwt.sign(
      { id: userId, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshTokenValue = jwt.sign(
      { id: userId },
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
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      token: accessToken,  // ✅ FIX: Use 'token' instead of 'accessToken'
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

    trackOTPRequests(email);

    // 🔴 CHECK IF VERIFIED FIRST
    if (!user.isVerified) {
      const otp = generateOTP();
      console.log("OTP:", otp); // 👉 For testing since email might fail

      user.otp = await bcrypt.hash(otp, 10);
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

    trackOTPRequests(email);
    // ✅ VERIFIED USER - Send reset email
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    console.log("FORGOT PASSWORD - Setting reset token for", user.email, {
      resetTokenLength: hashedToken.length,
      expireTime: new Date(user.resetTokenExpiry),
      expiresIn: "15 minutes"
    });
    
    await user.save();
    
    // Verify it was saved
    const savedUser = await User.findById(user._id);
    console.log("FORGOT PASSWORD - Token saved verification:", {
      tokenSaved: !!savedUser.resetToken,
      expireSaved: !!savedUser.resetTokenExpiry
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendEmail(
        user.email,
        "Reset Your Password",
        `
          <h2>Password Reset</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #e63946; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
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
    const token = req.params.token || req.body.token || req.query.token;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    console.log("RESET PASSWORD DEBUG:", {
      tokenLength: token?.length,
      hashedToken: hashedToken.substring(0, 20) + "...",
      currentTime: Date.now()
    });

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      console.log("RESET PASSWORD TOKEN NOT FOUND - Checking for debugging info:");
      
      // Debug: Check if ANY user has this reset token
      const userWithToken = await User.findOne({
        resetToken: hashedToken
      });
      
      if (userWithToken) {
        console.log("Token found but expired. Expiry:", userWithToken.resetTokenExpiry, "Now:", Date.now());
        return res.status(400).json({ error: "Invalid or expired token" });
      } else {
        console.log("Token not found in database at all");
        return res.status(400).json({ error: "Invalid or expired token" });
      }
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    console.log("RESET PASSWORD SUCCESS for user:", user.email);

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
    // ✅ Get refresh token from HTTP-only cookie (more secure)
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    // ✅ Verify refresh token signature and expiry
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET
    );

    // ✅ Find user and validate token
    const userId = decoded.id;
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // ✅ Token rotation: verify the refresh token matches what we stored
    if (user.refreshToken !== token) {
      // Possible token reuse attack - invalidate and return error
      user.refreshToken = null;
      await user.save();
      return res.status(401).json({ message: 'Refresh token compromised' });
    }

    // ✅ Generate new access token (short-lived)
    const newAccessToken = generateAccessToken(user);

    // ✅ Optionally generate new refresh token for rotation security
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    // ✅ Send new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, buildCookieOptions(req));

    // ✅ Return new access token
    res.json({ 
      accessToken: newAccessToken,
      // refreshToken NOT sent in JSON (it's in secure cookie)
    });
  } catch (err) {
    console.error("REFRESH TOKEN ERROR:", err);
    res.status(401).json({ message: 'Invalid refresh token' });
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
        entity: "User",
        entityId: userId,
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
  verifyRegistrationOTP,
  verifyOtp,
  resendVerificationEmail,
  resendOTP,
  loginUser,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  // adminLogin // Removed - admin uses regular login
};