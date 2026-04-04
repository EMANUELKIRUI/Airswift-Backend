const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
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
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  otp: {
    type: DataTypes.STRING,
  },
  otpExpires: {
    type: DataTypes.DATE,
  },
  resetToken: {
    type: DataTypes.STRING,
  },
  resetTokenExpires: {
    type: DataTypes.DATE,
  },
  refreshToken: {
    type: DataTypes.STRING,
  },
  authProvider: {
    type: DataTypes.STRING,
    defaultValue: 'local',
  },
  profilePicture: {
    type: DataTypes.STRING,
  },
  firebaseUid: {
    type: DataTypes.STRING,
  },
  googleId: {
    type: DataTypes.STRING,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = User;