const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Get audit logs with filtering
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      user_id,
      adminId,
      from,
      to,
      start_date,
      end_date,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (action) whereClause.action = action;
    if (resource) whereClause.resource = resource;
    if (user_id) whereClause.user_id = user_id;
    if (adminId) whereClause.user_id = adminId;

    if (from || to || start_date || end_date) {
      whereClause.created_at = {};
      if (from) whereClause.created_at[Op.gte] = new Date(from);
      if (to) whereClause.created_at[Op.lte] = new Date(to);
      if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
      if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

    const logsWithUser = logs.map((log) => ({
      ...log.toJSON(),
      user: userMap[log.user_id] ? { name: userMap[log.user_id].name, email: userMap[log.user_id].email } : null,
    }));

    res.json({
      logs: logsWithUser,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get audit statistics
const getAuditStats = async (req, res) => {
  try {
    const totalLogs = await AuditLog.count();

    const actionStats = await AuditLog.findAll({
      attributes: [
        'action',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('action')), 'count']
      ],
      group: ['action'],
      order: [[AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('action')), 'DESC']],
    });

    const resourceStats = await AuditLog.findAll({
      attributes: [
        'resource',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('resource')), 'count']
      ],
      group: ['resource'],
      order: [[AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('resource')), 'DESC']],
    });

    // Recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivity = await AuditLog.count({
      where: {
        created_at: {
          [Op.gte]: yesterday,
        },
      },
    });

    res.json({
      totalLogs,
      actionStats,
      resourceStats,
      recentActivity,
    });
  } catch (error) {
    console.error('getAuditStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const buildAuditFilter = (query) => {
  const {
    action,
    resource,
    user_id,
    adminId,
    from,
    to,
    start_date,
    end_date,
  } = query;

  const whereClause = {};
  if (action) whereClause.action = action;
  if (resource) whereClause.resource = resource;
  if (user_id) whereClause.user_id = user_id;
  if (adminId) whereClause.user_id = adminId;

  if (from || to || start_date || end_date) {
    whereClause.created_at = {};
    if (from) whereClause.created_at[Op.gte] = new Date(from);
    if (to) whereClause.created_at[Op.lte] = new Date(to);
    if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
    if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
  }

  return whereClause;
};

const exportAuditCsv = async (req, res) => {
  try {
    const whereClause = buildAuditFilter(req.query);
    const logs = await AuditLog.findAll({ where: whereClause, order: [['created_at', 'DESC']] });
    const parser = new Parser({
      fields: [
        'id',
        'user_id',
        'action',
        'resource',
        'details',
        'description',
        'ip_address',
        'device',
        'location',
        'status',
        'created_at',
      ],
    });
    const csv = parser.parse(logs.map((log) => log.toJSON()));

    res.header('Content-Type', 'text/csv');
    res.attachment('audit-logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('exportAuditCsv error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const exportAuditPdf = async (req, res) => {
  try {
    const whereClause = buildAuditFilter(req.query);
    const logs = await AuditLog.findAll({ where: whereClause, order: [['created_at', 'DESC']] });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.pdf"');

    doc.pipe(res);
    doc.fontSize(18).text('Audit Logs', { align: 'center' });
    doc.moveDown();

    logs.forEach((log) => {
      const item = log.toJSON();
      doc.fontSize(10).text(`Date: ${new Date(item.created_at).toISOString()}`);
      doc.text(`Action: ${item.action}`);
      doc.text(`Admin/User: ${item.user_id || 'N/A'}`);
      doc.text(`Resource: ${item.resource || 'N/A'}`);
      doc.text(`Status: ${item.status}`);
      doc.text(`Description: ${item.description || 'N/A'}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('exportAuditPdf error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAuditLogs,
  getAuditStats,
  exportAuditCsv,
  exportAuditPdf,
};