const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID required' });
    }

    // Check if job exists
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      where: { userId, jobId }
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Create application
    const application = await Application.create({
      userId,
      jobId,
      status: 'applied'
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to apply', error: error.message });
  }
};

exports.getAdminApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is admin
    const user = await User.findByPk(userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view applications' });
    }

    const applications = await Application.findAll({
      include: [
        { model: User, attributes: ['id', 'email', 'name'] },
        { model: Job, attributes: ['id', 'title', 'description', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
};
