const FirebaseAuthService = require('../services/firebaseAuthService');
const User = require('../models/User');

// Firebase Authentication Controller
class FirebaseAuthController {
  // Verify Firebase token and return user info
  static async verifyToken(req, res) {
    try {
      // User info is already attached by middleware
      const { uid, email, name, emailVerified, dbUser } = req.user;

      res.json({
        message: 'Token verified successfully',
        user: {
          uid,
          email,
          name,
          emailVerified,
          profile: dbUser // Database user info
        }
      });
    } catch (error) {
      console.error('Error in verifyToken:', error);
      res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Create custom token for client authentication
  static async createCustomToken(req, res) {
    try {
      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({
          message: 'UID is required'
        });
      }

      const customToken = await FirebaseAuthService.createCustomToken(uid);

      res.json({
        message: 'Custom token created successfully',
        customToken
      });
    } catch (error) {
      console.error('Error creating custom token:', error);
      res.status(500).json({
        message: 'Failed to create custom token',
        error: error.message
      });
    }
  }

  // Sync Firebase user with local database
  static async syncUser(req, res) {
    try {
      const firebaseUser = req.user.firebaseToken;

      const dbUser = await FirebaseAuthService.syncUserWithDatabase(firebaseUser);

      res.json({
        message: 'User synced successfully',
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          firebaseUid: dbUser.firebaseUid,
          isVerified: dbUser.isVerified,
          authProvider: dbUser.authProvider
        }
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({
        message: 'Failed to sync user',
        error: error.message
      });
    }
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const { uid } = req.user;

      // Get Firebase user data
      const firebaseUser = await FirebaseAuthService.getUser(uid);

      // Get database user data
      const dbUser = await User.findOne({ where: { firebaseUid: uid } });

      res.json({
        message: 'Profile retrieved successfully',
        profile: {
          firebase: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            disabled: firebaseUser.disabled,
            metadata: firebaseUser.metadata
          },
          database: dbUser ? {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            isVerified: dbUser.isVerified,
            authProvider: dbUser.authProvider,
            createdAt: dbUser.createdAt
          } : null
        }
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { uid } = req.user;
      const { displayName, photoURL } = req.body;

      // Update Firebase user
      const updateData = {};
      if (displayName) updateData.displayName = displayName;
      if (photoURL) updateData.photoURL = photoURL;

      if (Object.keys(updateData).length > 0) {
        await FirebaseAuthService.updateUser(uid, updateData);
      }

      // Update database user
      const dbUser = await User.findOne({ where: { firebaseUid: uid } });
      if (dbUser && displayName) {
        await dbUser.update({ name: displayName });
      }

      res.json({
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // Delete user account
  static async deleteAccount(req, res) {
    try {
      const { uid } = req.user;

      // Delete from Firebase
      await FirebaseAuthService.deleteUser(uid);

      // Delete from database
      await User.destroy({ where: { firebaseUid: uid } });

      res.json({
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({
        message: 'Failed to delete account',
        error: error.message
      });
    }
  }

  // Generate email sign-in link
  static async generateSignInLink(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'Email is required'
        });
      }

      const actionCodeSettings = {
        url: process.env.FRONTEND_URL || 'http://localhost:3000/auth/callback',
        handleCodeInApp: true,
      };

      const link = await FirebaseAuthService.generateAuthLink(email, actionCodeSettings);

      res.json({
        message: 'Sign-in link generated successfully',
        link
      });
    } catch (error) {
      console.error('Error generating sign-in link:', error);
      res.status(500).json({
        message: 'Failed to generate sign-in link',
        error: error.message
      });
    }
  }
}

module.exports = FirebaseAuthController;