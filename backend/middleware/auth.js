const jwt = require('jsonwebtoken');

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