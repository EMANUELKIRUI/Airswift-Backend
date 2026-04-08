const Joi = require('joi');
const { Op } = require('sequelize');
const { Application, Job, Profile, Payment, User, Notification } = require('../models');
const { sendEmail, sendStageEmail } = require('../utils/notifications');
const { extractTextFromPDF, analyzeCV } = require('../utils/cvAnalyzer');
const { encryptCV, decryptCV } = require('../utils/cvEncryption');
const { logAuditEvent } = require('../utils/auditLogger');
const { emitApplicationStatusUpdate, emitApplicationPipelineUpdate } = require('../utils/socketEmitter');
const fs = require('fs').promises;

const isMongooseModel = User.prototype && typeof User.prototype.save === 'function';
const isSequelizeModel = User.prototype && typeof User.prototype.update === 'function';

// For document upload path building
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || '';


const applySchema = Joi.object({
  job_id: Joi.number().integer().required(),
  cover_letter: Joi.string(),
  phone: Joi.string().required(),
  national_id: Joi.string().required(),
});

const applyForJob = async (req, res) => {
  try {
    const job_id = req.body.job_id || req.body.jobId;
    const { cover_letter, phone, national_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ message: 'Please select a job' });
    }

    const { error } = applySchema.validate({ job_id, cover_letter });
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check if job exists and is active
    const job = await Job.findByPk(job_id);
    if (!job || job.status !== 'active') return res.status(404).json({ message: 'Job not found or inactive' });

    // Check if the user already applied to this job
    const existingApplication = await Application.findOne({ where: { job_id, user_id: req.user.id } });
    if (existingApplication) return res.status(400).json({ message: 'Already applied for this job' });

    if (!req.files?.cv?.[0] || !req.files?.nationalId?.[0] || !req.files?.passport?.[0]) {
      return res.status(400).json({ message: 'CV, National ID, and Passport files are required' });
    }

    const cvFile = req.files.cv[0];
    const nationalIdFile = req.files.nationalId[0];
    const passportFile = req.files.passport[0];

    const isRemoteUrl = (value) => typeof value === 'string' && /^(https?:)?\/\//.test(value);

    const cvUrl = cvFile.path;
    const nationalIdUrl = nationalIdFile.path;
    const passportUrl = passportFile.path;

    let encryptedCV = null;
    let encryptedNationalId = null;
    let encryptedPassport = null;

    try {
      if (!isRemoteUrl(cvFile.path) && cvFile.path) {
        const cvBuffer = await fs.readFile(cvFile.path);
        encryptedCV = encryptCV(cvBuffer).toString('base64');
      }
      if (!isRemoteUrl(nationalIdFile.path) && nationalIdFile.path) {
        const nationalIdBuffer = await fs.readFile(nationalIdFile.path);
        encryptedNationalId = encryptCV(nationalIdBuffer).toString('base64');
      }
      if (!isRemoteUrl(passportFile.path) && passportFile.path) {
        const passportBuffer = await fs.readFile(passportFile.path);
        encryptedPassport = encryptCV(passportBuffer).toString('base64');
      }
    } catch (encryptError) {
      console.error("File encryption failed:", encryptError);
      return res.status(500).json({ message: 'File encryption failed' });
    }

    const application = await Application.create({
      job_id,
      user_id: req.user.id,
      phone,
      national_id,
      cover_letter,
      cv_url: cvUrl,
      cv_path: cvUrl,
      national_id_url: nationalIdUrl,
      national_id_path: nationalIdUrl,
      passport_url: passportUrl,
      passport_path: passportUrl,
      cv: encryptedCV,
      nationalId: encryptedNationalId,
      passport: encryptedPassport,
    });

    // mark the current user as having submitted an application
    if (isMongooseModel) {
      await User.findByIdAndUpdate(req.user.id, { has_submitted: true, phone }, { new: true });
    } else if (isSequelizeModel) {
      await User.update({ has_submitted: true, phone }, { where: { id: req.user.id } });
    }

    // AI CV Analysis
    try {
      if (!isRemoteUrl(req.files.cv[0].path)) {
        const cvText = await extractTextFromPDF(req.files.cv[0].path);
        const jobDescription = job.description || job.title;
        const aiResult = await analyzeCV(cvText, jobDescription);

        // Use enhanced CV scoring if available
        try {
          const { scoreCV } = require('../utils/cvScorer');
          const scoreDetails = scoreCV(
            {
              skills: aiResult.skills || [],
              yearsOfExperience: 0, // Would need to extract from CV
              education: 'bachelor', // Would need to extract from CV
              text: cvText
            },
            {
              requiredSkills: job.required_skills || [],
              requiredExperience: job.experience_required || 0,
              requiredEducation: job.education_required || 'bachelor',
              description: jobDescription
            }
          );
          application.score = scoreDetails.totalScore;
          application.skills = scoreDetails.scores;
        } catch (scoringError) {
          // Fallback to basic scoring from AI
          application.score = aiResult.matchScore || 0;
          application.skills = aiResult.skills || [];
        }

        await application.save();
      }
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
      // Continue without AI analysis if it fails
    }

    // Emit Socket.io event for real-time tracking
    const { emitNewApplication } = require('../utils/socketEmitter');
    emitNewApplication({
      applicationId: application.id,
      applicantName: req.user.name || 'New Applicant',
      jobTitle: job.title,
      email: req.user.email,
      location: req.user.location || '',
      score: application.score || 0
    });

    // Log audit event
    await logAuditEvent(req.user.id, 'application_submitted', 'application', application.id, {
      job_id,
      job_title: job.title
    }, req);

    // Notify applicant with stage template
    await sendStageEmail('application_submitted', req.user.email || req.user.email, {
      name: req.user.name,
      jobTitle: job.title,
    });

    // Notify admin (placeholder)
    // sendEmail('admin@example.com', 'New Application', `New application for ${job.title}`);

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createApplication = async (req, res) => {
  try {
    const { jobId, nationalId, phone } = req.body;

    if (!jobId || !nationalId || !phone) {
      return res.status(400).json({ message: 'All fields required' });
    }

    if (!req.files?.passport?.[0] || !req.files?.cv?.[0]) {
      return res.status(400).json({ message: 'Passport & CV required' });
    }

    const existing = await Application.findOne({ where: { user_id: req.user.id, job_id: jobId } });
    if (existing) {
      return res.status(400).json({ message: 'Already applied' });
    }

    const application = await Application.create({
      user_id: req.user.id,
      job_id: jobId,
      national_id: nationalId,
      phone,
      passport_path: req.files.passport[0].path,
      cv_path: req.files.cv[0].path,
      status: 'pending',
    });

    if (isMongooseModel) {
      await User.findByIdAndUpdate(req.user.id, {
        has_submitted: true,
      });
    } else if (isSequelizeModel) {
      await User.update({ has_submitted: true }, { where: { id: req.user.id } });
    }

    await Notification.create({
      userId: req.user.id,
      title: 'New Application',
      message: 'A new user has applied',
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error('createApplication error:', err);
    res.status(500).json({ message: err.message });
  }
};

const getUserApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Job, attributes: ['title'] }],
      order: [['created_at', 'DESC']],
    });

    const formatted = applications.map((app) => ({
      job_id: app.Job ? { title: app.Job.title } : null,
      status: app.status,
    }));

    res.json({ applications: formatted });
  } catch (error) {
    console.error('getUserApplications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Job }],
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Download encrypted CV file (admin only)
const downloadCV = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const user = application.user_id ? await User.findById(application.user_id) : null;
    const applicantName = user?.name || 'applicant';
    const { fileType } = req.query; // 'cv', 'nationalId', 'passport'

    let encryptedData;
    let fileUrl;
    let filename;

    switch (fileType) {
      case 'cv':
        encryptedData = application.cv;
        fileUrl = application.cv_url;
        filename = `CV-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'nationalId':
        encryptedData = application.nationalId;
        fileUrl = application.national_id_url;
        filename = `NationalID-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'passport':
        encryptedData = application.passport;
        fileUrl = application.passport_url;
        filename = `Passport-${applicantName.replace(/\s+/g, '-')}.pdf`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    if (encryptedData) {
      const buffer = decryptCV(Buffer.from(encryptedData, 'base64'));
      await logAuditEvent(req.user.id, 'cv_download', 'application', application.id, {
        file_type: fileType,
        applicant_name: applicantName
      }, req);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    if (fileUrl) {
      await logAuditEvent(req.user.id, 'cv_download', 'application', application.id, {
        file_type: fileType,
        applicant_name: applicantName,
        file_url: fileUrl,
      }, req);

      return res.json({ url: fileUrl });
    }

    return res.status(404).json({ message: 'File not found' });
  } catch (error) {
    console.error('downloadCV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllApplicationsAdmin = async (req, res) => {
  try {
    const applications = await Application.findAll({ include: [{ model: Job }] });
    const userIds = [...new Set(applications.map((app) => app.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

    const formatted = applications.map((app) => ({
      ...app.toJSON(),
      applicant: userMap[app.user_id] || null,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'shortlisted', 'interview', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    // Get the current application to find old status
    const currentApp = await Application.findByPk(req.params.id);
    const oldStatus = currentApp?.status || 'pending';

    const [updated] = await Application.update({ status }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Application not found' });

    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }] });
    const user = application.user_id ? await User.findById(application.user_id) : null;

    // If hired, create visa fee payment
    if (status === 'hired') {
      const profile = await Profile.findOne({ where: { user_id: application.user_id } });
      if (profile && profile.phone_number) {
        await Payment.create({
          user_id: application.user_id,
          phone_number: profile.phone_number,
          amount: 30000,
          service_type: 'visa_fee',
        });
      }
    }

    // Notify user with template
    if (user) {
      const stageKey = status === 'rejected' ? 'application_rejected' : status === 'hired' ? 'visa_payment_received' : status === 'interview' ? 'interview_scheduled' : status === 'shortlisted' ? 'shortlisted' : 'application_submitted';
      await sendStageEmail(stageKey, user.email, {
        name: user.name,
        jobTitle: application.Job.title,
        scheduledDate: application.zoom_meet_url ? 'as scheduled' : undefined,
        meetingLink: application.zoom_meet_url,
      });
    }

    // Emit real-time Socket.io events
    emitApplicationStatusUpdate({
      applicationId: application.id,
      applicantName: user?.name || 'Applicant',
      jobTitle: application.Job?.title || 'Position',
      status: status,
      updatedBy: req.user.id,
      email: user?.email
    });

    // Emit pipeline update for drag & drop UI
    emitApplicationPipelineUpdate({
      applicationId: application.id,
      oldStatus: oldStatus,
      newStatus: status,
      applicantName: user?.name || 'Applicant'
    });

    res.json({ ...application.toJSON(), applicant: user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessageToApplicants = async (req, res) => {
  try {
    const schema = Joi.object({
      job_id: Joi.number().integer().required(),
      statuses: Joi.array().items(Joi.string().valid('pending', 'shortlisted', 'interview', 'rejected', 'hired')).optional(),
      subject: Joi.string().required(),
      message: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { job_id, statuses, subject, message } = req.body;

    const job = await Job.findByPk(job_id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const statusFilter = statuses && statuses.length ? statuses : ['shortlisted', 'interview', 'hired'];

    const applicants = await Application.findAll({
      where: {
        job_id,
        status: {
          [Op.in]: statusFilter,
        },
      },
    });

    if (!applicants.length) {
      return res.status(404).json({ message: 'No applicants found for selected status' });
    }

    const userIds = [...new Set(applicants.map((app) => app.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

    const sendPromises = applicants.map(async (application) => {
      const applicant = userMap[application.user_id];
      if (!applicant?.email) return { id: application.id, email: null };
      await sendEmail(applicant.email, subject, message);
      return { id: application.id, email: applicant.email };
    });

    const sentCampaign = await Promise.all(sendPromises);

    res.json({
      message: 'Messages dispatched successfully',
      job: { id: job.id, title: job.title },
      recipients: sentCampaign,
      total: sentCampaign.length,
    });
  } catch (error) {
    console.error('Error sending messages:', error);
    res.status(500).json({ message: 'Could not send messages to applicants' });
  }
};

const scheduleInterview = async (req, res) => {
  try {
    const { zoom_meet_url } = req.body;
    if (!zoom_meet_url) return res.status(400).json({ message: 'zoom_meet_url is required' });

    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }] });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    await application.update({ zoom_meet_url, status: 'interview' });

    const user = application.user_id ? await User.findById(application.user_id) : null;
    if (user && user.email) {
      await sendStageEmail('interview_scheduled', user.email, {
        name: user.name,
        jobTitle: application.Job.title,
        scheduledDate: 'as scheduled',
        meetingLink: zoom_meet_url,
      });
    }

    res.json({ message: 'Interview scheduled successfully', application });

    res.json({ message: 'Interview scheduled successfully', application });
  } catch (error) {
    console.error('scheduleInterview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markInterviewAttended = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.status !== 'interview') {
      return res.status(400).json({ message: 'Application must be in interview status to mark as attended' });
    }

    await application.update({ interview_attended: true });

    res.json({ message: 'Interview attendance recorded', application });
  } catch (error) {
    console.error('markInterviewAttended error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadApplicantDocs = async (req, res) => {
  try {
    const { application_id } = req.body;
    if (!application_id) return res.status(400).json({ message: 'application_id is required' });

    const application = await Application.findOne({ where: { id: application_id, user_id: req.user.id } });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const passportUrl = req.files?.passport?.[0] ? req.files.passport[0].path : application.passport || application.passport_url;
    const nationalIdUrl = req.files?.nationalId?.[0] ? req.files.nationalId[0].path : application.nationalId || application.national_id_url;
    const cvUrl = req.files?.cv?.[0] ? req.files.cv[0].path : application.cv || application.cv_url;
    const certificateUrls = req.files?.certificate ? req.files.certificate.map((f) => f.path) : application.certificate_urls;

    await application.update({
      passport: passportUrl,
      nationalId: nationalIdUrl,
      cv: cvUrl,
      passport_url: passportUrl,
      national_id_url: nationalIdUrl,
      cv_url: cvUrl,
      certificate_urls: certificateUrls,
    });

    res.json({ message: 'Documents uploaded successfully', application });
  } catch (error) {
    console.error('uploadApplicantDocs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createApplication,
  getUserApplications,
  applyForJob,
  getMyApplications,
  getAllApplicationsAdmin,
  downloadCV,
  updateApplicationStatus,
  sendMessageToApplicants,
  scheduleInterview,
  markInterviewAttended,
  uploadApplicantDocs,
};