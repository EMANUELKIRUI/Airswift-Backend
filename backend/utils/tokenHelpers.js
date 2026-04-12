const jwt = require("jsonwebtoken");

// ✅ Access token
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign(
    {
      id: userId,
      role: user.role, // IMPORTANT
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// ✅ Refresh token
const generateRefreshToken = (user) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET or REFRESH_TOKEN_SECRET is missing");
  }

  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign(
    {
      id: userId,
      role: user.role, // IMPORTANT
    },
    refreshSecret,
    { expiresIn: "7d" }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
