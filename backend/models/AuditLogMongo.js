const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, // e.g. CREATE_APPLICATION
  resource: { type: String, required: true }, // e.g. APPLICATION
  description: { type: String, required: true },
  metadata: { type: Object }, // optional extra data
}, {
  timestamps: true,
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
