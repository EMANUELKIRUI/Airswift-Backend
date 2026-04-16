const jwt = require("jsonwebtoken");
const { getPermissions } = require("../config/roles");

// ✅ Access token (short-lived - 15 minutes)
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign(
    {
      id: userId,
      role: user.role,
      permissions: getPermissions(user.role),
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// ✅ Refresh token (long-lived - 7 days)
const generateRefreshToken = (user) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET or REFRESH_TOKEN_SECRET is missing");
  }

  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign(
    {
      id: userId,
    },
    refreshSecret,
    { expiresIn: "7d" }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
