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
      total: {
        type: Number,
        default: 0,
      },
      skills: {
        type: Number,
        default: 0,
      },
      experience: {
        type: Number,
        default: 0,
      },
      communication: {
        type: Number,
        default: 0,
      },
    },
    rank: {
      type: Number,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
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
    score: {
      type: Number,
      default: 0,
    },
    skills: [String],
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'interview', 'hired', 'rejected'],
      default: 'pending',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedAt: Date,
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient ranking queries
applicationSchema.index({ jobId: 1, 'aiScore.total': -1 });
applicationSchema.index({ rank: 1 });


module.exports = mongoose.model('Application', applicationSchema);
