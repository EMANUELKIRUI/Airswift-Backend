const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, // e.g. CREATE_APPLICATION
  resource: { type: String, required: true }, // e.g. APPLICATION
  description: { type: String, required: true },

  metadata: Object, // optional extra data

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
