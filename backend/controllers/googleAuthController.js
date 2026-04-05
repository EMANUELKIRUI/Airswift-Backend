const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getGoogleAuthUrl, getTokens, verifyIdToken } = require('../config/googleOAuth');

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
};

const findOrCreateUser = async (profile) => {
  const googleId = profile.sub;
  const email = profile.email;
  const name = profile.name || profile.email?.split('@')[0];

  let user = await User.findOne({ where: { email } });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: '',
      isVerified: true,
      googleId: googleId,
      authProvider: 'google',
      profilePicture: profile.picture || null,
    });
  } else {
    // Update provider info for existing user
    await user.update({
      googleId: googleId,
      authProvider: 'google',
      profilePicture: profile.picture || user.profilePicture,
    });
  }

  return user;
};

const GoogleAuthController = {
  getAuthUrl: (req, res) => {
    try {
      const url = getGoogleAuthUrl();
      res.json({ url });
    } catch (error) {
      console.error('Error generating Google Auth URL:', error);
      res.status(500).json({ message: 'Failed to generate auth URL' });
    }
  },

  async callback(req, res) {
    try {
      const code = req.query.code;
      const error = req.query.error;
      
      // Handle Google OAuth error responses
      if (error) {
        console.error('❌ Google OAuth error:', error);
        const errorMessages = {
          'access_denied': 'User denied access',
          'invalid_scope': 'Invalid scope requested',
          'server_error': 'Google server error',
        };
        return res.status(400).json({ 
          message: errorMessages[error] || `Google auth failed: ${error}` 
        });
      }
      
      if (!code) {
        return res.status(400).json({ message: 'Authorization code is required' });
      }

      console.log('📝 Processing authorization code...');
      const tokens = await getTokens(code);

      if (!tokens || !tokens.id_token) {
        console.error('❌ No ID token in response:', tokens);
        return res.status(400).json({ 
          message: 'Failed to obtain ID token from Google',
          hint: 'Check if GOOGLE_REDIRECT_URI matches Google Console settings'
        });
      }

      const profile = await verifyIdToken(tokens.id_token);

      if (!profile) {
        return res.status(400).json({ message: 'Failed to verify ID token' });
      }

      const user = await findOrCreateUser(profile);
      const token = createToken(user);

      // Redirect to frontend with token
      const frontendRedirect = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendRedirect}/auth/success?token=${token}`;
      
      console.log('✅ Google auth successful, redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google auth callback error:', error.message);
      console.error('   Stack:', error.stack);
      
      // Redirect to frontend with error
      const frontendRedirect = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendRedirect}/auth/error?message=${encodeURIComponent(error.message)}`;
      res.redirect(redirectUrl);
    }
  },

  async verifyId(req, res) {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ 
          message: 'ID token is required',
          hint: 'Send Google ID token in request body: { "idToken": "..." }'
        });
      }

      console.log('📝 Verifying Google ID token from frontend...');
      
      const profile = await verifyIdToken(idToken);
      
      if (!profile) {
        return res.status(401).json({ message: 'Invalid or expired ID token' });
      }

      const user = await findOrCreateUser(profile);
      const token = createToken(user);

      console.log('✅ Frontend token verification successful for:', profile.email);

      res.json({
        success: true,
        message: 'Google authentication successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
        },
      });
    } catch (error) {
      console.error('❌ ID token verification error:', error.message);
      res.status(500).json({ 
        message: 'Failed to verify ID token',
        error: error.message,
        hint: 'Ensure the token is valid and not expired'
      });
    }
  },

  async getProfile(req, res) {
    try {
      // User info should be attached by verifyToken middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile retrieved successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ message: 'Failed to get profile', error: error.message });
    }
  },

  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { name, email } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if email is already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      await user.update({
        name: name || user.name,
        email: email || user.email,
      });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
        },
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
  },
};

module.exports = GoogleAuthController;
