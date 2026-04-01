const Joi = require('joi');
const { Application, Job, Profile, Payment } = require('../models');
const { sendEmail } = require('../utils/notifications');

const applySchema = Joi.object({
  job_id: Joi.number().integer().required(),
  cover_letter: Joi.string(),
});

const applyForJob = async (req, res) => {
  try {
    const { error } = applySchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { job_id, cover_letter } = req.body;

    // Check if job exists and is active
    const job = await Job.findByPk(job_id);
    if (!job || job.status !== 'active') return res.status(404).json({ message: 'Job not found or inactive' });

    // Check if user has profile and CV
    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (!profile || !profile.cv_url) return res.status(400).json({ message: 'Complete your profile and upload CV first' });

    // Check if already applied
    const existingApplication = await Application.findOne({ where: { job_id, user_id: req.user.id } });
    if (existingApplication) return res.status(400).json({ message: 'Already applied for this job' });

    const application = await Application.create({ job_id, user_id: req.user.id, cover_letter });

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

    const application = await Application.findByPk(req.params.id, { include: [{ model: Job }, { model: require('../models').User }] });

    // If interview scheduled, create interview fee payment
    if (status === 'interview') {
      const profile = await Profile.findOne({ where: { user_id: application.user_id } });
      if (profile && profile.phone_number) {
        await Payment.create({
          user_id: application.user_id,
          phone_number: profile.phone_number,
          amount: 3000,
          service_type: 'interview_fee',
        });
      }
    }

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

    // Notify user
    const user = application.User;
    if (user) {
      await sendEmail(user.email, 'Application Status Update', `Your application for ${application.Job.title} is now ${status}`);
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getAllApplicationsAdmin,
  updateApplicationStatus,
};