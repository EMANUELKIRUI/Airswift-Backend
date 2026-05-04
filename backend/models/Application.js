const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
    field: 'userId'
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Jobs',
      key: 'id',
    },
    field: 'jobId'
  },
  status: {
    type: DataTypes.ENUM('applied', 'reviewed', 'rejected', 'accepted'),
    defaultValue: 'applied',
  },
}, {
  timestamps: true,
  underscored: false,
});

module.exports = Application;
