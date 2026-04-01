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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Application;