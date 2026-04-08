const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    interview_date: {
      type: Date,
      default: null,
    },
    interview_time: {
      type: String,
      default: null,
    },
    attachment_path: {
      type: String,
      default: null,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    applicationId: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Message', messageSchema);
