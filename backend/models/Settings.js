const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  singleton: { type: Boolean, default: true, unique: true, sparse: true },
  platformName: { type: String, default: 'Talex' },
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
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
