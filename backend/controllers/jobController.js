const Joi = require('joi');
const { Op } = require('sequelize');
const { Job, JobCategory, Application, User } = require('../models');

const jobSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  category_id: Joi.number().integer().required(),
  salary_min: Joi.number().integer(),
  salary_max: Joi.number().integer(),
  location: Joi.string(),
  requirements: Joi.string(),
  expiry_date: Joi.date(),
});

const getJobCategories = async (req, res) => {
  try {
    const categories = await JobCategory.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
    });
    res.json({ categories });
  } catch (error) {
    console.error('getJobCategories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getJobs = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const where = { status: 'active' };

    if (category) {
      if (!Number.isNaN(Number(category))) {
        where.category_id = Number(category);
      } else {
        const categoryRecord = await JobCategory.findOne({ where: { name: category } });
        if (categoryRecord) where.category_id = categoryRecord.id;
      }
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const order = [];
    if (sort?.toLowerCase() === 'az') order.push(['title', 'ASC']);
    else if (sort?.toLowerCase() === 'za') order.push(['title', 'DESC']);

    const jobs = await Job.findAll({
      where,
      order,
      attributes: ['id', 'title', 'location'],
    });

    // Map output to _id for frontend compatibility
    const formattedJobs = jobs.map((job) => ({
      _id: job.id.toString(),
      title: job.title,
      location: job.location,
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error('getJobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{ model: JobCategory, as: 'category', attributes: ['id', 'name'] }],
    });
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

    const category = await JobCategory.findByPk(req.body.category_id);
    if (!category) return res.status(400).json({ message: 'Invalid category_id' });

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

    if (req.body.category_id) {
      const category = await JobCategory.findByPk(req.body.category_id);
      if (!category) return res.status(400).json({ message: 'Invalid category_id' });
    }

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
    const jobs = await Job.findAll({ include: [{ model: JobCategory, as: 'category', attributes: ['id', 'name'] }] });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createJobCategory = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const [category, created] = await JobCategory.findOrCreate({ where: { name: req.body.name }, defaults: { description: req.body.description } });
    if (!created) return res.status(400).json({ message: 'Category already exists' });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateJobCategory = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const [updated] = await JobCategory.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Job category not found' });

    const category = await JobCategory.findByPk(req.params.id);
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteJobCategory = async (req, res) => {
  try {
    const deleted = await JobCategory.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Job category not found' });
    res.json({ message: 'Job category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getJobCategoryDashboard = async (req, res) => {
  try {
    const categories = await JobCategory.findAll({
      include: [{ model: Job, attributes: [] }],
      attributes: ['id', 'name', [Job.sequelize.fn('COUNT', Job.sequelize.col('Jobs.id')), 'job_count']],
      group: ['JobCategory.id'],
      order: [['name', 'ASC']],
    });
    res.json({ categories });
  } catch (error) {
    console.error('getJobCategoryDashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getInterviewPipeline = async (req, res) => {
  try {
    const applications = await Application.findAll({
      include: [
        { model: Job, attributes: ['id', 'title'] },
        { model: User, attributes: ['id', 'name', 'email'] },
      ],
    });

    const pipeline = applications.map((app) => ({
      application_id: app.id,
      applicant: app.User ? { id: app.User.id, name: app.User.name, email: app.User.email } : null,
      job: app.Job ? { id: app.Job.id, title: app.Job.title } : null,
      status: app.status,
      interview_attended: app.interview_attended,
      zoom_meet_url: app.zoom_meet_url,
    }));

    res.json({ pipeline });
  } catch (error) {
    console.error('getInterviewPipeline error:', error);
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
  getJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobCategoryDashboard,
  getInterviewPipeline,
}; 