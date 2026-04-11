const express = require('express');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_submitted: user.has_submitted,
        isVerified: user.isVerified
      },
      status: 'authenticated'
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;