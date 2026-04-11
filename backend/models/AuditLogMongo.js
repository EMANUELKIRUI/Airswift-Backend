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
  description: {
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

// Indexes for performance
auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ status: 1 });

auditLogSchema.virtual('userId').get(function () {
  return this.user_id;
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
