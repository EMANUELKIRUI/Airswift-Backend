const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Mongoose schema for production (MongoDB Atlas)
const settingsSchema = new mongoose.Schema({
  singleton: { type: Boolean, default: true, unique: true, sparse: true },
  platformName: { type: String, default: 'Airswift' },
  currency: { type: String, default: 'USD' },
  maxJobsPerDay: { type: Number, default: 50 },
  maxApplicationsPerDay: { type: Number, default: 100 },

  companyEmail: String,
  companyPhone: String,

  termsUrl: String,
  privacyUrl: String,

  paymentApiKey: String,

  emailNotifications: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

// Sequelize model for fallback (SQLite)
const SettingsSequelize = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  platformName: { type: DataTypes.STRING, defaultValue: 'Airswift' },
  currency: { type: DataTypes.STRING, defaultValue: 'USD' },
  maxJobsPerDay: { type: DataTypes.INTEGER, defaultValue: 50 },
  maxApplicationsPerDay: { type: DataTypes.INTEGER, defaultValue: 100 },
  companyEmail: DataTypes.STRING,
  companyPhone: DataTypes.STRING,
  termsUrl: DataTypes.STRING,
  privacyUrl: DataTypes.STRING,
  paymentApiKey: DataTypes.STRING,
  emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
  maintenanceMode: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

// File-based storage as last resort
class FileSettings {
  constructor() {
    this.filePath = path.join(process.cwd(), 'settings.json');
    this.cache = null;
  }

  async load() {
    if (this.cache) return this.cache;
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      this.cache = JSON.parse(data);
      return this.cache;
    } catch (error) {
      // Default settings
      this.cache = {
        platformName: 'Airswift',
        currency: 'USD',
        maxJobsPerDay: 50,
        maxApplicationsPerDay: 100,
        emailNotifications: true,
        maintenanceMode: false
      };
      return this.cache;
    }
  }

  async save(settings) {
    try {
      this.cache = { ...this.cache, ...settings };
      await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2));
      return this.cache;
    } catch (error) {
      console.error('Failed to save settings to file:', error);
      throw error;
    }
  }

  async findOne() {
    return await this.load();
  }

  async create(data) {
    const current = await this.load();
    const newSettings = { ...current, ...data };
    return await this.save(newSettings);
  }

  async update(data) {
    return await this.save(data);
  }
}

const fileSettings = new FileSettings();

// Export based on connection
const getSettingsModel = () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.model('Settings', settingsSchema);
  } else {
    // Try Sequelize, fallback to file
    try {
      sequelize.authenticate();
      return SettingsSequelize;
    } catch (error) {
      console.warn('Database not available, using file-based settings');
      return fileSettings;
    }
  }
};

module.exports = {
  Mongoose: mongoose.model('Settings', settingsSchema),
  Sequelize: SettingsSequelize,
  File: fileSettings,
  getModel: getSettingsModel
};
