const { Application, Job, Interview, User, Payment } = require('../models');
const { Op } = require('sequelize');

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
    const total = await Application.count();
    const shortlisted = await Application.count({ where: { status: { [Op.in]: ['shortlisted', 'interview', 'hired'] } } });
    const interviewed = await Application.count({ where: { status: { [Op.in]: ['interview', 'hired'] } } });
    const hired = await Application.count({ where: { status: 'hired' } });

    const funnel = [
      { stage: 'Applications', count: total, percentage: 100 },
      { stage: 'Shortlisted', count: shortlisted, percentage: total > 0 ? ((shortlisted / total) * 100).toFixed(2) : 0 },
      { stage: 'Interviewed', count: interviewed, percentage: total > 0 ? ((interviewed / total) * 100).toFixed(2) : 0 },
      { stage: 'Hired', count: hired, percentage: total > 0 ? ((hired / total) * 100).toFixed(2) : 0 }
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
    const hiredApplications = await Application.findAll({
      where: { status: 'hired' },
      attributes: ['created_at', 'updated_at'],
      raw: true
    });

    if (hiredApplications.length === 0) {
      return res.json({ days: 0, candidates: 0 });
    }

    const totalDays = hiredApplications.reduce((sum, app) => {
      const daysToHire = Math.floor((new Date(app.updated_at) - new Date(app.created_at)) / (1000 * 60 * 60 * 24));
      return sum + daysToHire;
    }, 0);

    const averageDays = Math.round(totalDays / hiredApplications.length);

    res.json({
      days: averageDays,
      candidates: hiredApplications.length
    });
  } catch (error) {
    console.error('getAverageTimeToHire error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const totalApplications = await Application.count();
    const totalJobs = await Job.count();
    const totalInterviews = await Interview.count();
    const totalHired = await Application.count({ where: { status: 'hired' } });
    const avgScore = await Application.findAll({
      attributes: [[
        require('sequelize').fn('AVG', require('sequelize').col('score')), 'avg'
      ]],
      raw: true
    });

    res.json({
      totalApplications,
      totalJobs,
      totalInterviews,
      totalHired,
      averageScore: avgScore[0]?.avg || 0,
      summary: {
        applications: totalApplications,
        jobs: totalJobs,
        interviews: totalInterviews,
        hired: totalHired
      }
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
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
  getDashboardSummary
};
