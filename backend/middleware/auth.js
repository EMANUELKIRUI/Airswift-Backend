const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // ✅ Extract token from Authorization header with Bearer prefix
  const authHeader = req.headers.authorization;

  console.log('🔐 AUTH MIDDLEWARE CHECK:');
  console.log('   Auth header:', authHeader);
  console.log('   Authorization header exists:', !!authHeader);

  if (!authHeader) {
    console.warn('   ❌ Missing Authorization header');
    return res.status(401).json({ 
      message: 'No token provided',
      error: 'MISSING_AUTH_HEADER'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.warn('   ❌ Missing Bearer prefix. Format should be: "Bearer [token]"');
    console.warn('   Received:', authHeader.substring(0, 50));
    return res.status(401).json({ 
      message: 'Invalid authorization format. Expected: Bearer [token]',
      error: 'INVALID_AUTH_FORMAT'
    });
  }

  // Split "Bearer <token>" and extract the actual token
  const token = authHeader.split(' ')[1];

  if (!token) {
    console.warn('   ❌ Token is empty after Bearer prefix');
    return res.status(401).json({ 
      message: 'Token is empty',
      error: 'EMPTY_TOKEN'
    });
  }

  try {
    console.log('   📝 Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('   ✅ Token verified. User ID:', decoded.id);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('   ❌ Token verification failed:', err.message);
    return res.status(401).json({ 
      message: 'Invalid token',
      error: err.message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    });
  }
};

const verifyToken = authMiddleware;

const verifyRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

// Alias for compatibility with different imports
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

module.exports = { authMiddleware, verifyToken, verifyRole, authorizeRoles };
