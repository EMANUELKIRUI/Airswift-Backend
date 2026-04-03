const { admin } = require('../config/firebase');

// Firebase Authentication Middleware
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized: No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Unauthorized: Invalid token format'
      });
    }

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Add user information to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebaseToken: decodedToken
    };

    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        message: 'Unauthorized: Token expired'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        message: 'Unauthorized: Token revoked'
      });
    }

    return res.status(401).json({
      message: 'Unauthorized: Invalid token'
    });
  }
};

// Optional: Middleware to check if user exists in your database
const syncFirebaseUser = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { uid, email, name } = req.user;

    // Check if user exists in your database
    let user = await User.findOne({ where: { firebaseUid: uid } });

    if (!user) {
      // Create user in your database if they don't exist
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        firebaseUid: uid,
        isVerified: true, // Firebase users are pre-verified
        authProvider: 'firebase'
      });
    }

    // Update request user with database user info
    req.user.dbUser = user;
    next();
  } catch (error) {
    console.error('Error syncing Firebase user:', error);
    return res.status(500).json({
      message: 'Internal server error during user sync'
    });
  }
};

module.exports = {
  verifyFirebaseToken,
  syncFirebaseUser
};