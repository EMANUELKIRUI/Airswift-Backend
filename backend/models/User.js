const mongoose = require("mongoose");
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
      default: "user",
      enum: ["user", "admin", "recruiter"],
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
    draft: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Sequelize model for fallback (SQLite)
const UserSequelize = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'recruiter'),
    defaultValue: 'user',
  },
  has_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verificationToken: DataTypes.STRING,
  verificationTokenExpires: DataTypes.DATE,
  otp: DataTypes.STRING,
  otpExpires: DataTypes.DATE,
  resetToken: DataTypes.STRING,
  resetTokenExpiry: DataTypes.DATE,
  resetPasswordToken: DataTypes.STRING,
  resetPasswordExpire: DataTypes.DATE,
  refreshToken: DataTypes.STRING,
  authProvider: {
    type: DataTypes.STRING,
    defaultValue: 'local',
  },
  profilePicture: DataTypes.STRING,
  firebaseUid: DataTypes.STRING,
  phone: DataTypes.STRING,
  location: DataTypes.STRING,
  cv: DataTypes.STRING,
  skills: {
    type: DataTypes.TEXT, // Store as JSON string
    get() {
      const value = this.getDataValue('skills');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('skills', JSON.stringify(value));
    },
  },
  education: DataTypes.TEXT,
  experience: DataTypes.TEXT,
  draft: DataTypes.TEXT,
}, {
  timestamps: true,
});

// Export both models - use Mongoose if available, fallback to Sequelize
let UserModel;

try {
  // Try to use Mongoose model
  UserModel = mongoose.model('User', userSchema);
} catch (error) {
  console.warn('MongoDB not available, using Sequelize fallback for User model');
  UserModel = UserSequelize;
}

module.exports = UserModel;