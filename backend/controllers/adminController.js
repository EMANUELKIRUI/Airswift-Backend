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
const { sendEmail } = require('../utils/email');
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
    doc.text('TALEX HR Team');
    doc.text('hr@talex.com');

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

// Seed test jobs for development/testing
const seedTestJobs = async (req, res) => {
  try {
    const JobModel = require('../models/JobMongoose');

    const testJobs = [
      {
        title: "Senior Full Stack Developer",
        description: "Toronto-based tech company seeking a Senior Full Stack Developer with 6+ years of experience. Build scalable web applications using modern tech stack. Competitive salary + benefits + relocation assistance available.",
        category: "Technology",
        location: "Toronto, Ontario",
        type: "Full-time",
        salaryMin: 120000,
        salaryMax: 160000,
        requiredExperience: 6,
        requiredEducation: "Bachelor's in Computer Science or equivalent",
        skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"],
        isRemote: false,
        requirements: "6+ years full stack development, strong problem-solving skills",
      },
      {
        title: "React Developer (Remote)",
        description: "Join our Vancouver team remotely! We're looking for a React specialist to build beautiful, responsive client applications. Work on impactful projects with cutting-edge technologies.",
        category: "Technology",
        location: "Vancouver, British Columbia",
        type: "Full-time",
        salaryMin: 90000,
        salaryMax: 130000,
        requiredExperience: 3,
        requiredEducation: "Bachelor's in CS or bootcamp graduate",
        skills: ["React", "JavaScript", "HTML", "CSS", "Git", "Webpack"],
        isRemote: true,
        requirements: "3+ years React experience, portfolio demonstrating projects",
      },
      {
        title: "DevOps Engineer",
        description: "Montreal startup needs a DevOps engineer to oversee our infrastructure. Manage AWS, Docker, Kubernetes deployments. Great work-life balance, startup equity.",
        category: "Technology",
        location: "Montreal, Quebec",
        type: "Full-time",
        salaryMin: 100000,
        salaryMax: 140000,
        requiredExperience: 4,
        requiredEducation: "Any degree or 5+ years experience",
        skills: ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform", "Linux"],
        isRemote: true,
        requirements: "4+ years DevOps experience, CI/CD pipeline expertise",
      },
      {
        title: "Data Analyst",
        description: "Calgary-based energy company seeking data analyst. Work with Python, SQL to analyze large datasets and generate insights. Contribute to business intelligence projects.",
        category: "Data & Analytics",
        location: "Calgary, Alberta",
        type: "Full-time",
        salaryMin: 75000,
        salaryMax: 110000,
        requiredExperience: 2,
        requiredEducation: "Bachelor's in Statistics, Math, or CS",
        skills: ["Python", "SQL", "Tableau", "Excel", "Statistics", "Data Visualization"],
        isRemote: false,
        requirements: "2+ years data analysis experience, strong SQL skills",
      },
      {
        title: "UI/UX Designer",
        description: "Design beautiful, user-centric interfaces for a fintech platform. Use Figma, conduct user research, and collaborate with product team. Based in Waterloo.",
        category: "Design",
        location: "Waterloo, Ontario",
        type: "Full-time",
        salaryMin: 80000,
        salaryMax: 115000,
        requiredExperience: 3,
        requiredEducation: "Design degree or equivalent portfolio",
        skills: ["Figma", "Design Thinking", "User Research", "Prototyping", "Adobe Creative Suite"],
        isRemote: true,
        requirements: "3+ years UX/UI design, strong portfolio, Figma expertise",
      },
      {
        title: "Senior React Developer - New York",
        description: "We are looking for a Senior React Developer with 5+ years of experience in building modern web applications. Must be proficient in React, TypeScript, and Node.js.",
        category: "Technology",
        location: "New York, NY",
        type: "Full-time",
        salaryMin: 120000,
        salaryMax: 160000,
        requiredExperience: 5,
        requiredEducation: "Bachelor's degree in Computer Science or equivalent",
        skills: ["React", "TypeScript", "Node.js", "JavaScript", "HTML", "CSS"],
        isRemote: true,
        requirements: "5+ years React experience, TypeScript proficiency required",
      },
      {
        title: "Full Stack Developer - San Francisco",
        description: "Join our San Francisco team as a Full Stack Developer. You'll work on both frontend and backend technologies using MERN stack. Competitive salary + stock options.",
        category: "Technology",
        location: "San Francisco, CA",
        type: "Full-time",
        salaryMin: 100000,
        salaryMax: 140000,
        requiredExperience: 3,
        requiredEducation: "Bachelor's in CS or bootcamp graduate",
        skills: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
        isRemote: false,
        requirements: "3+ years full stack development experience",
      },
      {
        title: "Cloud Solutions Architect",
        description: "Design and implement cloud solutions using AWS and Azure. Work with enterprise clients on complex infrastructure projects.",
        category: "Technology",
        location: "Denver, CO",
        type: "Full-time",
        salaryMin: 150000,
        salaryMax: 200000,
        requiredExperience: 7,
        requiredEducation: "Bachelor's in CS or IT",
        skills: ["AWS", "Azure", "Cloud Architecture", "Terraform", "Docker", "Enterprise Design"],
        isRemote: true,
        requirements: "7+ years cloud architecture experience, AWS Solutions Architect certification",
      },
      {
        title: "QA Automation Engineer",
        description: "Build and maintain automated test suites for web and mobile applications. Ensure product quality across platforms.",
        category: "Technology",
        location: "Miami, FL",
        type: "Full-time",
        salaryMin: 80000,
        salaryMax: 110000,
        requiredExperience: 3,
        requiredEducation: "Any engineering degree",
        skills: ["Selenium", "Python", "JavaScript", "TestNG", "CI/CD", "Git"],
        isRemote: true,
        requirements: "3+ years QA automation experience",
      },
      {
        title: "Machine Learning Engineer",
        description: "Build ML models for recommendation systems. Work with Python, TensorFlow, and large datasets. Remote position, flexible hours.",
        category: "Data Science",
        location: "Boston, MA",
        type: "Full-time",
        salaryMin: 130000,
        salaryMax: 170000,
        requiredExperience: 4,
        requiredEducation: "Master's in CS, Math, or related field",
        skills: ["Python", "TensorFlow", "Machine Learning", "SQL", "Statistics", "PyTorch"],
        isRemote: true,
        requirements: "4+ years ML experience, published research preferred",
      },
      {
        title: "Product Designer",
        description: "Design user experiences for mobile and web products. Collaborate with cross-functional teams at a leading tech company in Los Angeles.",
        category: "Design",
        location: "Los Angeles, CA",
        type: "Full-time",
        salaryMin: 90000,
        salaryMax: 120000,
        requiredExperience: 3,
        requiredEducation: "Design degree or bootcamp",
        skills: ["Figma", "Sketch", "Adobe XD", "Prototyping", "User Research"],
        isRemote: true,
        requirements: "3+ years product design experience",
      },
      {
        title: "Senior Product Manager",
        description: "Lead product strategy and execution. Oversee feature development from ideation to launch. Experience in tech products required.",
        category: "Product",
        location: "Seattle, WA",
        type: "Full-time",
        salaryMin: 140000,
        salaryMax: 180000,
        requiredExperience: 5,
        requiredEducation: "Bachelor's degree required",
        skills: ["Product Strategy", "Agile", "Analytics", "SQL", "Data Analysis"],
        isRemote: false,
        requirements: "5+ years product management experience",
      },
      {
        title: "Junior Python Developer",
        description: "Entry-level position perfect for recent graduates. Build backend systems using Python and Django. Great mentorship and learning opportunities.",
        category: "Technology",
        location: "Chicago, IL",
        type: "Full-time",
        salaryMin: 70000,
        salaryMax: 90000,
        requiredExperience: 0,
        requiredEducation: "Bachelor's in CS or bootcamp graduate",
        skills: ["Python", "Django", "SQL", "Git", "REST APIs"],
        isRemote: false,
        requirements: "Recently graduated or bootcamp, eager to learn",
      },
      {
        title: "Business Analyst",
        description: "Toronto financial services firm seeking business analyst. Gather requirements, analyze processes, recommend improvements.",
        category: "Business",
        location: "Toronto, Ontario",
        type: "Full-time",
        salaryMin: 75000,
        salaryMax: 105000,
        requiredExperience: 2,
        requiredEducation: "Bachelor's degree required",
        skills: ["Business Analysis", "Excel", "SQL", "Agile", "JIRA", "Stakeholder Management"],
        isRemote: false,
        requirements: "2+ years business analysis experience",
      },
      {
        title: "Solutions Architect",
        description: "Work with enterprise clients to design and implement software solutions. Travel to client sites required (30%).",
        category: "Technology",
        location: "Chicago, IL",
        type: "Full-time",
        salaryMin: 130000,
        salaryMax: 165000,
        requiredExperience: 8,
        requiredEducation: "Bachelor's in CS or related field",
        skills: ["System Design", "Enterprise Software", "AWS", "Project Management", "Client Relations"],
        isRemote: false,
        requirements: "8+ years software development, strong communication skills",
      },
    ];

    // Clear existing jobs (optional - can be controlled via query param)
    const clearExisting = req.query.clear === 'true';
    if (clearExisting) {
      await JobModel.deleteMany({});
      console.log('🗑️  Cleared existing jobs');
    }

    // Insert test jobs
    const insertedJobs = await JobModel.insertMany(testJobs);

    res.status(200).json({
      success: true,
      message: `Successfully seeded ${insertedJobs.length} test jobs`,
      jobs: {
        total: insertedJobs.length,
        count: insertedJobs.length,
        data: insertedJobs,
      },
      summary: {
        categories: [...new Set(testJobs.map(j => j.category))],
        locations: [...new Set(testJobs.map(j => j.location))].length,
        remotePositions: testJobs.filter(j => j.isRemote).length,
        salaryRange: {
          min: Math.min(...testJobs.map(j => j.salaryMin)),
          max: Math.max(...testJobs.map(j => j.salaryMax)),
        },
      },
    });
  } catch (error) {
    console.error('seedTestJobs error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error seeding test jobs',
      error: error.message 
    });
  }
};

// ========== USER MANAGEMENT ==========

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, isVerified, search } = req.query;
    const offset = (page - 1) * limit;

    const UserModel = require('../models/User');
    let query = {};

    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await UserModel.find(query)
      .select('-password -resetToken -resetTokenExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationTokenExpires -otp -otpExpires -refreshToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(offset)
      .lean();

    const total = await UserModel.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const UserModel = require('../models/User');

    const user = await UserModel.findById(id)
      .select('-password -resetToken -resetTokenExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationTokenExpires -otp -otpExpires -refreshToken')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('getUserById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, location, skills, education, experience, profilePicture } = req.body;

    const UserModel = require('../models/User');
    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (skills !== undefined) user.skills = skills;
    if (education !== undefined) user.education = education;
    if (experience !== undefined) user.experience = experience;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    await logAuditEvent(req.user.id, 'user_updated', 'user', id, {
      updatedFields: Object.keys(req.body)
    }, req);

    // Return user without sensitive fields
    const updatedUser = await UserModel.findById(id)
      .select('-password -resetToken -resetTokenExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationTokenExpires -otp -otpExpires -refreshToken')
      .lean();

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deactivate user account
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const UserModel = require('../models/User');

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add a deactivated field or set isVerified to false
    user.isVerified = false;
    await user.save();

    await logAuditEvent(req.user.id, 'user_deactivated', 'user', id, {
      reason: req.body.reason || 'Admin action'
    }, req);

    res.json({ message: 'User account deactivated successfully' });
  } catch (error) {
    console.error('deactivateUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Activate user account
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const UserModel = require('../models/User');

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    await logAuditEvent(req.user.id, 'user_activated', 'user', id, {}, req);

    res.json({ message: 'User account activated successfully' });
  } catch (error) {
    console.error('activateUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change user role
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'recruiter'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user, admin, or recruiter' });
    }

    const UserModel = require('../models/User');
    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAuditEvent(req.user.id, 'user_role_changed', 'user', id, {
      oldRole,
      newRole: role
    }, req);

    res.json({ message: `User role changed from ${oldRole} to ${role}` });
  } catch (error) {
    console.error('changeUserRole error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (soft delete by marking as deleted)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const UserModel = require('../models/User');

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Instead of hard delete, we can add a deletedAt field or just log the deletion
    // For now, we'll do a soft delete by setting a flag
    user.isVerified = false;
    user.email = `${user.email}.deleted.${Date.now()}`; // Prevent email conflicts
    await user.save();

    await logAuditEvent(req.user.id, 'user_deleted', 'user', id, {
      reason: req.body.reason || 'Admin action'
    }, req);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== SYSTEM HEALTH & MONITORING ==========

// System health check
const getSystemHealth = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const sequelize = require('../config/database');
    const os = require('os');
    const process = require('process');

    // Database connectivity checks
    let mongoStatus = 'unknown';
    let sqlStatus = 'unknown';

    try {
      // Check MongoDB
      await mongoose.connection.db.admin().ping();
      mongoStatus = 'healthy';
    } catch (error) {
      mongoStatus = 'unhealthy';
    }

    try {
      // Check SQL database
      await sequelize.authenticate();
      sqlStatus = 'healthy';
    } catch (error) {
      sqlStatus = 'unhealthy';
    }

    // System metrics
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024), // MB
        total: Math.round(os.totalmem() / 1024 / 1024), // MB
        percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg()[0] // 1-minute load average
      },
      platform: os.platform(),
      nodeVersion: process.version
    };

    // Service status
    const services = {
      mongodb: mongoStatus,
      database: sqlStatus,
      email: process.env.BREVO_API_KEY ? 'configured' : 'not_configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
      zoom: process.env.ZOOM_CLIENT_ID ? 'configured' : 'not_configured'
    };

    res.json({
      status: mongoStatus === 'healthy' && sqlStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      services,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('getSystemHealth error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Unable to perform health check',
      timestamp: new Date().toISOString()
    });
  }
};

// ========== BULK OPERATIONS ==========

// Bulk update application statuses
const bulkUpdateApplications = async (req, res) => {
  try {
    const { applicationIds, status, reason } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const validStatuses = ['pending', 'shortlisted', 'interview', 'rejected', 'hired'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const normalizedStatus = status.toLowerCase();

    // Update applications
    const [affectedRows] = await Application.update(
      { status: normalizedStatus, updated_at: new Date() },
      { where: { id: applicationIds } }
    );

    // Log bulk audit event
    await logAuditEvent(req.user.id, 'bulk_application_status_update', 'application', null, {
      count: applicationIds.length,
      new_status: normalizedStatus,
      reason: reason || 'Bulk admin action'
    }, req);

    res.json({
      message: `${affectedRows} applications updated successfully`,
      updated: affectedRows,
      status: normalizedStatus
    });
  } catch (error) {
    console.error('bulkUpdateApplications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk delete applications
const bulkDeleteApplications = async (req, res) => {
  try {
    const { applicationIds, reason } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required' });
    }

    const [affectedRows] = await Application.destroy({
      where: { id: applicationIds }
    });

    // Log bulk audit event
    await logAuditEvent(req.user.id, 'bulk_application_deletion', 'application', null, {
      count: applicationIds.length,
      reason: reason || 'Bulk admin action'
    }, req);

    res.json({
      message: `${affectedRows} applications deleted successfully`,
      deleted: affectedRows
    });
  } catch (error) {
    console.error('bulkDeleteApplications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== PAYMENT MANAGEMENT ==========

// Get all payments with filtering and pagination
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, service_type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (status) whereClause.status = status;
    if (service_type) whereClause.service_type = service_type;

    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
      if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Application,
          attributes: ['id', 'status'],
          include: [{ model: require('../models').Job, attributes: ['title'] }]
        }
      ]
    });

    // Get user details
    const userIds = [...new Set(payments.map(p => p.user_id).filter(Boolean))];
    const UserModel = require('../models/User');
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

    const paymentsWithUsers = payments.map(payment => ({
      ...payment.toJSON(),
      user: userMap[payment.user_id] || null
    }));

    res.json({
      payments: paymentsWithUsers,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('getAllPayments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldStatus = payment.status;
    await payment.update({
      status,
      notes: notes || payment.notes,
      updated_at: new Date()
    });

    await logAuditEvent(req.user.id, 'payment_status_updated', 'payment', id, {
      old_status: oldStatus,
      new_status: status,
      notes
    }, req);

    res.json({ message: 'Payment status updated successfully', payment });
  } catch (error) {
    console.error('updatePaymentStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const totalRevenue = await Payment.findAll({
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      where: { status: 'completed' },
      raw: true
    });

    const paymentsByType = await Payment.findAll({
      attributes: [
        'service_type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      where: { status: 'completed' },
      group: ['service_type'],
      raw: true
    });

    const monthlyRevenue = await Payment.findAll({
      attributes: [
        [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), '%Y-%m'), 'month'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      where: { status: 'completed' },
      group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), '%Y-%m')],
      order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), '%Y-%m'), 'DESC']],
      limit: 12,
      raw: true
    });

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      paymentsByType: paymentsByType || [],
      monthlyRevenue: monthlyRevenue || []
    });
  } catch (error) {
    console.error('getPaymentStats error:', error);
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
  sendBulkEmailToApplicants,
  seedTestJobs,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  changeUserRole,
  deleteUser,
  getSystemHealth,
  bulkUpdateApplications,
  bulkDeleteApplications,
  getAllPayments,
  updatePaymentStatus,
  getPaymentStats
};
