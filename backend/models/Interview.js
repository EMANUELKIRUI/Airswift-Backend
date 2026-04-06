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
  interviewer_id: {
    type: DataTypes.STRING,
    allowNull: true, // Admin who conducts interview
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  room_id: {
    type: DataTypes.STRING,
    allowNull: false, // Unique room identifier
  },
  type: {
    type: DataTypes.ENUM('video', 'voice_ai'),
    defaultValue: 'video',
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'scheduled',
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ai_questions: {
    type: DataTypes.JSON, // Array of AI-generated questions
    allowNull: true,
  },
  ai_responses: {
    type: DataTypes.JSON, // Candidate responses
    allowNull: true,
  },
  ai_score: {
    type: DataTypes.INTEGER, // AI-generated score 0-100
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recording_url: {
    type: DataTypes.STRING, // If interview is recorded
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Interview;