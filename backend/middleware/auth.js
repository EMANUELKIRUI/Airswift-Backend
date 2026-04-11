const jwt = require('jsonwebtoken');

// ✅ FIX 4: Extract token from cookies or Authorization header
const extractToken = (req) => {
  // Try cookies first (preferred)
  let token = req.cookies?.accessToken || null;
  
  // Fallback to Authorization header (Bearer token)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log("👉 TOKEN from Authorization header:", token ? "EXISTS" : "MISSING");
    }
  } else {
    console.log("👉 TOKEN from cookies:", token ? "EXISTS" : "MISSING");
  }
  
  return token;
};

const authMiddleware = (req, res, next) => {
  try {
    // ✅ FIX 4: Try both cookies and Authorization header
    const token = extractToken(req);

    console.log("👉 AUTH MIDDLEWARE TOKEN:", token ? "✓ EXISTS" : "✗ MISSING");

    // ✅ FIX 5: Graceful error handling - never crash server
    if (!token) {
      console.warn("⚠️ UNAUTHORIZED: No token found (cookies or Authorization header)");
      return res.status(401).json({ 
        message: "Not authenticated",
        error: "NO_TOKEN"
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error("⚠️ TOKEN VERIFICATION FAILED:", tokenError.message);
      return res.status(401).json({ 
        message: "Invalid token",
        error: "INVALID_TOKEN"
      });
    }

    console.log("👉 DECODED USER:", decoded.id ? `✓ ID: ${decoded.id}` : "✗ MISSING ID");

    // ✅ FIX 5: Set user on request object (CRITICAL)
    req.user = decoded;

    next();
  } catch (error) {
    console.error("❌ AUTH MIDDLEWARE ERROR:", error.message);
    return res.status(401).json({ 
      message: "Authentication failed",
      error: "AUTH_ERROR"
    });
  }
};

const verifyToken = authMiddleware;

// ✅ FIX 5: Verify user role with req.user validation
const verifyRole = (role) => {
  return (req, res, next) => {
    // Prevent crash if req.user is missing
    if (!req.user) {
      console.error("❌ ROLE VERIFICATION FAILED: req.user is missing");
      return res.status(401).json({ 
        message: "User not authenticated",
        error: "NO_USER"
      });
    }

    if (!req.user.role) {
      console.error("❌ ROLE VERIFICATION FAILED: req.user.role is missing");
      return res.status(403).json({ 
        message: "User role not found",
        error: "NO_ROLE"
      });
    }

    // Check if user has required role
    if (req.user.role !== role) {
      console.warn(`⚠️ ACCESS DENIED: User role '${req.user.role}' != required role '${role}'`);
      return res.status(403).json({ 
        message: "Access denied",
        error: "INSUFFICIENT_ROLE"
      });
    }
    
    next();
  };
};

module.exports = { authMiddleware, verifyToken, verifyRole, extractToken };