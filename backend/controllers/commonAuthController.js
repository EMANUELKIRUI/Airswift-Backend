const User = require('../models/User');

// Logout endpoint - is essentially just frontend token deletion,
// but we can add to blacklist if needed in future
const logout = (req, res) => {
  try {
    res.json({
      message: 'Logout successful. Please delete token on client side.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};

// Check authentication status
const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ authenticated: false, message: 'Not authenticated' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ authenticated: false, message: 'User not found' });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ authenticated: false, error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Failed to retrieve user', error: error.message });
  }
};

module.exports = {
  logout,
  checkAuth,
  getCurrentUser,
};
