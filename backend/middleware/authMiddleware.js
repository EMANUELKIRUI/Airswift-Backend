const jwt = require("jsonwebtoken");
const User = require('../models/User');

const normalizeToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  let normalized = token.trim();

  if (/^Bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^Bearer\s+/i, '').trim();
  }

  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
};

const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const parsed = {};

  cookies.forEach((cookie) => {
    const [name, ...valueParts] = cookie.split('=');
    if (!name || !valueParts.length) return;
    parsed[name] = valueParts.join('=').trim();
  });

  return parsed.accessToken || parsed.token || parsed.authToken || null;
};

// ✅ FIX 4: Extract token from cookies, headers, body, or query string
const extractToken = (req) => {
  if (!req) return null;

  const cookieToken = normalizeToken(req.cookies?.accessToken || req.cookies?.token || req.cookies?.authToken || null);
  const authHeader = req.headers?.authorization || req.headers?.Authorization || null;
  const headerToken = normalizeToken(authHeader);
  const fallbackHeader = normalizeToken(req.headers?.['x-access-token'] || req.headers?.['x-auth-token'] || null);
  const bodyToken = normalizeToken(req.body?.accessToken || req.body?.token || req.body?.authToken || null);
  const queryToken = normalizeToken(req.query?.accessToken || req.query?.token || req.query?.authToken || null);
  const rawCookieToken = normalizeToken(parseCookieHeader(req.headers?.cookie));

  const token = cookieToken || headerToken || fallbackHeader || bodyToken || queryToken || rawCookieToken;

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
  } else if (rawCookieToken) {
    console.log("👉 TOKEN from raw Cookie header: EXISTS");
  } else {
    console.log("👉 TOKEN not found in request");
  }

  return token;
};

// ✅ FIX 5: Enhanced middleware with proper error handling
const authMiddleware = (req, res, next) => {
  (async () => {
    try {
      const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "No token" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔥 IMPORTANT: fetch full user
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;

      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  })().catch(next);
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