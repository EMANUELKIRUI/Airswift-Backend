const Joi = require('joi');
const { Job } = require('../models');

const jobSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string(),
  salary_min: Joi.number().integer(),
  salary_max: Joi.number().integer(),
  location: Joi.string(),
  requirements: Joi.string(),
});

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({ where: { status: 'active' } });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createJob = async (req, res) => {
  try {
    const { error } = jobSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const job = await Job.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateJob = async (req, res) => {
  try {
    const { error } = jobSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const [updated] = await Job.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Job not found' });

    const job = await Job.findByPk(req.params.id);
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const deleted = await Job.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Job not found' });

    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllJobsAdmin = async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getAllJobsAdmin,
};en 