const Joi = require('joi');
const mongoose = require('mongoose');
const Application = require('../models/ApplicationMongoose');
const Job = require('../models/JobMongoose');
const User = require('../models/User');
const { emitNewApplication, emitApplicationStatusUpdate } = require('../utils/socketEmitter');
const { logAction } = require('../utils/auditLogger');

const STATUS_FLOW = {
  pending: 'reviewed',
  reviewed: 'accepted',
};

const applyJobSchema = Joi.object({
  jobId: Joi.string().required(),
  nationalId: Joi.string().required(),
  phone: Joi.string().required(),
  passport: Joi.string().required(),
  cv: Joi.string().required(),
  coverLetter: Joi.string().allow(''),
  resumeSnapshot: Joi.string().allow(''),
});

const applyJob = async (req, res) => {
  try {
    // 🔍 DEBUG: Log incoming request body
    console.log('APPLICATION BODY:', req.body);
    console.log('APPLICATION FILES:', req.files);
    console.log('APPLICATION USER:', req.user);

    let { jobId, nationalId, phone, passport, cv, coverLetter, resumeSnapshot } = req.body;

    // If files are uploaded, use file paths
    if (req.files) {
      if (req.files.cv && req.files.cv[0]) cv = req.files.cv[0].path;
      if (req.files.passport && req.files.passport[0]) passport = req.files.passport[0].path;
      if (req.files.nationalId && req.files.nationalId[0]) nationalId = req.files.nationalId[0].path;
    }

    const { error } = applyJobSchema.validate({ jobId, nationalId, phone, passport, cv, coverLetter, resumeSnapshot });
    
    if (error) {
      console.error('VALIDATION ERROR:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    // 🔴 VALIDATION: Check all required fields
    if (!jobId || !nationalId || !phone || !passport || !cv) {
      const missing = [];
      if (!jobId) missing.push('jobId');
      if (!nationalId) missing.push('nationalId');
      if (!phone) missing.push('phone');
      if (!passport) missing.push('passport');
      if (!cv) missing.push('cv');
      console.error('MISSING FIELDS:', missing);
      return res.status(400).json({ message: `All fields are required: ${missing.join(', ')}` });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    console.log('VALIDATING JOB:', jobId);
    const job = await Job.findById(jobId);
    if (!job) {
      console.error('JOB NOT FOUND:', jobId);
      return res.status(404).json({ message: 'Job not found' });
    }

    console.log('CHECKING EXISTING APPLICATION:', { userId: req.user.id, jobId });
    const existingApplication = await Application.findOne({ userId: req.user.id, jobId });
    if (existingApplication) {
      console.warn('DUPLICATE APPLICATION:', { userId: req.user.id, jobId });
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    const aiScore = calculateAIScore(req.user, job);

    console.log('CREATING APPLICATION:', {
      userId: req.user.id,
      jobId,
      nationalId,
      phone,
      passport: passport.substring(0, 50) + '...',
      cv: cv.substring(0, 50) + '...',
    });

    const application = await Application.create({
      userId: req.user.id,
      jobId,
      nationalId,
      phone,
      passport,
      cv,
      coverLetter,
      status: 'pending',
      aiScore,
      resumeSnapshot: resumeSnapshot || cv || req.user.cv || '',
      timeline: [
        {
          status: 'Application Submitted',
          date: new Date(),
        },
      ],
    });

    console.log('APPLICATION CREATED SUCCESSFULLY:', application._id);

    emitNewApplication({
      id: application._id,
      applicantName: req.user.name || 'Applicant',
      jobTitle: job.title,
      email: req.user.email,
      location: req.user.location || '',
      score: aiScore,
      userId: req.user.id // 🔥 Add userId for user-specific room
    });

    // Audit log
    const logAction = require('../utils/auditLogger');
    await logAction({
      userId: req.user.id,
      action: "CREATE_APPLICATION",
      resource: "APPLICATION",
      description: `User submitted application for job: ${job.title}`,
      metadata: { jobId: job._id, applicationId: application._id }
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (err) {
    console.error('applyJob error:', err);
    res.status(500).json({ message: 'Failed to submit application', error: err.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const validStatuses = [
      'pending',
      'reviewed',
      'shortlisted',
      'accepted',
      'rejected',
    ];

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await Application.findById(id).populate('userId jobId');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Map status to timeline message
    const timelineMessages = {
      'pending': 'Application Submitted',
      'reviewed': 'Under Review',
      'shortlisted': 'Shortlisted',
      'accepted': 'Accepted',
      'rejected': 'Rejected'
    };

    application.applicationStatus = status;
    application.timeline.push({
      status: timelineMessages[status] || status,
      date: new Date(),
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
      userId: application.userId?._id || application.userId // 🔥 Add userId for user-specific room
    });

    // 🔥 Audit log for status update
    const logAction = require('../utils/auditLogger');
    await logAction({
      userId: req.user.id,
      action: "UPDATE_APPLICATION",
      resource: "APPLICATION",
      description: `Application status updated to: ${status}`,
      metadata: { applicationId: application._id, previousStatus: application.status, newStatus: status }
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

const downloadFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    const application = await Application.findById(id).populate('userId', 'name');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    let filePath;
    let filename;

    const applicantName = application.userId?.name || 'applicant';

    switch (fileType) {
      case 'cv':
        filePath = application.cv;
        filename = `CV-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'passport':
        filePath = application.passport;
        filename = `Passport-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'nationalId':
        filePath = application.nationalId;
        filename = `NationalID-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    if (!filePath) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.download(filePath, filename);
  } catch (err) {
    console.error('downloadFile error:', err);
    res.status(500).json({ message: err.message });
  }
};

const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, location, mode } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const application = await Application.findById(id).populate('userId jobId');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Update interview details
    application.interview = {
      scheduled: true,
      date: new Date(date),
      location,
      mode: mode || 'online'
    };

    // Add timeline entry
    application.timeline.push({
      status: 'Interview Scheduled',
      date: new Date(),
    });

    application.updatedAt = Date.now();
    await application.save();

    // Emit socket event
    emitApplicationStatusUpdate({
      id: application._id,
      applicantName: application.userId?.name || 'Applicant',
      jobTitle: application.jobId?.title || '',
      status: 'Interview Scheduled',
      updatedBy: req.user.name || 'Admin',
      email: application.userId?.email,
      userId: application.userId?._id || application.userId
    });

    // Audit log
    const logAction = require('../utils/auditLogger');
    await logAction({
      userId: req.user.id,
      action: "SCHEDULE_INTERVIEW",
      resource: "APPLICATION",
      description: `Interview scheduled for application`,
      metadata: { applicationId: application._id, interviewDate: date, location, mode }
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error('scheduleInterview error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  STATUS_FLOW,
  applyJob,
  updateApplicationStatus,
  getUserApplications,
  getAllApplications,
  getApplicationAnalytics,
  calculateAIScore,
  downloadFile,
  scheduleInterview,
};
