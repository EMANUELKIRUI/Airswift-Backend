const Joi = require('joi');
const mongoose = require('mongoose');
const Application = require('../models/ApplicationMongoose');
const Job = require('../models/JobMongoose');
const User = require('../models/User');
const { emitNewApplication, emitApplicationStatusUpdate } = require('../utils/socketEmitter');

const STATUS_FLOW = {
  Submitted: 'Under Review',
  'Under Review': 'Shortlisted',
  Shortlisted: 'Interview Scheduled',
  'Interview Scheduled': 'Hired',
};

const applyJobSchema = Joi.object({
  jobId: Joi.string().required(),
  coverLetter: Joi.string().allow(''),
  resumeSnapshot: Joi.string().allow(''),
});

const applyJob = async (req, res) => {
  try {
    const { jobId, coverLetter, resumeSnapshot } = req.body;
    const { error } = applyJobSchema.validate({ jobId, coverLetter, resumeSnapshot });
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const existingApplication = await Application.findOne({ userId: req.user.id, jobId });
    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied' });
    }

    const aiScore = calculateAIScore(req.user, job);

    const application = await Application.create({
      userId: req.user.id,
      jobId,
      coverLetter,
      status: 'Submitted',
      aiScore,
      resumeSnapshot: resumeSnapshot || req.user.cv || '',
      statusHistory: [
        {
          status: 'Submitted',
          changedBy: req.user.id,
          note: 'Application submitted',
        },
      ],
    });

    emitNewApplication({
      id: application._id,
      applicantName: req.user.name || 'Applicant',
      jobTitle: job.title,
      email: req.user.email,
      location: req.user.location || '',
      score: aiScore,
    });

    res.status(201).json({ success: true, application });
  } catch (err) {
    console.error('applyJob error:', err);
    res.status(500).json({ error: err.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const validStatuses = [
      'Submitted',
      'Under Review',
      'Shortlisted',
      'Interview Scheduled',
      'Hired',
      'Rejected',
    ];

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await Application.findById(id).populate('userId jobId');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = status;
    application.statusHistory.push({
      status,
      changedBy: req.user.id,
      note: `Status set to ${status}`,
    });
    application.updatedAt = Date.now();
    await application.save();

    emitApplicationStatusUpdate({
      id: application._id,
      applicantName: application.userId?.name || 'Applicant',
      jobTitle: application.jobId?.title || '',
      status,
      updatedBy: req.user.name || 'Admin',
      email: application.userId?.email,
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getUserApplications = async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id })
      .populate('jobId')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('getUserApplications error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('userId jobId')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('getAllApplications error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getApplicationAnalytics = async (req, res) => {
  try {
    const data = await Application.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const dayNames = [
      null,
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const analytics = data.map((item) => ({
      dayOfWeek: item._id,
      day: dayNames[item._id] || 'Unknown',
      count: item.count,
    }));

    res.json(analytics);
  } catch (err) {
    console.error('getApplicationAnalytics error:', err);
    res.status(500).json({ error: err.message });
  }
};

const calculateAIScore = (user, job) => {
  let score = 0;
  const userSkills = Array.isArray(user.skills) ? user.skills : [];
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];

  const matchedSkills = jobSkills.filter((skill) =>
    userSkills.some((userSkill) =>
      userSkill.toLowerCase() === skill.toLowerCase() ||
      userSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(userSkill.toLowerCase())
    )
  ).length;

  score += matchedSkills * 15;

  const userExperienceYears = parseExperienceYears(user.experience);
  const requiredExperience = Number(job.requiredExperience || 0);
  if (requiredExperience && userExperienceYears >= requiredExperience) {
    score += 20;
  }

  if (user.location && job.location && user.location.toLowerCase() === job.location.toLowerCase()) {
    score += 10;
  }

  return Math.min(score, 100);
};

const parseExperienceYears = (experience) => {
  if (!experience) return 0;
  const match = String(experience).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

module.exports = {
  STATUS_FLOW,
  applyJob,
  updateApplicationStatus,
  getUserApplications,
  getAllApplications,
  getApplicationAnalytics,
  calculateAIScore,
};
