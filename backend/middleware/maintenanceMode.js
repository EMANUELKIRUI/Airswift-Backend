const jwt = require('jsonwebtoken');
const { getSettingByKey } = require('../services/settingsService');

const allowedPaths = [
  /^\/$/,
  /^\/api\/auth(\/|$)/,
  /^\/api\/admin\/login(\/|$)/,
  /^\/api\/system-health(\/|$)/,
  /^\/api\/health(\/|$)/,
  /^\/api\/auth-status(\/|$)/,
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
  if (allowedPaths.some((pattern) => pattern.test(req.path))) {
    return next();
  }

  try {
    const setting = await getSettingByKey('maintenance_mode');
    if (!setting || !(setting.value === true || setting.value === 'true')) {
      return next();
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(503).json({ message: 'Service temporarily unavailable due to maintenance.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (error) {
      // fall through to maintenance response
    }

    return res.status(503).json({ message: 'Service temporarily unavailable due to maintenance.' });
  } catch (error) {
    console.error('maintenanceMode error:', error);
    return next();
  }
};

module.exports = maintenanceMode;
