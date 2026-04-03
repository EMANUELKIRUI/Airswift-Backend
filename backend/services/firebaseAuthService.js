const { admin } = require('../config/firebase');
const User = require('../models/User');

class FirebaseAuthService {
  // Create custom token for client-side authentication
  static async createCustomToken(uid) {
    try {
      const customToken = await admin.auth().createCustomToken(uid);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error('Failed to create authentication token');
    }
  }

  // Verify and decode Firebase ID token
  static async verifyIdToken(token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw error;
    }
  }

  // Get user data from Firebase
  static async getUser(uid) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Update user in Firebase
  static async updateUser(uid, properties) {
    try {
      const userRecord = await admin.auth().updateUser(uid, properties);
      return userRecord;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user from Firebase
  static async deleteUser(uid) {
    try {
      await admin.auth().deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Sync Firebase user with local database
  static async syncUserWithDatabase(firebaseUser) {
    try {
      const { uid, email, displayName, photoURL, emailVerified } = firebaseUser;

      let user = await User.findOne({ where: { firebaseUid: uid } });

      if (!user) {
        // Create new user in database
        user = await User.create({
          name: displayName || email.split('@')[0],
          email,
          firebaseUid: uid,
          isVerified: emailVerified,
          authProvider: 'firebase',
          profilePicture: photoURL
        });
      } else {
        // Update existing user
        await user.update({
          name: displayName || user.name,
          email,
          isVerified: emailVerified,
          profilePicture: photoURL || user.profilePicture
        });
      }

      return user;
    } catch (error) {
      console.error('Error syncing user with database:', error);
      throw error;
    }
  }

  // Generate Firebase Auth Link (for email link authentication)
  static async generateAuthLink(email, actionCodeSettings) {
    try {
      const link = await admin.auth().generateSignInWithEmailLink(
        email,
        actionCodeSettings
      );
      return link;
    } catch (error) {
      console.error('Error generating auth link:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAuthService;