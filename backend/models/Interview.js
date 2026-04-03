const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Applications',
      key: 'id',
    },
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  meeting_link: {
    type: DataTypes.STRING,
  },
  attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  decision: {
    type: DataTypes.ENUM('pending', 'hired', 'rejected'),
    defaultValue: 'pending',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Interview;