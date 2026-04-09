const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = req.cookies?.accessToken || req.cookies?.token || null;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    console.warn("⚠️  VerifyToken: No token found in cookies or Authorization header");
    console.warn("Cookies:", Object.keys(req.cookies || {}));
    console.warn("Auth header:", req.headers.authorization ? "Present" : "Missing");
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET is not set!");
    return res.status(500).json({ message: 'Server error: JWT_SECRET not configured' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    res.status(403).json({ message: 'Invalid token' });
  }
};

const verifyRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };