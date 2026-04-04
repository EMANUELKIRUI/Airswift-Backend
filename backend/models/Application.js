const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Jobs',
      key: 'id',
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'shortlisted', 'interview', 'rejected', 'hired'),
    defaultValue: 'pending',
  },
  cover_letter: {
    type: DataTypes.TEXT,
  },
  cv_url: {
    type: DataTypes.STRING,
  },
  cv: {
    type: DataTypes.STRING,
  },
  passport_url: {
    type: DataTypes.STRING,
  },
  passport: {
    type: DataTypes.STRING,
  },
  national_id_url: {
    type: DataTypes.STRING,
  },
  nationalId: {
    type: DataTypes.STRING,
  },
  certificate_urls: {
    type: DataTypes.JSON,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  skills: {
    type: DataTypes.JSON,
  },
  zoom_meet_url: {
    type: DataTypes.STRING,
  },
  interview_attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Application;