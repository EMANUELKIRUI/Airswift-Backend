const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "recruiter"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    otp: String,
    otpExpires: Date,
    resetToken: String,
    resetTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: String,
    authProvider: {
      type: String,
      default: "local",
    },
    profilePicture: String,
    firebaseUid: String,
    phone: String,
    location: String,
    cv: String,
    skills: [String],
    education: String,
    experience: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);