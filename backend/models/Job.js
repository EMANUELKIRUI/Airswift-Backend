const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  salary_min: {
    type: DataTypes.INTEGER,
  },
  salary_max: {
    type: DataTypes.INTEGER,
  },
  location: {
    type: DataTypes.STRING, // Canada province
  },
  requirements: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('active', 'closed'),
    defaultValue: 'active',
  },
  created_by: {
    type: DataTypes.INTEGER, // admin_id
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Job;