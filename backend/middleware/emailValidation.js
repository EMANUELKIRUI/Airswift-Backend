/**
 * ✅ EMAIL VALIDATION MIDDLEWARE
 * Enforces Gmail-only requirement for regular user registration
 * 
 * Usage:
 *   router.post('/register', validateGmailEmail, registerController);
 */

const validateGmailEmail = (req, res, next) => {
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: '❌ Email is required'
    });
  }

  // Convert email to lowercase for consistency
  const normalizedEmail = email.toLowerCase().trim();

  // ✅ Enforce Gmail requirement for regular users (not admins)
  // Admins can use custom domains if needed
  const isAdmin = role === 'admin' || req.user?.role === 'admin';

  if (!isAdmin) {
    if (!normalizedEmail.endsWith('@gmail.com')) {
      return res.status(400).json({
        success: false,
        message: '❌ Only Gmail addresses (@gmail.com) are allowed for user registration. Please use a valid Gmail account.',
        email: normalizedEmail,
        receivedDomain: normalizedEmail.split('@')[1] || 'invalid'
      });
    }
  }

  // Validate email format using regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: '❌ Invalid email address format'
    });
  }

  // Gmail-specific format validation (if not admin)
  if (!isAdmin) {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: '❌ Invalid Gmail address format. Example: yourname@gmail.com'
      });
    }
  }

  // Attach normalized email to request
  req.body.email = normalizedEmail;

  console.log(`✅ Email validation passed: ${normalizedEmail} (${isAdmin ? 'admin' : 'user'})`);
  next();
};

/**
 * ✅ REGISTRATION CONTROLLER WITH EMAIL VALIDATION
 */
const registerWithGmailValidation = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '❌ Email, password, and name are required'
      });
    }

    // ✅ Re-validate Gmail requirement (defense in depth)
    if (role !== 'admin') {
      if (!email.endsWith('@gmail.com')) {
        return res.status(400).json({
          success: false,
          message: '❌ Only Gmail addresses (@gmail.com) are allowed for user registration'
        });
      }
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '❌ Password must be at least 8 characters long'
      });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: '❌ Password must contain uppercase, lowercase, and numbers'
      });
    }

    // Check if user already exists
    const User = require('../models/User');
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '❌ This email address is already registered'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      role: role || 'user', // Default to 'user' for security
      isVerified: false
    });

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log user registration
    const AuditLog = require('../models/AuditLogMongo');
    await AuditLog.create({
      user_id: newUser._id,
      action: 'USER_REGISTRATION',
      resource: 'User',
      description: `User registered with Gmail: ${email}`,
      status: 'success'
    });

    console.log(`✅ User registered successfully: ${email}`);

    // Return success response
    res.status(201).json({
      success: true,
      message: '✅ Registration successful! Welcome to AIRSWIFT.',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  validateGmailEmail,
  registerWithGmailValidation
};
