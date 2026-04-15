const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: String,
  description: {
    type: String,
    required: true,
  },
}, {
  timestamps: { createdAt: "created_at" }
});

// Virtuals
auditSchema.virtual('entityDetails', {
  refPath: 'entity',
  localField: 'entity_id',
  foreignField: '_id',
  justOne: true
});

// Indexes for performance
auditSchema.index({ user_id: 1 });
auditSchema.index({ entity: 1 });
auditSchema.index({ entity_id: 1 });
auditSchema.index({ action: 1 });
auditSchema.index({ created_at: -1 });

module.exports = mongoose.model("AuditLog", auditSchema);
