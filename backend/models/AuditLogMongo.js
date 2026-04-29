const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, // e.g. CREATE_APPLICATION
  resource: { type: String, required: true }, // e.g. APPLICATION
  description: { type: String, required: true },
  metadata: { type: Object }, // optional extra data
  ip_address: { type: String },
  ip: { type: String },
  user_agent: { type: String },
  userAgent: { type: String },
  method: { type: String },
  endpoint: { type: String },
  device: { type: String },
  location: { type: String, default: 'Kenya' },
  status: { type: String, enum: ['success', 'error', 'warning'], default: 'success' },
}, {
  timestamps: true,
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
