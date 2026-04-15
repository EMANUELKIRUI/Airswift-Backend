const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    nationalId: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    passport: {
      type: String,
      required: true,
    },
    cv: {
      type: String,
      required: true,
    },
    coverLetter: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending'
    },

    timeline: [
      {
        status: String,
        date: { type: Date, default: Date.now }
      }
    ],
    aiScore: {
      type: Number,
      default: 0,
    },
    resumeSnapshot: {
      type: String,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
    },
    notes: {
      type: String,
    },
    resumeVersion: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', applicationSchema);
