const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false // Allow null for anonymous actions
  },
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    required: false
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    required: true
  },
  ip_address: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: "Kenya"
  },
  status: {
    type: String,
    enum: ['success', 'error', 'warning'],
    default: 'success'
  }
}, {
  timestamps: { createdAt: "created_at" }
});

// Virtuals
auditLogSchema.virtual('entityDetails', {
  ref: 'SomeModel',
  localField: 'entity',
  foreignField: '_id',
  justOne: true
});

// Indexes for performance
auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ entity: 1 });
auditLogSchema.index({ entity_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ status: 1 });

auditLogSchema.virtual('userId').get(function () {
  return this.user_id;
});
auditLogSchema.virtual('entity').get(function () {
  return this.entity;
});
auditLogSchema.virtual('entityId').get(function () {
  return this.entity_id;
});
auditLogSchema.virtual('details').get(function () {
  return this.details;
});
auditLogSchema.virtual('ipAddress').get(function () {
  return this.ip_address;
});
auditLogSchema.virtual('userAgent').get(function () {
  return this.user_agent;
});
auditLogSchema.virtual('createdAt').get(function () {
  return this.created_at;
});

auditLogSchema.set('toJSON', { virtuals: true });
auditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
