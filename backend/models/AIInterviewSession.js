const mongoose = require('mongoose');

const aiInterviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    transcript: {
      type: String,
      default: null,
    },
    score: {
      communication: {
        type: Number,
        default: null,
      },
      technical: {
        type: Number,
        default: null,
      },
      confidence: {
        type: Number,
        default: null,
      },
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIInterviewSession', aiInterviewSchema);
