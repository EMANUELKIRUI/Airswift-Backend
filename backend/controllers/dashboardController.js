const { Application, Job, Interview, User, Payment, AuditLog } = require('../models');
const settingsService = require('../services/settingsService');
const { redisClient, isRedisEnabled } = require('../config/redisClient');
const { Op } = require('sequelize');

const DASHBOARD_CACHE_TTL = 120; // seconds

const cacheRead = async (key, fetcher) => {
  if (!isRedisEnabled) {
    return fetcher();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const fresh = await fetcher();
    await redisClient.set(key, JSON.stringify(fresh), { EX: DASHBOARD_CACHE_TTL });
    return fresh;
  } catch (error) {
    console.warn('Dashboard cache error:', error.message);
    return fetcher();
  }
};

const buildDateRange = ({ range = '7d', start, end }) => {
  const now = new Date();
  let startDate;
  let endDate = end ? new Date(end) : now;

  if (start) {
    startDate = new Date(start);
  } else if (range === '30d') {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 29);
  } else if (range === '7d') {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
  } else {
    const match = String(range).match(/^(\d+)d$/);
    if (match) {
      const days = parseInt(match[1], 10);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (days - 1));
    } else {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
    }
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

const countRecordsBetween = async (Model, whereClause) => {
  return Model.count({ where: whereClause });
};

const getApplicationsInRange = async (start, end) => {
  return Application.count({
    where: {
      created_at: {
        [Op.between]: [start, end]
      }
    }
  });
};

const getJobsInRange = async (start, end) => {
  return Job.count({
    where: {
      created_at: {
        [Op.between]: [start, end]
      }
    }
  });
};

const calculateConversionRate = async (start, end) => {
  const total = await Application.count({
    where: {
      created_at: {
        [Op.between]: [start, end]
      }
    }
  });

  const hired = await Application.count({
    where: {
      status: 'hired',
      created_at: {
        [Op.between]: [start, end]
      }
    }
  });

  return total > 0 ? Number(((hired / total) * 100).toFixed(2)) : 0;
};

const calculateAverageTimeToHire = async (start, end) => {
  const where = { status: 'hired' };
  if (start && end) {
    where.created_at = {
      [Op.between]: [start, end]
    };
  }

  const hiredApplications = await Application.findAll({
    where,
    attributes: ['created_at', 'updated_at'],
    raw: true
  });

  if (!hiredApplications.length) {
    return 0;
  }

  const totalDays = hiredApplications.reduce((sum, app) => {
    const daysToHire = Math.round((new Date(app.updated_at) - new Date(app.created_at)) / (1000 * 60 * 60 * 24));
    return sum + daysToHire;
  }, 0);

  return Math.round(totalDays / hiredApplications.length);
};

/**
 * Analytics Dashboard Controllers
 * Real-time metrics for admin dashboard
 */

// Get application statistics
const getApplicationStats = async (req, res) => {
  try {
    const total = await Application.count();
    const pending = await Application.count({ where: { status: 'pending' } });
    const shortlisted = await Application.count({ where: { status: 'shortlisted' } });
    const interview = await Application.count({ where: { status: 'interview' } });
    const rejected = await Application.count({ where: { status: 'rejected' } });
    const hired = await Application.count({ where: { status: 'hired' } });

    res.json({
      total,
      pending,
      shortlisted,
      interview,
      rejected,
      hired,
      statuses: {
        pending,
        shortlisted,
        interview,
        rejected,
        hired
      }
    });
  } catch (error) {
    console.error('getApplicationStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get applications over time (for line charts)
const getApplicationsOverTime = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const applications = await Application.findAll({
      where: {
        created_at: {
          [Op.gte]: startDate
        }
      },
      attributes: ['created_at'],
      raw: true
    });

    // Group by day
    const dataMap = {};
    const dateLabels = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dataMap[dateStr] = 0;
      dateLabels.push(dateStr);
    }

    applications.forEach(app => {
      const dateStr = new Date(app.created_at).toISOString().split('T')[0];
      if (dataMap[dateStr] !== undefined) {
        dataMap[dateStr]++;
      }
    });

    const chartData = dateLabels.map(date => ({
      day: date,
      applications: dataMap[date]
    }));

    res.json(chartData);
  } catch (error) {
    console.error('getApplicationsOverTime error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get CV score distribution
const getCVScoreDistribution = async (req, res) => {
  try {
    const applications = await Application.findAll({
      attributes: ['score'],
      raw: true
    });

    // Distribute scores into buckets: 0-20, 20-40, 40-60, 60-80, 80-100
    const distribution = {
      '0-20': 0,
      '20-40': 0,
      '40-60': 0,
      '60-80': 0,
      '80-100': 0
    };

    applications.forEach(app => {
      const score = app.score || 0;
      if (score < 20) distribution['0-20']++;
      else if (score < 40) distribution['20-40']++;
      else if (score < 60) distribution['40-60']++;
      else if (score < 80) distribution['60-80']++;
      else distribution['80-100']++;
    });

    const chartData = Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      percentage: applications.length > 0 ? ((count / applications.length) * 100).toFixed(2) : 0
    }));

    res.json(chartData);
  } catch (error) {
    console.error('getCVScoreDistribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get job-wise application distribution
const getJobApplicationDistribution = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      attributes: ['id', 'title'],
    });

    const distribution = [];

    for (let job of jobs) {
      const count = await Application.count({
        where: { job_id: job.id }
      });

      distribution.push({
        jobId: job.id,
        jobTitle: job.title,
        applications: count
      });
    }

    // Sort by applications count descending
    distribution.sort((a, b) => b.applications - a.applications);

    res.json(distribution);
  } catch (error) {
    console.error('getJobApplicationDistribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get interview completion status
const getInterviewStats = async (req, res) => {
  try {
    const scheduled = await Interview.count({
      where: { status: 'scheduled' }
    });
    const inProgress = await Interview.count({
      where: { status: 'in_progress' }
    });
    const completed = await Interview.count({
      where: { status: 'completed' }
    });
    const cancelled = await Interview.count({
      where: { status: 'cancelled' }
    });

    const avgScore = await Interview.findAll({
      attributes: [[
        require('sequelize').fn('AVG', require('sequelize').col('ai_score')), 'avgScore'
      ]],
      raw: true
    });

    res.json({
      scheduled,
      inProgress,
      completed,
      cancelled,
      averageScore: avgScore[0]?.avgScore || 0,
      statistics: {
        scheduled,
        inProgress,
        completed,
        cancelled
      }
    });
  } catch (error) {
    console.error('getInterviewStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get hiring funnel (conversion rates)
const getHiringFunnel = async (req, res) => {
  try {
    const totalApplications = await Application.count();
    const interviewsScheduled = await Interview.count({
      where: {
        status: {
          [Op.in]: ['scheduled', 'in_progress', 'completed']
        }
      }
    });
    const hired = await Application.count({ where: { status: 'hired' } });
    const offerLogs = await AuditLog.count({
      where: {
        action: {
          [Op.in]: ['offer_letter_generated', 'offer_sent', 'offer_created']
        }
      }
    });

    const jobViewsLogCount = await AuditLog.count({
      where: {
        action: {
          [Op.in]: ['job_view', 'job_viewed', 'job_impression']
        }
      }
    });

    const funnel = [
      {
        stage: 'Job Views',
        count: jobViewsLogCount,
        percentage: totalApplications > 0 ? Number(((jobViewsLogCount / totalApplications) * 100).toFixed(2)) : 0
      },
      {
        stage: 'Applications Submitted',
        count: totalApplications,
        percentage: 100
      },
      {
        stage: 'Interviews Scheduled',
        count: interviewsScheduled,
        percentage: totalApplications > 0 ? Number(((interviewsScheduled / totalApplications) * 100).toFixed(2)) : 0
      },
      {
        stage: 'Offers Made',
        count: offerLogs,
        percentage: totalApplications > 0 ? Number(((offerLogs / totalApplications) * 100).toFixed(2)) : 0
      },
      {
        stage: 'Hires',
        count: hired,
        percentage: totalApplications > 0 ? Number(((hired / totalApplications) * 100).toFixed(2)) : 0
      }
    ];

    res.json(funnel);
  } catch (error) {
    console.error('getHiringFunnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get revenue/payment stats
const getPaymentStats = async (req, res) => {
  try {
    const totalRevenue = await Payment.findAll({
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      raw: true
    });

    const paymentsByType = await Payment.findAll({
      attributes: [
        'service_type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      group: ['service_type'],
      raw: true
    });

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      paymentsByType: paymentsByType || []
    });
  } catch (error) {
    console.error('getPaymentStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get top performing skills (most common in hired applications)
const getTopSkills = async (req, res) => {
  try {
    const hiredApplications = await Application.findAll({
      where: { status: 'hired' },
      attributes: ['skills'],
      raw: true
    });

    const skillCount = {};
    hiredApplications.forEach(app => {
      if (app.skills && Array.isArray(app.skills)) {
        app.skills.forEach(skill => {
          skillCount[skill] = (skillCount[skill] || 0) + 1;
        });
      }
    });

    const topSkills = Object.entries(skillCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(topSkills);
  } catch (error) {
    console.error('getTopSkills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get average time to hire
const getAverageTimeToHire = async (req, res) => {
  try {
    const averageDays = await calculateAverageTimeToHire();
    const hiredApplications = await Application.count({ where: { status: 'hired' } });

    res.json({
      days: averageDays,
      candidates: hiredApplications
    });
  } catch (error) {
    console.error('getAverageTimeToHire error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const summary = await cacheRead('dashboard:summary', async () => {
      const totalApplications = await Application.count();
      const activeJobs = await Job.count({ where: { status: 'active' } });
      const totalInterviews = await Interview.count();
      const totalHired = await Application.count({ where: { status: 'hired' } });
      const conversionRate = totalApplications > 0 ? Number(((totalHired / totalApplications) * 100).toFixed(2)) : 0;
      const avgTimeToHire = await calculateAverageTimeToHire();

      const { startDate, endDate } = buildDateRange({ range: '30d' });
      const previousStart = new Date(startDate);
      const previousEnd = new Date(endDate);
      previousStart.setDate(previousStart.getDate() - 30);
      previousEnd.setDate(previousEnd.getDate() - 30);

      const [currentApplications, previousApplications, currentJobs, previousJobs, currentConversion, previousConversion, currentTimeToHire, previousTimeToHire] = await Promise.all([
        getApplicationsInRange(startDate, endDate),
        getApplicationsInRange(previousStart, previousEnd),
        getJobsInRange(startDate, endDate),
        getJobsInRange(previousStart, previousEnd),
        calculateConversionRate(startDate, endDate),
        calculateConversionRate(previousStart, previousEnd),
        calculateAverageTimeToHire(startDate, endDate),
        calculateAverageTimeToHire(previousStart, previousEnd)
      ]);

      return {
        totalApplications,
        activeJobs,
        conversionRate,
        avgTimeToHire,
        growth: {
          applications: calculateGrowth(currentApplications, previousApplications),
          jobs: calculateGrowth(currentJobs, previousJobs),
          conversion: calculateGrowth(currentConversion, previousConversion),
          timeToHire: calculateGrowth(currentTimeToHire, previousTimeToHire)
        },
        summary: {
          totalApplications,
          activeJobs,
          totalInterviews,
          totalHired,
          conversionRate,
          avgTimeToHire
        }
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardTrends = async (req, res) => {
  try {
    const { range, start, end } = req.query;
    const { startDate, endDate } = buildDateRange({ range: range || '7d', start, end });
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const applications = await Application.findAll({
      where: {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['created_at'],
      raw: true
    });

    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    applications.forEach(app => {
      const key = new Date(app.created_at).toISOString().split('T')[0];
      if (dayMap[key] !== undefined) {
        dayMap[key]++;
      }
    });

    const trendData = Object.keys(dayMap).map(date => ({
      date,
      applications: dayMap[date]
    }));

    res.json({
      range: range || '7d',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data: trendData
    });
  } catch (error) {
    console.error('getDashboardTrends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardActivities = async (req, res) => {
  try {
    const applications = await Application.findAll({
      limit: 15,
      order: [['created_at', 'DESC']],
      include: [{ model: Job, attributes: ['title'] }],
      raw: true,
      nest: true
    });

    const jobs = await Job.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      raw: true
    });

    const interviews = await Interview.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [{ model: Application, include: [{ model: Job, attributes: ['title'] }] }],
      raw: true,
      nest: true
    });

    const users = await User.find({}).sort({ createdAt: -1 }).limit(10).lean();

    const auditLogs = await AuditLog.findAll({
      limit: 15,
      order: [['created_at', 'DESC']],
      raw: true
    });

    const buildActivity = (item) => ({
      id: item.id || `${item.resource}_${item.resource_id}_${item.action}`,
      timestamp: item.created_at || item.createdAt || new Date(),
      type: item.type || item.resource || 'activity',
      action: item.action || 'updated',
      resource: item.resource || 'generic',
      resourceId: item.resource_id || item.id || null,
      title: item.title || item.job?.title || item.Job?.title || item.name || item.action,
      details: item.details || item.status || '',
      summary: item.summary || '',
      raw: item
    });

    const applicationActivities = applications.map((application) => buildActivity({
      id: `application_${application.id}`,
      created_at: application.created_at,
      type: 'application',
      action: application.status === 'hired' ? 'hired' : 'applied',
      resource: 'application',
      resource_id: application.id,
      title: application.Job?.title || 'Application',
      details: `${application.candidate_name || 'Candidate'} applied for ${application.Job?.title || 'a role'}`
    }));

    const jobActivities = jobs.map((job) => buildActivity({
      id: `job_${job.id}`,
      created_at: job.created_at,
      type: 'job',
      action: 'job_posted',
      resource: 'job',
      resource_id: job.id,
      title: job.title,
      details: `New job posted: ${job.title}`
    }));

    const interviewActivities = interviews.map((interview) => buildActivity({
      id: `interview_${interview.id}`,
      created_at: interview.created_at,
      type: 'interview',
      action: 'interview_scheduled',
      resource: 'interview',
      resource_id: interview.id,
      title: interview.Application?.Job?.title || 'Interview',
      details: `Interview scheduled for ${interview.Application?.Job?.title || 'a candidate'} on ${new Date(interview.scheduled_at).toLocaleString()}`
    }));

    const userActivities = users.map((user) => buildActivity({
      id: `user_${user._id}`,
      created_at: user.createdAt,
      type: 'user',
      action: 'user_registered',
      resource: 'user',
      resource_id: user._id,
      title: user.name || user.email,
      details: `New user registered: ${user.name || user.email}`
    }));

    const auditActivities = auditLogs.map((log) => buildActivity({
      id: `audit_${log.id}`,
      created_at: log.created_at,
      type: 'audit',
      action: log.action,
      resource: log.resource,
      resource_id: log.resource_id,
      title: `${log.action} ${log.resource}`,
      details: log.details ? JSON.stringify(log.details) : ''
    }));

    const feed = [...applicationActivities, ...jobActivities, ...interviewActivities, ...userActivities, ...auditActivities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);

    res.json({ activities: feed, count: feed.length });
  } catch (error) {
    console.error('getDashboardActivities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardSettingsSummary = async (req, res) => {
  try {
    const [platformName, currencySetting, maintenanceSetting, featureFlags] = await Promise.all([
      settingsService.getSettingByKey('platform_name'),
      settingsService.getSettingByKey('currency'),
      settingsService.getSettingByKey('maintenance_mode'),
      settingsService.getFeatureFlags()
    ]);

    res.json({
      platformName: platformName?.value || 'Airswift',
      currency: currencySetting?.value || 'USD',
      maintenanceMode: maintenanceSetting?.value || false,
      featureFlags
    });
  } catch (error) {
    console.error('getDashboardSettingsSummary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getApplicationStats,
  getApplicationsOverTime,
  getCVScoreDistribution,
  getJobApplicationDistribution,
  getInterviewStats,
  getHiringFunnel,
  getPaymentStats,
  getTopSkills,
  getAverageTimeToHire,
  getDashboardSummary,
  getDashboardTrends,
  getDashboardActivities,
  getDashboardSettingsSummary
};
