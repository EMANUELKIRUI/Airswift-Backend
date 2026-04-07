const jwt = require("jsonwebtoken");

// Safety checks for required environment variables
if (!process.env.JWT_SECRET && !process.env.JWT_ACCESS_SECRET) {
  throw new Error("JWT_SECRET or JWT_ACCESS_SECRET is missing");
}

if (!process.env.JWT_REFRESH_SECRET && !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error("JWT_REFRESH_SECRET or REFRESH_TOKEN_SECRET is missing");
}

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
