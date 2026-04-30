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
      enum: ["user", "admin"],
      default: "user"
    },
    roleString: {
      // Keep for backward compatibility
      type: String,
      enum: ["user", "admin", "recruiter"],
      default: "user"
    },
    permissions: [String], // Denormalized permissions for fast JWT encoding
    status: {
      type: String,
      default: "active",
      enum: ["active", "suspended", "banned"],
    },
    hasSubmittedApplication: {
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
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedAt: Date,
    bio: String,
    cvUrl: String,
    profile: {
      phone: String,
      location: String,
      skills: [String],
    },
    activationToken: String,
    activationExpires: Date,
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
