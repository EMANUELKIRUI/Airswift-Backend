const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      // e.g. "manage_users", "edit_templates", "view_dashboard", "apply_jobs"
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['user', 'admin', 'recruiter', 'system'],
      default: 'user',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
