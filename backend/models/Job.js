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
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'JobCategories',
      key: 'id',
    },
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
  expiry_date: {
    type: DataTypes.DATE,
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