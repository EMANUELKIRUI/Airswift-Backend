const jwt = require("jsonwebtoken");

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

// ✅ FIX 5: Enhanced middleware with proper error handling
const authMiddleware = (req, res, next) => {
  try {
    // ✅ FIX 4: Try both cookies and Authorization header
    const token = extractToken(req);

    console.log("👉 AUTH TOKEN CHECK:", token ? "✓ EXISTS" : "✗ MISSING");

    if (!token) {
      console.warn("⚠️ UNAUTHORIZED: No token found");
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "No token provided"
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error("⚠️ TOKEN VERIFICATION FAILED:", tokenError.message);
      return res.status(401).json({ 
        error: "Invalid token",
        message: tokenError.message
      });
    }

    // ✅ FIX 5: Set user on request object (CRITICAL - prevents crashes)
    req.user = decoded;
    console.log("✓ User authenticated:", decoded.id);

    next();
  } catch (error) {
    console.error("❌ AUTH MIDDLEWARE ERROR:", error.message);
    return res.status(401).json({ 
      error: "Authentication failed",
      message: error.message
    });
  }
};

// ✅ FIX 5: Verify user role with req.user validation
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Prevent crash if req.user is missing
    if (!req.user) {
      console.error("❌ AUTHORIZATION FAILED: req.user is missing");
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "User not authenticated"
      });
    }

    if (!req.user.role) {
      console.error("❌ AUTHORIZATION FAILED: req.user.role is missing");
      return res.status(403).json({ 
        error: "Forbidden",
        message: "User role not found"
      });
    }

    // Check if user has one of the required roles
    if (!roles.includes(req.user.role)) {
      console.warn(`⚠️ ACCESS DENIED: User role '${req.user.role}' not in allowed roles:`, roles);
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Insufficient permissions"
      });
    }
    
    next();
  };
};

module.exports = { authMiddleware, authorizeRoles, extractToken };