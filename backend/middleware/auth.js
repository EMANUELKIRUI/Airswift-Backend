const jwt = require('jsonwebtoken');
const { getPermissions } = require('../config/roles');
const User = require('../models/User');

// ✅ SIMPLE RBAC: Use string roles with config-based permissions
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ Check header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // ✅ Prevent "undefined" or empty token
    if (!token || token === 'undefined') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user from database (no population needed for string roles)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // ✅ Get permissions from config based on string role
    const roleName = user.role || 'user';
    const permissions = getPermissions(roleName);

    // ✅ Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: roleName,
      permissions: permissions,
      status: user.status,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token failed', error: error.message });
  }
};

const verifyToken = authMiddleware;

// ✅ Verify specific role (works with both string role names and ObjectIds)
const verifyRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    // Compare role name (string from req.user.role)
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

// ✅ Role authorization - accepts multiple roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

// ✅ Permission-based authorization
const permit = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(p =>
      userPermissions.includes(p)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        message: 'Permission denied',
        required: requiredPermissions,
        current: userPermissions,
      });
    }

    next();
  };
};

// Alias for compatibility with different imports
const authorizeRoles = authorize;

// Clean exports
const protect = authMiddleware;

module.exports = { 
  authMiddleware, 
  verifyToken, 
  protect,
  verifyRole, 
  authorize,
  authorizeRoles,
  permit
};
