const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    type: {
      type: String,
      enum: ['ban', 'suspend', 'welcome', 'other'],
      default: 'other',
    },
    error: { type: String },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);
