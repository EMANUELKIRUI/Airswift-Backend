const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');

const allowedPaths = [
  /^\/$/,
  /^\/api\/auth(\/|$)/,
  /^\/api\/admin\/login(\/|$)/,
  /^\/api\/system-health(\/|$)/,
  /^\/api\/health(\/|$)/,
  /^\/api\/auth-status(\/|$)/,
  /^\/api\/settings\/public(\/|$)/,
  /^\/api\/settings\/feature-flags(\/|$)/,
];

const extractToken = (req) => {
  let token = req.cookies?.accessToken || null;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  return token;
};

const maintenanceMode = async (req, res, next) => {
  // Skip maintenance check for allowed paths
  if (allowedPaths.some((pattern) => pattern.test(req.path))) {
    return next();
  }

  try {
    const singletonSettings = await Settings.findOne({ singleton: true });
    const maintenanceEnabled = singletonSettings ? singletonSettings.maintenanceMode : undefined;
    if (maintenanceEnabled === undefined) {
      const setting = await Settings.findOne({ key: 'maintenance_mode' });
      if (!setting || !(setting.value === true || setting.value === 'true')) {
        return next();
      }
    } else if (!maintenanceEnabled) {
      return next();
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(503).json({
        message: 'Service temporarily unavailable due to maintenance.',
        maintenance: true
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (error) {
      // Token invalid, fall through to maintenance response
    }

    return res.status(503).json({
      message: 'Service temporarily unavailable due to maintenance.',
      maintenance: true
    });
  } catch (error) {
    console.error('maintenanceMode error:', error);
    // On error, allow request to continue to avoid blocking the app
    return next();
  }
};

module.exports = maintenanceMode;
