const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InterviewParticipant = sequelize.define('InterviewParticipant', {
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
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('interviewer', 'candidate'),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

module.exports = InterviewParticipant;
