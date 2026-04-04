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

const { Application, Job, User } = require('../models');
const { sendEmail } = require('../services/emailService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('../utils/auditLogger');

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: Job, attributes: ['id', 'title', 'location'] },
        { model: User, attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    // Format applications for frontend compatibility
    const formattedApplications = applications.map(app => ({
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
      User: app.User,
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
    const users = await User.count();
    const applications = await Application.count();
    const jobs = await Job.count();

    res.json({ users, applications, jobs });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendInterview = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['name', 'email'] }],
    });

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const applicant = application.User;
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
        { model: User, attributes: ['name', 'email'] },
        { model: Job, attributes: ['title', 'location'] }
      ],
    });

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const applicant = application.User;
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
};
