const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  isVerified: { type: Boolean, default: false },
  otpExpires: Date,
  resetToken: String,
  resetTokenExpire: Date,
  refreshToken: String,
  role: { type: String, default: "user" }
});

module.exports = mongoose.model("User", UserSchema);