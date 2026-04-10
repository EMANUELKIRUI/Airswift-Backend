const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    console.log("👉 TOKEN:", token); // debug

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("👉 DECODED:", decoded); // debug

    req.user = decoded; // ✅ THIS IS IMPORTANT

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const verifyToken = authMiddleware;

const verifyRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { authMiddleware, verifyToken, verifyRole };