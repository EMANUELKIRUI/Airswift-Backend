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
    applicationStatus: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected"],
      default: "pending"
    },
    interview: {
      scheduled: { type: Boolean, default: false },
      date: Date,
      location: String,
      mode: String // "online" | "physical"
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
