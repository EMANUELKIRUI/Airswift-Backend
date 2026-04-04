const Joi = require('joi');
const { Op } = require('sequelize');
const { Application, Job, Profile, Payment, User } = require('../models');
const { sendEmail, sendStageEmail } = require('../utils/notifications');
const { extractTextFromPDF, analyzeCV } = require('../utils/cvAnalyzer');
const { encryptCV, decryptCV } = require('../utils/cvEncryption');
const { logAuditEvent } = require('../utils/auditLogger');
const fs = require('fs').promises;

// For document upload path building
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || '';


const applySchema = Joi.object({
  job_id: Joi.number().integer().required(),
  cover_letter: Joi.string(),
});

const applyForJob = async (req, res) => {
  try {
    const job_id = req.body.job_id || req.body.jobId;
    const { cover_letter } = req.body;

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

    // Encrypt CV files before storing
    let encryptedCV = null;
    let encryptedNationalId = null;
    let encryptedPassport = null;

    try {
      if (req.files.cv && req.files.cv[0]) {
        const cvBuffer = await fs.readFile(req.files.cv[0].path);
        encryptedCV = encryptCV(cvBuffer);
      }
      if (req.files.nationalId && req.files.nationalId[0]) {
        const nationalIdBuffer = await fs.readFile(req.files.nationalId[0].path);
        encryptedNationalId = encryptCV(nationalIdBuffer);
      }
      if (req.files.passport && req.files.passport[0]) {
        const passportBuffer = await fs.readFile(req.files.passport[0].path);
        encryptedPassport = encryptCV(passportBuffer);
      }
    } catch (encryptError) {
      console.error("File encryption failed:", encryptError);
      return res.status(500).json({ message: 'File encryption failed' });
    }

    const application = await Application.create({
      job_id,
      user_id: req.user.id,
      cover_letter,
      cv: encryptedCV, // Store encrypted data
      nationalId: encryptedNationalId,
      passport: encryptedPassport,
    });

    // AI CV Analysis
    try {
      const cvText = await extractTextFromPDF(req.files.cv[0].path);
      const jobDescription = job.description || job.title; // Use job description or title as fallback
      const aiResult = await analyzeCV(cvText, jobDescription);

      application.score = aiResult.matchScore || 0;
      application.skills = aiResult.skills || [];
      await application.save();
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
      // Continue without AI analysis if it fails
    }

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
    const application = await Application.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const { fileType } = req.query; // 'cv', 'nationalId', 'passport'
    let encryptedData;
    let filename;

    switch (fileType) {
      case 'cv':
        encryptedData = application.cv;
        filename = `CV-${application.User.name.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'nationalId':
        encryptedData = application.nationalId;
        filename = `NationalID-${application.User.name.replace(/\s+/g, '-')}.pdf`;
        break;
      case 'passport':
        encryptedData = application.passport;
        filename = `Passport-${application.User.name.replace(/\s+/g, '-')}.pdf`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    if (!encryptedData) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Decrypt the file
    const decryptedBuffer = decryptCV(Buffer.from(encryptedData));

    // Log audit event
    await logAuditEvent(req.user.id, 'cv_download', 'application', application.id, {
      file_type: fileType,
      applicant_name: application.User.name
    }, req);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(decryptedBuffer);
  } catch (error) {
    console.error('downloadCV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllApplicationsAdmin = async (req, res) => {
  try {
    const applications = await Application.findAll({
      include: [{ model: Job }, { model: require('../models').User, attributes: ['name', 'email'] }],
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'shortlisted', 'interview', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const [updated] = await Application.update({ status }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Application not found' });

    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }, { model: User }] });

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
    const user = application.User;
    if (user) {
      const stageKey = status === 'rejected' ? 'application_rejected' : status === 'hired' ? 'visa_payment_received' : status === 'interview' ? 'interview_scheduled' : status === 'shortlisted' ? 'shortlisted' : 'application_submitted';
      await sendStageEmail(stageKey, user.email, {
        name: user.name,
        jobTitle: application.Job.title,
        scheduledDate: application.zoom_meet_url ? 'as scheduled' : undefined,
        meetingLink: application.zoom_meet_url,
      });
    }

    res.json(application);
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
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    });

    if (!applicants.length) {
      return res.status(404).json({ message: 'No applicants found for selected status' });
    }

    const sendPromises = applicants.map(async (application) => {
      if (!application.User?.email) return { id: application.id, email: null };
      await sendEmail(application.User.email, subject, message);
      return { id: application.id, email: application.User.email };
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

    const application = await Application.findByPk(req.params.id, { include: [{ model: User }, { model: Job }] });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    await application.update({ zoom_meet_url, status: 'interview' });

    if (application.User && application.User.email) {
      await sendStageEmail('interview_scheduled', application.User.email, {
        name: application.User.name,
        jobTitle: application.Job.title,
        scheduledDate: 'as scheduled',
        meetingLink: zoom_meet_url,
      });
    }

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