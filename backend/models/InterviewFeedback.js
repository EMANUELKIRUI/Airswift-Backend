const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InterviewFeedback = sequelize.define('InterviewFeedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  interview_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Interviews',
      key: 'id',
    },
  },
  interviewer_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

module.exports = InterviewFeedback;
