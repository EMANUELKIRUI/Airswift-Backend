const express = require('express');
const { getJobs, getJobById, createJob, updateJob, deleteJob, getAllJobsAdmin, getJobCategories, createJobCategory, updateJobCategory, deleteJobCategory, getJobCategoryDashboard, getInterviewPipeline } = require('../controllers/jobController');
const { protect, permit } = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const User = require('../models/User');

const router = express.Router();

// Public routes
router.get('/categories', getJobCategories);
router.get('/', getJobs);
router.get('/:id', getJobById);

// Admin category management (requires manage_jobs permission)
router.post('/categories', protect, permit('manage_jobs'), createJobCategory);
router.put('/categories/:id', protect, permit('manage_jobs'), updateJobCategory);
router.delete('/categories/:id', protect, permit('manage_jobs'), deleteJobCategory);

// Admin dashboards (requires view_dashboard permission)
router.get('/dashboard/categories', protect, permit('view_dashboard'), getJobCategoryDashboard);
router.get('/dashboard/interview-pipeline', protect, permit('view_dashboard'), getInterviewPipeline);

// Admin routes (requires manage_jobs permission)
router.post('/', protect, permit('manage_jobs'), createJob);
router.put('/:id', protect, permit('manage_jobs'), updateJob);
router.delete('/:id', protect, permit('manage_jobs'), deleteJob);
router.get('/admin/all', protect, permit('manage_jobs'), getAllJobsAdmin);

// Job Search routes
const JobMongoose = require("../models/JobMongoose");

// Advanced Job Search API
router.get("/search", async (req, res) => {
  try {
    const {
      keyword,
      location,
      category,
      minSalary,
      maxSalary,
      remote,
      type,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = { status: 'active' };

    // Keyword search (title, description, skills)
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { skills: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    // Location filter
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Category filter
    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    // Job type filter
    if (type) {
      filter.type = { $regex: type, $options: "i" };
    }

    // Salary filter
    if (minSalary || maxSalary) {
      filter.$and = filter.$and || [];
      if (minSalary) {
        filter.$and.push({ salaryMax: { $gte: Number(minSalary) } });
      }
      if (maxSalary) {
        filter.$and.push({ salaryMin: { $lte: Number(maxSalary) } });
      }
    }

    // Remote filter
    if (remote === "true") {
      filter.isRemote = true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const jobs = await JobMongoose.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');

    const total = await JobMongoose.countDocuments(filter);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      jobs,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Smart Search with MongoDB text search
router.get("/smart-search", async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required for smart search" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const jobs = await JobMongoose.find({
      $text: { $search: keyword },
      status: 'active',
    })
    .sort({ score: { $meta: "textScore" } })
    .skip(skip)
    .limit(Number(limit))
    .populate('createdBy', 'name');

    const total = await JobMongoose.countDocuments({
      $text: { $search: keyword },
      status: 'active',
    });

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      jobs,
    });
  } catch (err) {
    console.error('Smart search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Job Ranking - Personalized recommendations
router.get("/recommendations", protect, async (req, res) => {
  try {
    // ✅ FIX 5: Validate req.user exists before accessing properties
    if (!req.user || !req.user.id) {
      console.error("❌ RECOMMENDATIONS FAILED: req.user is missing or has no id");
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "User authentication required"
      });
    }

    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all active jobs
    const jobs = await JobMongoose.find({ status: 'active' }).populate('createdBy', 'name');

    // Rank jobs based on user profile
    const rankedJobs = rankJobs(jobs, user).slice(0, Number(limit));

    res.json({
      total: rankedJobs.length,
      recommendations: rankedJobs,
    });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Job Ranking function
const rankJobs = (jobs, userProfile) => {
  return jobs.map((job) => {
    let score = 0;
    let matchReasons = [];

    // Skill match (highest weight)
    if (userProfile.skills && userProfile.skills.length > 0) {
      const skillMatches = job.skills.filter((skill) =>
        userProfile.skills.some(userSkill =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );

      if (skillMatches.length > 0) {
        score += skillMatches.length * 25;
        matchReasons.push(`${skillMatches.length} skill match(es): ${skillMatches.join(', ')}`);
      }
    }

    // Location match
    if (userProfile.location && job.location) {
      if (job.location.toLowerCase().includes(userProfile.location.toLowerCase()) ||
          userProfile.location.toLowerCase().includes(job.location.toLowerCase())) {
        score += 15;
        matchReasons.push('Location match');
      }
    }

    // Remote preference
    if (userProfile.isRemotePreferred && job.isRemote) {
      score += 10;
      matchReasons.push('Remote work available');
    }

    // Experience level match (based on job type and user experience)
    if (userProfile.experience && job.type) {
      const userExpYears = extractYearsOfExperience(userProfile.experience);
      const jobLevel = getJobLevel(job.type);

      if (Math.abs(userExpYears - jobLevel) <= 2) {
        score += 10;
        matchReasons.push('Experience level match');
      }
    }

    // Salary compatibility
    if (userProfile.expectedSalary && job.salaryMin && job.salaryMax) {
      if (userProfile.expectedSalary >= job.salaryMin && userProfile.expectedSalary <= job.salaryMax) {
        score += 5;
        matchReasons.push('Salary compatibility');
      }
    }

    return {
      ...job.toObject(),
      matchScore: score,
      matchReasons,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
};

// Helper functions for job ranking
const extractYearsOfExperience = (experience) => {
  const match = experience.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const getJobLevel = (jobType) => {
  const levels = {
    'internship': 0,
    'entry-level': 1,
    'junior': 2,
    'mid-level': 3,
    'senior': 5,
    'lead': 7,
    'manager': 8,
    'director': 10,
  };
  return levels[jobType.toLowerCase()] || 3;
};

module.exports = router;