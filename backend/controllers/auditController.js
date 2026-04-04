const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

// Get audit logs with filtering
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      user_id,
      start_date,
      end_date,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (action) whereClause.action = action;
    if (resource) whereClause.resource = resource;
    if (user_id) whereClause.user_id = user_id;

    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
      if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['name', 'email'], as: 'user' }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      logs,
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

module.exports = {
  getAuditLogs,
  getAuditStats,
};