const jwt = require("jsonwebtoken");

// ✅ FIX 4: Extract token from cookies, headers, body, or query string
const extractToken = (req) => {
  if (!req) return null;

  const cookieToken = req.cookies?.accessToken || req.cookies?.token || req.cookies?.authToken || null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization || null;
  const headerToken = authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const fallbackHeader = req.headers?.['x-access-token'] || req.headers?.['x-auth-token'] || null;
  const bodyToken = req.body?.accessToken || req.body?.token || req.body?.authToken || null;
  const queryToken = req.query?.accessToken || req.query?.token || req.query?.authToken || null;

  const token = cookieToken || headerToken || fallbackHeader || bodyToken || queryToken;

  if (cookieToken) {
    console.log("👉 TOKEN from cookies: EXISTS");
  } else if (headerToken) {
    console.log("👉 TOKEN from Authorization header: EXISTS");
  } else if (fallbackHeader) {
    console.log("👉 TOKEN from x-access-token/x-auth-token: EXISTS");
  } else if (bodyToken) {
    console.log("👉 TOKEN from request body: EXISTS");
  } else if (queryToken) {
    console.log("👉 TOKEN from query string: EXISTS");
  } else {
    console.log("👉 TOKEN not found in request");
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