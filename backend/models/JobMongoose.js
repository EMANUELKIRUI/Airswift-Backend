const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "Full-time",
  },
  salaryMin: {
    type: Number,
  },
  salaryMax: {
    type: Number,
  },
  skills: [String],
  requiredExperience: {
    type: Number,
    default: 0,
  },
  requiredEducation: {
    type: String,
    default: '',
  },
  isRemote: {
    type: Boolean,
    default: false,
  },
  requirements: String,
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  expiryDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Add text index for smart search
jobSchema.index({
  title: "text",
  description: "text",
  skills: "text",
});

module.exports = mongoose.model("Job", jobSchema);