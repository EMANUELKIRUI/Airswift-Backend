const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: ['admin', 'user', 'recruiter'],
      // admin - System Administrator
      // user - Regular User (Job Applicant)
      // recruiter - Recruiter
    },
    description: {
      type: String,
      default: '',
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster role lookups
roleSchema.index({ name: 1 });

module.exports = mongoose.model('Role', roleSchema);
