const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
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

module.exports = { authMiddleware, verifyToken, verifyRole };
