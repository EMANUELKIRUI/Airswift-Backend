const Job = require('../models/Job');
const User = require('../models/User');

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      attributes: ['id', 'title', 'description', 'location', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    const { title, description, location } = req.body;
    const userId = req.user.id;

    // Check if user is admin
    const user = await User.findByPk(userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create jobs' });
    }

    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Title, description, and location required' });
    }

    const job = await Job.create({
      title,
      description,
      location
    });

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
};
