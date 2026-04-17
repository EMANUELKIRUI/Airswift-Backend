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
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [[
        'pending',
        'approved',
        'rejected'
      ]]
    }
  },
  documentsVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  phone: {
    type: DataTypes.STRING,
  },
  national_id: {
    type: DataTypes.STRING,
  },
  cv_path: {
    type: DataTypes.STRING,
  },
  passport_path: {
    type: DataTypes.STRING,
  },
  national_id_path: {
    type: DataTypes.STRING,
  },
  cover_letter: {
    type: DataTypes.TEXT,
  },
  cv_url: {
    type: DataTypes.STRING,
  },
  cvUrl: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('cv_url');
    },
    set(value) {
      this.setDataValue('cv_url', value);
    },
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
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
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
}, {
  timestamps: true,
  underscored: true, // 🔥 THIS FIXES IT
});

module.exports = Application;