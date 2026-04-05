const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Profile = sequelize.define('Profile', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  skills: {
    type: DataTypes.JSON,
  },
  experience: {
    type: DataTypes.TEXT,
  },
  education: {
    type: DataTypes.TEXT,
  },
  cv_url: {
    type: DataTypes.STRING,
  },
  phone_number: {
    type: DataTypes.STRING,
  },
});

module.exports = Profile;