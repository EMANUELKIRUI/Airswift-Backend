/**
 * EMAIL SERVICE USAGE EXAMPLES
 * Shows how to use centralized email templates with sendEmail()
 * 
 * Files:
 * - /utils/sendEmail.js - Brevo API implementation
 * - /utils/email.js - Nodemailer fallback
 * - /utils/emailTemplates.js - All email templates
 */

// ========================================
// EXAMPLE 1: Send application notification to admin
// ========================================
const sendEmail = require('../utils/sendEmail');
const { applicationNotification } = require('../utils/emailTemplates');
const User = require('../models/User');

exports.applyJob = async (req, res) => {
  try {
    const application = await Application.create({
      jobId: req.body.jobId,
      userId: req.user._id,
    });

    const job = await Job.findById(req.body.jobId);
    const user = await User.findById(req.user._id);

    // 🔥 Find admin
    const admin = await User.findOne({ role: 'admin' });

    if (admin) {
      // 📧 Send email to admin using template
      await sendEmail({
        to: admin.email,
        subject: '📩 New Job Application',
        html: applicationNotification(user, job),
        type: 'application_notification',
        sentBy: req.user._id,
        req,
      });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// EXAMPLE 2: Send job approval email
// ========================================
const { jobApproved } = require('../utils/emailTemplates');

exports.approveJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    const owner = await User.findById(job.createdBy);

    if (owner) {
      // 📧 Email job owner
      await sendEmail({
        to: owner.email,
        subject: '🎉 Job Approved',
        html: jobApproved(job),
        type: 'job_approved',
        sentBy: req.user._id,
        req,
      });
    }

    // 🔌 Socket.IO real-time update for admins
    global.io?.to('admins').emit('job:updated', job);

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// EXAMPLE 3: Send job rejection email
// ========================================
const { jobRejected } = require('../utils/emailTemplates');

exports.rejectJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    const owner = await User.findById(job.createdBy);
    const reason = req.body.reason || 'Job does not meet our requirements';

    if (owner) {
      // 📧 Email job owner with rejection reason
      await sendEmail({
        to: owner.email,
        subject: '❌ Job Not Approved',
        html: jobRejected(job, reason),
        type: 'job_rejected',
        sentBy: req.user._id,
        req,
      });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// EXAMPLE 4: Send application status update
// ========================================
const { applicationStatusUpdate } = require('../utils/emailTemplates');

exports.updateApplicationStatus = async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    const user = await User.findById(application.userId);

    if (user) {
      // 📧 Notify user of status change
      await sendEmail({
        to: user.email,
        subject: '📋 Application Status Update',
        html: applicationStatusUpdate(application, req.body.status),
        type: 'application_status_update',
        sentBy: req.user._id,
        req,
      });
    }

    // 🔌 Socket.IO real-time update for user
    global.io?.to(`user_${user._id}`).emit('application:status', application);

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// EXAMPLE 5: Send interview scheduled email
// ========================================
const { interviewScheduled } = require('../utils/emailTemplates');

exports.scheduleInterview = async (req, res) => {
  try {
    const interview = await Interview.create({
      applicationId: req.body.applicationId,
      scheduledAt: req.body.scheduledAt,
      meetingLink: req.body.meetingLink,
      type: req.body.type || 'video_call',
    });

    const application = await Application.findById(req.body.applicationId);
    const candidate = await User.findById(application.userId);
    const job = await Job.findById(application.jobId);

    if (candidate) {
      // 📧 Send interview details to candidate
      await sendEmail({
        to: candidate.email,
        subject: '📅 Interview Scheduled',
        html: interviewScheduled(interview, candidate.name, job.title),
        type: 'interview_scheduled',
        sentBy: req.user._id,
        req,
      });
    }

    // 🔌 Socket.IO real-time update
    global.io?.to(`user_${candidate._id}`).emit('interview:scheduled', interview);

    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// EXAMPLE 6: Send welcome email on registration
// ========================================
const { welcomeEmail } = require('../utils/emailTemplates');

exports.registerUser = async (req, res) => {
  try {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: 'user',
    });

    // 📧 Send welcome email
    await sendEmail({
      to: user.email,
      subject: '🎉 Welcome to Airswift',
      html: welcomeEmail(user.name),
      type: 'welcome',
      sentBy: user._id,
      req,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
