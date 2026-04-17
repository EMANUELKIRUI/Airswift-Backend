const Joi = require('joi');
const { Op } = require('sequelize');
const { Application, Job, Profile, Payment, User, Notification } = require('../models');
const { sendEmail, sendStageEmail } = require('../utils/notifications');
const { sendStatusEmail, sendShortlistEmail } = require('../services/emailTemplates');
const { extractTextFromPDF, analyzeCV } = require('../utils/cvAnalyzer');
const { encryptCV, decryptCV } = require('../utils/cvEncryption');
const { logAuditEvent } = require('../utils/auditLogger');
const { emitApplicationStatusUpdate, emitApplicationPipelineUpdate, notifyAdminDashboard, emitAdminUserUpdate, emitUserEvent } = require('../utils/socketEmitter');
const Interview = require('../models/Interview');
const fs = require('fs').promises;
const cloudinary = require('../config/cloudinary');

const AuditLog = require("../models/AuditLog");

const logEvent = async ({ userId, action, resource = 'application', details }) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      resource,
      description: details,
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

const isMongooseModel = Boolean(User.schema);
const isSequelizeModel = Boolean(User.sequelize);

// For document upload path building
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || '';


const applySchema = Joi.object({
  job_id: Joi.number().integer(),
  jobId: Joi.alternatives().try(Joi.number().integer(), Joi.string().trim()),
  job_title: Joi.string().trim(),
  jobTitle: Joi.string().trim(),
  job: Joi.string().trim(),
  cover_letter: Joi.string().allow(''),
  phone: Joi.string().required(),
  national_id: Joi.string().required(),
}).or('job_id', 'jobId', 'job_title', 'jobTitle', 'job');

const resolveJobFromRequest = async (body) => {
  const rawJobInput = body.job_id || body.jobId || body.job || body.job_title || body.jobTitle || '';
  const requestedJobId = Number(rawJobInput);
  const requestedJobTitle = typeof rawJobInput === 'string' && rawJobInput.trim() && isNaN(requestedJobId)
    ? rawJobInput.trim()
    : (body.job || body.job_title || body.jobTitle || '').trim();

  if (!Number.isNaN(requestedJobId) && rawJobInput !== '' && rawJobInput !== null && rawJobInput !== undefined) {
    return { jobId: requestedJobId };
  }

  if (!requestedJobTitle) {
    return { error: 'Please select or type the job you want' };
  }

  const normalizedTitle = requestedJobTitle.trim();
  const titleMatch = Job.sequelize.where(
    Job.sequelize.fn('lower', Job.sequelize.col('title')),
    normalizedTitle.toLowerCase()
  );

  let job = await Job.findOne({
    where: {
      [Op.and]: [titleMatch, { status: 'active' }],
    },
  });

  if (!job) {
    job = await Job.create({
      title: normalizedTitle,
      description: `User-entered job request: ${normalizedTitle}`,
      created_by: 0,
      status: 'active',
    });
  }

  return { jobId: job.id, job };
};

const applyForJob = async (req, res) => {
  try {
    const rawJobInput = req.body.job || req.body.job_title || req.body.jobTitle || req.body.jobId || '';
    const parsedJobId = Number(req.body.job_id || req.body.jobId);
    const job_id = !Number.isNaN(parsedJobId) && (req.body.job_id || req.body.jobId) ? parsedJobId : undefined;
    const jobTitle = typeof rawJobInput === 'string' ? rawJobInput.trim() : '';
    const {
      cover_letter,
      coverLetter,
      phone,
      national_id,
      nationalId,
      nationalIdNumber,
      nationalIdValue,
    } = req.body;
    const phoneValue = phone || req.body.phone;
    const nationalIdValueFinal = national_id || nationalId || nationalIdNumber || nationalIdValue;

    const { error } = applySchema.validate({
      job_id,
      jobId: req.body.jobId,
      job_title: jobTitle,
      jobTitle,
      job: jobTitle,
      cover_letter: cover_letter || coverLetter,
      phone: phoneValue,
      national_id: nationalIdValueFinal,
    });
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Validate files first with detailed error messages
    if (!req.files) {
      return res.status(400).json({ 
        message: 'No files uploaded. Please provide CV, National ID, and Passport documents.' 
      });
    }

    if (!req.files?.cv?.[0]) {
      return res.status(400).json({ 
        message: 'CV file is required (PDF format, maximum 5MB)' 
      });
    }
    
    if (!req.files?.nationalId?.[0]) {
      return res.status(400).json({ 
        message: 'National ID file is required (PDF format, maximum 5MB)' 
      });
    }
    
    if (!req.files?.passport?.[0]) {
      return res.status(400).json({ 
        message: 'Passport file is required (PDF format, maximum 5MB)' 
      });
    }

    const { jobId, job: resolvedJob, error: jobResolveError } = await resolveJobFromRequest(req.body);
    if (jobResolveError) return res.status(400).json({ message: jobResolveError });

    const job = resolvedJob || await Job.findByPk(jobId);
    if (!job || job.status !== 'active') return res.status(404).json({ message: 'Job not found or inactive' });

    // Check if the user already applied to this job
    const existingApplication = await Application.findOne({ where: { job_id: job.id, user_id: req.user.id } });
    if (existingApplication) return res.status(400).json({ message: 'Already applied for this job' });

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
      job_id: job.id,
      user_id: req.user.id,
      name: req.user?.name || req.body.name || null,
      email: req.user?.email || req.body.email || null,
      phone: phoneValue,
      national_id: nationalIdValue,
      cover_letter: cover_letter || coverLetter,
      submittedAt: new Date(),
      cvUrl,
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
      await User.findByIdAndUpdate(req.user.id, { hasSubmittedApplication: true, phone }, { new: true });
    } else if (isSequelizeModel) {
      await User.update({ hasSubmittedApplication: true, phone }, { where: { id: req.user.id } });
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
    await logEvent({
      userId: req.user.id,
      action: "APPLICATION_SUBMITTED",
      details: "User submitted application",
    });

    // Notify applicant with stage template (do not block submission if email fails)
    try {
      if (req.user?.email) {
        await sendStageEmail('application_submitted', req.user.email, {
          name: req.user.name,
          jobTitle: job.title,
        });
      }
    } catch (emailError) {
      console.error('Application stage email failed:', emailError);
    }

    // Notify admin (placeholder)
    // sendEmail('admin@example.com', 'New Application', `New application for ${job.title}`);

    res.status(201).json(application);
  } catch (error) {
    console.error('applyForJob error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      user: req.user?.id,
      timestamp: new Date()
    });

    // Provide detailed error messages to help with debugging
    if (error.message.includes('encryption')) {
      return res.status(500).json({ message: 'Failed to encrypt files. Please try again.' });
    }
    
    if (error.message.includes('file') || error.message.includes('File')) {
      return res.status(400).json({ message: 'File processing error: ' + error.message });
    }

    res.status(500).json({ 
      message: 'Error submitting application. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

const createApplication = async (req, res) => {
  try {
    console.log('BODY:', req.body);
    console.log('FILES RECEIVED:', req.files);
    console.log('FILES:', req.files);

    const cvFile = req.files?.cv?.[0];
    const passportFile = req.files?.passport?.[0];
    const nationalIdFile = req.files?.nationalId?.[0];

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required',
      });
    }

    // Optional files may be handled later in the save logic
    console.log('CV file:', cvFile?.originalname);
    console.log('Passport file:', passportFile?.originalname || 'none');
    console.log('National ID file:', nationalIdFile?.originalname || 'none');

    res.status(200).json({
      success: true,
      message: 'Application files received',
      files: {
        cv: !!cvFile,
        passport: !!passportFile,
        nationalId: !!nationalIdFile,
      },
    });
  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).json({ message: error.message });
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

const getMyApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ where: { user_id: req.user.id } });

    if (!application) {
      return res.status(404).json({ message: "No application found" });
    }

    // If application is shortlisted, return specific format
    if (application.status === 'shortlisted') {
      // Find associated interview
      const interview = await Interview.findOne({ where: { application_id: application.id } });

      return res.json({
        status: "shortlisted",
        interviewDate: interview ? interview.scheduled_at.toISOString() : "2026-04-20T10:00:00Z",
        createdAt: application.createdAt ? application.createdAt.toISOString() : "2026-04-10T12:00:00Z",
        feedback: ""
      });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching user application:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getApplicationJobs = async (req, res) => {
  try {
    // ✅ Fetch all active jobs with category information
    const jobs = await Job.findAll({
      where: { status: 'active' },
      attributes: ['id', 'title', 'category_id'],
      include: [
        {
          model: require('../models').JobCategory,
          as: 'category', // Use the association alias defined in models/index.js
          attributes: ['id', 'name'],
          required: false, // Allow jobs without category
        }
      ],
      order: [['title', 'ASC']], // Sort by title A-Z
    });

    // ✅ Group jobs by category
    const grouped = {};
    jobs.forEach(job => {
      const categoryName = job.category?.name || 'Uncategorized';
      
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      
      grouped[categoryName].push({
        id: job.id,
        _id: job.id.toString(),
        title: job.title,
      });
    });

    // ✅ Sort categories A-Z and jobs within each category A-Z
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort()
      .forEach(category => {
        sortedGrouped[category] = grouped[category].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
      });

    res.json({
      success: true,
      data: {
        jobs: sortedGrouped,
        total: jobs.length,
      },
    });
  } catch (error) {
    console.error('getApplicationJobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message,
    });
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
    const applications = await Application.findAll({ 
      include: [{ model: Job }],
      order: [['created_at', 'DESC']],
    });
    const userIds = [...new Set(applications.map((app) => app.user_id).filter(Boolean))];
    
    let userMap = {};
    if (userIds.length > 0) {
      let users = [];
      if (isMongooseModel) {
        users = await User.find({ _id: { $in: userIds } }).lean();
        userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});
      } else if (isSequelizeModel) {
        users = await User.findAll({ where: { id: userIds } });
        userMap = users.reduce((acc, user) => ({ ...acc, [user.id.toString()]: user }), {});
      }
    }

    const formatted = applications.map((app) => ({
      ...app.toJSON(),
      applicant: userMap[app.user_id] || userMap[app.user_id.toString()] || null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('getAllApplicationsAdmin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'shortlisted', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }] });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (status === 'shortlisted' && !application.documentsVerified) {
      return res.status(400).json({ message: 'Verify documents before shortlisting' });
    }

    const oldStatus = application.status;
    application.status = status;
    await application.save();

    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('applicationUpdated', application.toJSON());
    }

    const user = application.user_id
      ? isMongooseModel
        ? await User.findById(application.user_id)
        : await User.findById(application.user_id)
      : null;
    const applicantEmail = application.email || user?.email;

    if (['accepted', 'rejected', 'shortlisted'].includes(status) && applicantEmail) {
      try {
        await sendStatusEmail({ ...application.toJSON(), email: applicantEmail });
      } catch (emailError) {
        console.error('sendStatusEmail error:', emailError);
      }
    }

    emitApplicationStatusUpdate({
      applicationId: application.id,
      applicantName: user?.name || 'Applicant',
      jobTitle: application.Job?.title || 'Position',
      status,
      updatedBy: req.user.id,
      email: applicantEmail,
    });

    emitApplicationPipelineUpdate({
      applicationId: application.id,
      oldStatus,
      newStatus: status,
      applicantName: user?.name || 'Applicant'
    });

    res.json({
      message: `Application ${status}`,
      application,
    });
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
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

const updateApplicationNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    const application = await Application.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.notes = notes;
    await application.save();

    res.json({ application });
  } catch (error) {
    console.error('updateApplicationNotes error:', error);
    res.status(500).json({ message: 'Failed to update notes' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const total = await Application.count();
    const pending = await Application.count({ where: { status: 'pending' } });
    const underReview = await Application.count({ where: { status: 'under_review' } });
    const shortlisted = await Application.count({ where: { status: 'shortlisted' } });
    const accepted = await Application.count({ where: { status: 'accepted' } });
    const rejected = await Application.count({ where: { status: 'rejected' } });

    res.json({
      total,
      pending,
      underReview,
      shortlisted,
      accepted,
      rejected,
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ message: 'Stats error' });
  }
};

const verifyApplicationDocuments = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }] });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.documentsVerified) {
      return res.status(400).json({ message: 'Application documents already verified' });
    }

    await application.update({ documentsVerified: true });

    notifyAdminDashboard('documents_verified', {
      applicationId: application.id,
      applicantName: application.name || 'Applicant',
      jobTitle: application.Job?.title || '',
      status: application.status,
    });

    await logAuditEvent(req.user.id, 'DOCUMENTS_VERIFIED', 'application', application.id, {
      applicationId: application.id,
      jobTitle: application.Job?.title,
      applicantName: application.name,
    }, req);

    res.json({ message: 'Application documents verified', application });
  } catch (error) {
    console.error('verifyApplicationDocuments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const shortlistApplication = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }] });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (!application.documentsVerified) {
      return res.status(400).json({ message: 'Verify documents before shortlisting' });
    }

    if (application.status === 'shortlisted') {
      return res.status(400).json({ message: 'Application already shortlisted' });
    }

    const oldStatus = application.status;
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 2);

    await application.update({ status: 'shortlisted' });

    const interview = await Interview.create({
      application_id: application.id,
      interviewer_id: req.user.id,
      room_id: `interview_${application.id}_${Date.now()}`,
      scheduled_at: interviewDate,
      status: 'scheduled',
    });

    const applicantEmail = application.email || (await User.findById(application.user_id))?.email;
    const applicantName = application.name || (await User.findById(application.user_id))?.name || 'Applicant';

    if (applicantEmail) {
      try {
        await sendShortlistEmail({
          email: applicantEmail,
          name: applicantName,
          interviewDate,
          jobTitle: application.Job?.title,
        });
      } catch (emailError) {
        console.error('sendShortlistEmail error:', emailError);
      }
    }

    emitAdminUserUpdate({
      type: 'SHORTLIST_APPLICATION',
      userId: application.user_id,
      applicationId: application.id,
      adminId: req.user.id,
      status: 'shortlisted',
    });

    emitUserEvent(application.user_id, 'application:shortlisted', {
      message: 'You have been shortlisted!',
      interviewDate,
      applicationId: application.id,
      jobTitle: application.Job?.title,
    });

    emitApplicationStatusUpdate({
      applicationId: application.id,
      applicantName,
      jobTitle: application.Job?.title,
      status: 'shortlisted',
      updatedBy: req.user.id,
      email: applicantEmail,
    });

    emitApplicationPipelineUpdate({
      applicationId: application.id,
      oldStatus,
      newStatus: 'shortlisted',
      applicantName,
    });

    await logAuditEvent(req.user.id, 'SHORTLIST_APPLICATION', 'application', application.id, {
      interviewId: interview.id,
      interviewDate,
      applicantEmail,
    }, req);

    res.json({ message: 'Application shortlisted successfully', application, interview });
  } catch (error) {
    console.error('shortlistApplication error:', error);
    res.status(500).json({ message: 'Server error' });
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

    notifyAdminDashboard('documents_uploaded', {
      applicationId: application.id,
      applicantName: req.user?.name || 'Applicant',
      jobTitle: application.job_title || application.jobTitle || '',
      email: req.user?.email || '',
      message: 'Applicant uploaded documents for review',
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
  getMyApplication,
  getApplicationJobs,
  getAllApplicationsAdmin,
  downloadCV,
  updateApplicationStatus,
  updateApplicationNotes,
  getAdminStats,
  verifyApplicationDocuments,
  shortlistApplication,
  sendMessageToApplicants,
  scheduleInterview,
  markInterviewAttended,
  uploadApplicantDocs,
};