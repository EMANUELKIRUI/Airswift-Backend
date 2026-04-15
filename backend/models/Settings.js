const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  singleton: {
    type: Boolean,
    default: true,
    index: true,
  },
  platformName: { type: String, default: 'Talex' },
  currency: { type: String, default: 'USD' },
  maxJobsPerDay: { type: Number, default: 50 },
  maxApplicationsPerDay: { type: Number, default: 100 },
  companyEmail: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  emailNotifications: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  mpesaApiKey: { type: String, default: '' },
  paymentProvider: { type: String, default: '' },

  key: {
    type: String,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['general', 'security', 'email', 'payment', 'maintenance', 'features'],
    default: 'general'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true, strict: false });

// Update the updatedAt field on save
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
