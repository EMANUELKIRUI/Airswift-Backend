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
  interviewer_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  type: {
    type: DataTypes.ENUM('video', 'voice_ai', 'in_person'),
    defaultValue: 'video',
  },
  mode: {
    type: DataTypes.ENUM('online', 'in_person', 'hybrid'),
    defaultValue: 'online',
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
  },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'UTC',
  },
  meeting_link: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'),
    defaultValue: 'scheduled',
  },
  cancel_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rescheduled_from: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reminder_24h_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  reminder_1h_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
    type: DataTypes.JSON,
    allowNull: true,
  },
  ai_responses: {
    type: DataTypes.JSON,
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