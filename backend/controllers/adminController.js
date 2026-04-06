const Joi = require('joi');
const { Settings } = require('../models');

// Validation schemas
const settingsSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required(),
  description: Joi.string().optional(),
});

const updateSettingsSchema = Joi.object({
  value: Joi.any().required(),
  description: Joi.string().optional(),
});

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific setting by key
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    res.json({ setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new setting
const createSetting = async (req, res) => {
  try {
    const { error } = settingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { key, value, description } = req.body;

    const existingSetting = await Settings.findOne({ where: { key } });
    if (existingSetting) {
      return res.status(400).json({ message: 'Setting with this key already exists' });
    }

    const setting = await Settings.create({ key, value, description });

    res.status(201).json({ message: 'Setting created successfully', setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a setting by key
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { error } = updateSettingsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { value, description } = req.body;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    await setting.update({ value, description, updated_at: new Date() });

    res.json({ message: 'Setting updated successfully', setting });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a setting by key
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Settings.findOne({ where: { key } });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });

    await setting.destroy();

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const { Application, Job, User, Interview, AuditLog } = require('../models');
const { sendEmail } = require('../services/emailService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('../utils/auditLogger');
const { analyzeCV, extractTextFromPDF } = require('../utils/cvAnalyzer');

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: Job, attributes: ['id', 'title', 'location'] },
      ],
    });

    const userIds = [...new Set(applications.map((app) => app.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

    // Format applications for frontend compatibility
    const formattedApplications = applications.map((app) => ({
      _id: app.id, // Add _id for frontend compatibility
      id: app.id,
      status: app.status.charAt(0).toUpperCase() + app.status.slice(1), // Capitalize status
      cover_letter: app.cover_letter,
      cv: app.cv,
      nationalId: app.nationalId,
      passport: app.passport,
      score: app.score,
      skills: app.skills,
      created_at: app.created_at,
      Job: app.Job,
      applicant: userMap[app.user_id] || null,
    }));

    res.json(formattedApplications);
  } catch (error) {
    console.error('getAllApplications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'shortlisted', 'interview', 'rejected', 'hired'];

    // Convert to lowercase for validation
    const normalizedStatus = status.toLowerCase();

    if (!valid.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const oldStatus = app.status;
    app.status = normalizedStatus;
    await app.save();

    // Log audit event
    await logAuditEvent(req.user.id, 'application_status_update', 'application', app.id, {
      old_status: oldStatus,
      new_status: normalizedStatus
    }, req);

    res.json(app);
  } catch (error) {
    console.error('updateStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const UserModel = require('../models/User');
    const users = await UserModel.countDocuments();
    const applications = await Application.count();
    const jobs = await Job.count();
    const interviews = await Interview.count();
    const messages = await AuditLog.count();

    res.json({ 
      users, 
      applications, 
      jobs,
      interviews,
      messages
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendInterview = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const applicant = application.user_id ? await User.findById(application.user_id) : null;
    if (!applicant || !applicant.email) {
      return res.status(400).json({ message: 'Applicant email not available' });
    }

    await sendEmail(
      applicant.email,
      'Interview Invitation',
      `<p>Hello ${applicant.name},</p><p>You have been selected for an interview.</p><p>We will be in touch with scheduling details shortly.</p>`
    );

    res.json({ message: 'Email sent' });
  } catch (error) {
    console.error('sendInterview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const generateOffer = async (req, res) => {
  try {
    const { salary, startDate, jobTitle } = req.body;

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Job, attributes: ['title', 'location'] }
      ],
    });

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const applicant = application.user_id ? await User.findById(application.user_id) : null;
    const job = application.Job;

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `offer-letter-${applicant.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // PDF Content
    doc.fontSize(20).text('AIRSWIFT JOB OFFER LETTER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    doc.text(`Dear ${applicant.name},`);
    doc.moveDown();

    doc.text('We are pleased to offer you the position of:');
    doc.font('Helvetica-Bold').text(jobTitle || job.title);
    doc.font('Helvetica');
    doc.moveDown();

    doc.text('Location: ' + (job.location || 'Remote'));
    doc.text('Salary: $' + (salary || 'TBD'));
    doc.text('Start Date: ' + (startDate || 'TBD'));
    doc.moveDown();

    doc.text('Terms and Conditions:');
    doc.text('• This offer is contingent upon successful completion of background checks');
    doc.text('• Standard company benefits apply');
    doc.text('• 30-day probationary period');
    doc.moveDown();

    doc.text('Please sign and return this offer letter to accept the position.');
    doc.moveDown(2);

    doc.text('Sincerely,');
    doc.text('Airswift HR Team');
    doc.text('hr@airswift.com');

    doc.end();

    // Wait for PDF to be written
    stream.on('finish', async () => {
      // Log audit event
      await logAuditEvent(req.user.id, 'offer_letter_generated', 'application', req.params.id, {
        salary,
        startDate,
        jobTitle,
        applicant_name: applicant.name
      }, req);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        // Clean up temp file after sending
        fs.unlink(filepath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      });
    });

  } catch (error) {
    console.error('generateOffer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== JOB MANAGEMENT ==========

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      include: [{
        model: require('../models/JobCategory'),
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']]
    });
    res.json(jobs);
  } catch (error) {
    console.error('getJobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createJob = async (req, res) => {
  try {
    const { title, description, category_id, salary_min, salary_max, location, requirements, expiry_date } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Title, description, and location are required' });
    }

    const job = await Job.create({
      title,
      description,
      category_id,
      salary_min,
      salary_max,
      location,
      requirements,
      expiry_date,
      created_by: req.user.id,
      status: 'active'
    });

    await logAuditEvent(req.user.id, 'job_created', 'job', job.id, {
      title,
      location
    }, req);

    res.status(201).json({ message: 'Job created successfully', job });
  } catch (error) {
    console.error('createJob error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id, salary_min, salary_max, location, requirements, status, expiry_date } = req.body;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const updatedJob = await job.update({
      title: title || job.title,
      description: description || job.description,
      category_id: category_id || job.category_id,
      salary_min: salary_min !== undefined ? salary_min : job.salary_min,
      salary_max: salary_max !== undefined ? salary_max : job.salary_max,
      location: location || job.location,
      requirements: requirements || job.requirements,
      status: status || job.status,
      expiry_date: expiry_date || job.expiry_date
    });

    await logAuditEvent(req.user.id, 'job_updated', 'job', id, {
      title: updatedJob.title,
      status: updatedJob.status
    }, req);

    res.json({ message: 'Job updated successfully', job: updatedJob });
  } catch (error) {
    console.error('updateJob error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await logAuditEvent(req.user.id, 'job_deleted', 'job', id, {
      title: job.title
    }, req);

    await job.destroy();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('deleteJob error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== AI CV SCORING ==========

const analyzeSingleCV = async (req, res) => {
  try {
    const { applicationId, jobDescription } = req.body;

    if (!applicationId || !jobDescription) {
      return res.status(400).json({ message: 'applicationId and jobDescription are required' });
    }

    const application = await Application.findByPk(applicationId, {
      include: [{ model: Job }]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Extract CV text from URL
    let cvText = '';
    if (application.cv_url) {
      try {
        cvText = await extractTextFromPDF(application.cv_url);
      } catch (error) {
        console.warn('Error extracting CV text:', error);
      }
    }

    // Analyze CV using AI
    const analysis = await analyzeCV(cvText, jobDescription || application.Job?.description);

    // Update application with score and skills
    await application.update({
      score: analysis.matchScore || 0,
      skills: analysis.skills || []
    });

    await logAuditEvent(req.user.id, 'cv_analyzed', 'application', applicationId, {
      score: analysis.matchScore,
      skills: analysis.skills
    }, req);

    res.json({
      message: 'CV analyzed successfully',
      analysis: {
        applicationId,
        score: analysis.matchScore,
        skills: analysis.skills
      }
    });
  } catch (error) {
    console.error('analyzeSingleCV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkAnalyzeCV = async (req, res) => {
  try {
    const { applicationIds, jobDescription } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required' });
    }

    const applications = await Application.findAll({
      where: { id: applicationIds },
      include: [{ model: Job }]
    });

    const results = [];

    for (const application of applications) {
      try {
        let cvText = '';
        if (application.cv_url) {
          try {
            cvText = await extractTextFromPDF(application.cv_url);
          } catch (error) {
            console.warn(`Error extracting CV for application ${application.id}:`, error);
          }
        }

        const analysis = await analyzeCV(cvText, jobDescription || application.Job?.description);

        await application.update({
          score: analysis.matchScore || 0,
          skills: analysis.skills || []
        });

        results.push({
          applicationId: application.id,
          score: analysis.matchScore,
          skills: analysis.skills,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error analyzing CV for application ${application.id}:`, error);
        results.push({
          applicationId: application.id,
          status: 'error',
          message: error.message
        });
      }
    }

    await logAuditEvent(req.user.id, 'bulk_cv_analysis', 'application', null, {
      count: applicationIds.length,
      successful: results.filter(r => r.status === 'success').length
    }, req);

    res.json({
      message: 'Bulk CV analysis completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    });
  } catch (error) {
    console.error('bulkAnalyzeCV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== REAL-TIME APPLICANT TRACKING ==========

const updateApplicantStatusWithSocket = async (req, res) => {
  try {
    const { id, status } = req.body;
    const { io } = require('../server');
    const UserModel = require('../models/User');

    if (!id || !status) {
      return res.status(400).json({ message: 'Application ID and status are required' });
    }

    const valid = ['pending', 'shortlisted', 'interview', 'rejected', 'hired'];
    const normalizedStatus = status.toLowerCase();

    if (!valid.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const application = await Application.findByPk(id, {
      include: [{ model: Job }]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const oldStatus = application.status;
    await application.update({ status: normalizedStatus });

    // Get applicant info for real-time update
    const applicant = application.user_id ? 
      await UserModel.findById(application.user_id).lean() : null;

    // Log audit event
    await logAuditEvent(req.user.id, 'applicant_status_updated', 'application', id, {
      old_status: oldStatus,
      new_status: normalizedStatus,
      applicant_name: applicant?.name,
      job_title: application.Job?.title
    }, req);

    // Emit real-time update to all connected admins
    io.emit('applicationUpdate', {
      applicationId: id,
      status: normalizedStatus,
      timestamp: new Date(),
      updatedBy: req.user.id,
      applicantName: applicant?.name || 'Unknown',
      jobTitle: application.Job?.title || 'Unknown',
      email: applicant?.email
    });

    res.json({
      message: 'Application status updated',
      application: {
        id: application.id,
        status: normalizedStatus,
        applicantName: applicant?.name,
        jobTitle: application.Job?.title
      }
    });
  } catch (error) {
    console.error('updateApplicantStatusWithSocket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== EMAIL FROM DASHBOARD ==========

const sendEmailToApplicant = async (req, res) => {
  try {
    const { applicationId, email, subject, message, emailTemplate } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ message: 'Email, subject, and message are required' });
    }

    const { sendEmail } = require('../utils/email');

    // Build HTML email
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
          <h2 style="color: #007bff;">Airswift Notification</h2>
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <footer style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated message from Airswift HR Portal.</p>
            <p>&copy; ${new Date().getFullYear()} Airswift. All rights reserved.</p>
          </footer>
        </div>
      </div>
    `;

    // Send email
    await sendEmail(email, subject, htmlEmail);

    // Log audit event if applicationId is provided
    if (applicationId) {
      await logAuditEvent(req.user.id, 'email_sent_to_applicant', 'application', applicationId, {
        email,
        subject,
        template: emailTemplate || 'custom'
      }, req);
    }

    res.json({
      message: 'Email sent successfully',
      sentTo: email,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('sendEmailToApplicant error:', error);
    res.status(500).json({ 
      message: 'Failed to send email',
      error: error.message 
    });
  }
};

// Send bulk emails to multiple applicants
const sendBulkEmailToApplicants = async (req, res) => {
  try {
    const { applicationIds, subject, message, emailTemplate } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    const { sendEmail } = require('../utils/email');
    const UserModel = require('../models/User');
    const results = [];

    // Fetch all applications with applicant data
    const applications = await Application.findAll({
      where: { id: applicationIds },
      include: [{ model: Job }]
    });

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
          <h2 style="color: #007bff;">Airswift Notification</h2>
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
            {{APPLICANT_NAME}},<br><br>
            ${message.replace(/\n/g, '<br>')}
          </div>
          <footer style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated message from Airswift HR Portal.</p>
            <p>&copy; ${new Date().getFullYear()} Airswift. All rights reserved.</p>
          </footer>
        </div>
      </div>
    `;

    for (const application of applications) {
      try {
        const applicant = application.user_id ? 
          await UserModel.findById(application.user_id).lean() : null;

        if (!applicant || !applicant.email) {
          results.push({
            applicationId: application.id,
            status: 'skipped',
            reason: 'No email found for applicant'
          });
          continue;
        }

        const personalized = htmlTemplate.replace('{{APPLICANT_NAME}}', applicant.name);

        await sendEmail(applicant.email, subject, personalized);

        results.push({
          applicationId: application.id,
          email: applicant.email,
          status: 'sent'
        });
      } catch (error) {
        console.error(`Error sending email for application ${application.id}:`, error);
        results.push({
          applicationId: application.id,
          status: 'failed',
          message: error.message
        });
      }
    }

    // Log bulk event
    await logAuditEvent(req.user.id, 'bulk_email_sent', 'application', null, {
      count: applicationIds.length,
      successful: results.filter(r => r.status === 'sent').length,
      subject,
      template: emailTemplate || 'custom'
    }, req);

    res.json({
      message: 'Bulk email sent',
      results,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    });
  } catch (error) {
    console.error('sendBulkEmailToApplicants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getAllApplications,
  updateStatus,
  getStats,
  sendInterview,
  generateOffer,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  analyzeSingleCV,
  bulkAnalyzeCV,
  updateApplicantStatusWithSocket,
  sendEmailToApplicant,
  sendBulkEmailToApplicants
};
