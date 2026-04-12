const UserActivityAudit = require('../models/UserActivityAudit');
const User = require('../models/User');
const { Parser } = require('json2csv');

// Helper function to get user-friendly action descriptions
const getActionDescription = (action) => {
  const descriptions = {
    'LOGIN': 'User logged in',
    'LOGOUT': 'User logged out',
    'REGISTER': 'User registered new account',
    'FAILED_LOGIN': 'Failed login attempt',
    'PASSWORD_RESET': 'Password reset',
    'EMAIL_VERIFICATION': 'Email verified',
    'ADMIN_LOGIN': 'Admin logged in',
    'APPLICATION_SUBMITTED': 'Job application submitted',
    'APPLICATION_VIEWED': 'Application viewed',
    'PROFILE_UPDATED': 'Profile updated',
    'CV_DOWNLOADED': 'CV downloaded',
    'INTERVIEW_SCHEDULED': 'Interview scheduled',
    'PAYMENT_PROCESSED': 'Payment processed',
  };
  return descriptions[action] || action.replace(/_/g, ' ');
};

// Get audit logs with filtering and pagination
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      user_id,
      start_date,
      end_date,
      ip_address,
      location,
      user_search,
      suspicious_only = false,
    } = req.query;

    const offset = (page - 1) * limit;
    const query = {};

    // Build query filters
    if (action) query.action = action;
    if (user_id) query.user_id = user_id;
    if (ip_address) query.ip_address = { $regex: ip_address, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (suspicious_only === 'true') query.suspicious = true;

    // Date range filter
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    // User search filter
    let userIds = [];
    if (user_search) {
      const users = await User.find({
        $or: [
          { name: { $regex: user_search, $options: 'i' } },
          { email: { $regex: user_search, $options: 'i' } }
        ]
      }).select('_id');
      userIds = users.map(user => user._id);
      if (userIds.length > 0) {
        query.user_id = { $in: userIds };
      } else {
        // No users found, return empty result
        return res.json({
          logs: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0,
            limit: parseInt(limit),
          },
          summary: {
            total_logs: 0,
            suspicious_count: 0,
            unique_users: 0,
            unique_ips: 0,
          }
        });
      }
    }

    // Get total count
    const total = await UserActivityAudit.countDocuments(query);

    // Get logs with user population
    const logs = await UserActivityAudit.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(offset)
      .lean();

    // Format logs for response
    const formattedLogs = logs.map(log => ({
      id: log._id,
      user: log.user_id ? {
        id: log.user_id._id,
        name: log.user_id.name,
        email: log.user_id.email,
      } : null,
      action: log.action,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      device_info: log.device_info,
      location: log.location,
      suspicious: log.suspicious,
      created_at: log.created_at,
      timestamp: new Date(log.created_at).toLocaleString(),
      details: log.details,
      // Format device info for display
      device_display: log.device_info ? {
        browser: log.device_info.browser || 'Unknown',
        device: log.device_info.device || 'Unknown',
        os: log.device_info.os || 'Unknown'
      } : { browser: 'Unknown', device: 'Unknown', os: 'Unknown' },
      // Action description for display
      action_description: getActionDescription(log.action),
    }));

    // Get summary statistics
    const summary = await getAuditSummary(query);

    const totalPages = Math.ceil(total / limit);

    res.json({
      logs: formattedLogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: totalPages,
        limit: parseInt(limit),
      },
      summary,
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get audit summary statistics
const getAuditSummary = async (query = {}) => {
  try {
    const baseQuery = { ...query };

    // Remove date filters for summary stats
    delete baseQuery.created_at;

    const [
      total_logs,
      suspicious_count,
      unique_users,
      unique_ips,
      action_counts,
    ] = await Promise.all([
      UserActivityAudit.countDocuments(baseQuery),
      UserActivityAudit.countDocuments({ ...baseQuery, suspicious: true }),
      UserActivityAudit.distinct('user_id', baseQuery).then(ids => ids.filter(id => id).length),
      UserActivityAudit.distinct('ip_address', baseQuery).then(ips => ips.length),
      UserActivityAudit.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      total_logs,
      suspicious_count,
      unique_users,
      unique_ips,
      action_breakdown: action_counts,
    };
  } catch (error) {
    console.error('Get audit summary error:', error);
    return {
      total_logs: 0,
      suspicious_count: 0,
      unique_users: 0,
      unique_ips: 0,
      action_breakdown: [],
    };
  }
};

// Export audit logs to CSV
const exportAuditLogs = async (req, res) => {
  try {
    const {
      action,
      user_id,
      start_date,
      end_date,
      ip_address,
      user_search,
      suspicious_only = false,
      format = 'csv',
    } = req.query;

    const query = {};

    // Build query filters (same as getAuditLogs)
    if (action) query.action = action;
    if (user_id) query.user_id = user_id;
    if (ip_address) query.ip_address = { $regex: ip_address, $options: 'i' };
    if (suspicious_only === 'true') query.suspicious = true;

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    if (user_search) {
      const users = await User.find({
        $or: [
          { name: { $regex: user_search, $options: 'i' } },
          { email: { $regex: user_search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(user => user._id);
      if (userIds.length > 0) {
        query.user_id = { $in: userIds };
      }
    }

    // Get all matching logs (no pagination for export)
    const logs = await UserActivityAudit.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const fields = [
        'created_at',
        'user_name',
        'user_email',
        'action',
        'ip_address',
        'device_info.browser',
        'device_info.device',
        'device_info.os',
        'suspicious',
        'location',
        'details.event',
        'details.description',
      ];

      const opts = { fields };
      const parser = new Parser(opts);

      const csvData = logs.map(log => ({
        created_at: log.created_at,
        user_name: log.user_id?.name || 'Unknown',
        user_email: log.user_id?.email || 'Unknown',
        action: log.action,
        ip_address: log.ip_address,
        'device_info.browser': log.device_info?.browser || 'Unknown',
        'device_info.device': log.device_info?.device || 'Unknown',
        'device_info.os': log.device_info?.os || 'Unknown',
        suspicious: log.suspicious ? 'Yes' : 'No',
        location: log.location || 'Unknown',
        'details.event': log.details?.event || '',
        'details.description': log.details?.description || '',
      }));

      const csv = parser.parse(csvData);

      res.header('Content-Type', 'text/csv');
      res.attachment('audit-logs.csv');
      res.send(csv);
    } else {
      // JSON export
      res.header('Content-Type', 'application/json');
      res.attachment('audit-logs.json');
      res.send(JSON.stringify(logs, null, 2));
    }

  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
};

// Get suspicious activities
const getSuspiciousActivities = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await UserActivityAudit.find({ suspicious: true })
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedLogs = logs.map(log => ({
      id: log._id,
      user: log.user_id ? {
        id: log.user_id._id,
        name: log.user_id.name,
        email: log.user_id.email,
      } : null,
      action: log.action,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      device_info: log.device_info,
      created_at: log.created_at,
      details: log.details,
    }));

    res.json({
      suspicious_activities: formattedLogs,
      count: formattedLogs.length,
    });

  } catch (error) {
    console.error('Get suspicious activities error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete old audit logs (for maintenance)
const cleanupAuditLogs = async (req, res) => {
  try {
    const { days_old = 365 } = req.body; // Default 1 year

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);

    const result = await UserActivityAudit.deleteMany({
      created_at: { $lt: cutoffDate }
    });

    res.json({
      message: `Deleted ${result.deletedCount} audit logs older than ${days_old} days`,
      deleted_count: result.deletedCount,
    });

  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    res.status(500).json({ message: 'Cleanup failed', error: error.message });
  }
};

module.exports = {
  getAuditLogs,
  getAuditSummary,
  exportAuditLogs,
  getSuspiciousActivities,
  cleanupAuditLogs,
};