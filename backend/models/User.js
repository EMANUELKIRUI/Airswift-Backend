const mongoose = require("mongoose");

// Mongoose schema for production (MongoDB Atlas)
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
      enum: ["user", "admin", "recruiter"],
      default: "user"
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "suspended", "banned"],
    },
    has_submitted: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    otp: String,
    otpExpires: Date,
    resendCount: {
      type: Number,
      default: 0,
    },
    lastOtpSentAt: Date,
    lastOtpSent: Date,
    resetToken: String,
    resetTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: String,
    lastIP: String,
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
    draft: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
