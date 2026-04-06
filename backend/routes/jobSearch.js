const express = require("express");
const Job = require("../models/JobMongoose");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

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

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');

    const total = await Job.countDocuments(filter);

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

    const jobs = await Job.find({
      $text: { $search: keyword },
      status: 'active',
    })
    .sort({ score: { $meta: "textScore" } })
    .skip(skip)
    .limit(Number(limit))
    .populate('createdBy', 'name');

    const total = await Job.countDocuments({
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
router.get("/recommendations", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all active jobs
    const jobs = await Job.find({ status: 'active' }).populate('createdBy', 'name');

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
      const expectedSalary = Number(userProfile.expectedSalary);
      if (expectedSalary >= job.salaryMin && expectedSalary <= job.salaryMax) {
        score += 5;
        matchReasons.push('Salary range match');
      }
    }

    return {
      ...job.toObject(),
      matchScore: score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['General match'],
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
};

// Helper functions
const extractYearsOfExperience = (experienceString) => {
  const match = experienceString.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const getJobLevel = (jobType) => {
  const levels = {
    'Entry-level': 0,
    'Junior': 1,
    'Mid-level': 3,
    'Senior': 5,
    'Lead': 7,
    'Principal': 10,
  };
  return levels[jobType] || 3; // Default to mid-level
};

module.exports = router;