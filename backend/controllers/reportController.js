const Joi = require('joi');
const { Report, User } = require('../models');

const createReportSchema = Joi.object({
  reported_user_id: Joi.number().integer().optional().allow(null),
  type: Joi.string().valid('login_issue', 'unethical_activity', 'other').required(),
  description: Joi.string().min(10).required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'investigating', 'resolved', 'dismissed').required(),
});

const createReport = async (req, res) => {
  try {
    const { error } = createReportSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const reporter_id = req.user?.id || null;
    const { reported_user_id, type, description } = req.body;

    const report = await Report.create({
      reporter_id,
      reported_user_id,
      type,
      description,
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reporter_id = req.user.id;

    const reports = await Report.findAll({
      where: { reporter_id },
      order: [['created_at', 'DESC']],
    });

    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(limit);

    const reports = await Report.findAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reportedUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = updateStatusSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const { status } = req.body;
    report.status = status;
    report.updated_at = new Date();
    await report.save();

    res.json({ message: 'Report status updated', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
};