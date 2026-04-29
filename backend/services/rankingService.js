const Application = require("../models/ApplicationMongoose");
const Notification = require("../models/Notification");

/**
 * Rank candidates for a specific job based on AI scores
 * @param {String} jobId - Job ID to rank candidates for
 * @returns {Promise<Array>} Sorted array of ranked applications
 */
exports.rankCandidates = async (jobId) => {
  try {
    const apps = await Application.find({ jobId }).sort({ "aiScore.total": -1 });

    if (apps.length === 0) {
      console.log(`No applications found for job ${jobId}`);
      return [];
    }

    // Update rank for each application
    const updatePromises = apps.map(async (app, index) => {
      app.rank = index + 1;
      await app.save();
      return app;
    });

    const rankedApps = await Promise.all(updatePromises);

    // Log ranking completion
    console.log(`✅ Ranked ${rankedApps.length} candidates for job ${jobId}`);

    return rankedApps;
  } catch (error) {
    console.error("Error ranking candidates:", error);
    throw error;
  }
};

/**
 * Get top N candidates globally or for a specific job
 * @param {Number} limit - Number of top candidates to return
 * @param {String} jobId - Optional job ID to filter by
 * @returns {Promise<Array>} Array of top candidates
 */
exports.getTopCandidates = async (limit = 20, jobId = null) => {
  try {
    const filter = jobId ? { jobId } : {};

    const topCandidates = await Application.find(filter)
      .sort({ "aiScore.total": -1, rank: 1 })
      .limit(limit)
      .populate("userId", "name email phone profilePicture")
      .populate("jobId", "title location");

    return topCandidates;
  } catch (error) {
    console.error("Error fetching top candidates:", error);
    throw error;
  }
};

/**
 * Calculate candidate AI score from multiple factors
 * @param {Object} candidateData - Candidate data with skills, experience, etc.
 * @returns {Object} AI score breakdown
 */
exports.calculateAIScore = (candidateData) => {
  try {
    const {
      skills = [],
      experience = 0,
      communicationRating = 0,
      projectsCount = 0,
      educationLevel = 0,
    } = candidateData;

    // Skills score (0-30 points)
    const skillsScore = Math.min(skills.length * 5, 30);

    // Experience score (0-30 points) - 5 points per year, max 30
    const experienceScore = Math.min(experience * 3, 30);

    // Communication score (0-20 points)
    const communicationScore = Math.min(communicationRating, 20);

    // Projects/Portfolio score (0-15 points)
    const projectsScore = Math.min(projectsCount * 3, 15);

    // Education score (0-5 points)
    const educationScore = educationLevel > 0 ? 5 : 0;

    const totalScore = skillsScore + experienceScore + communicationScore + projectsScore + educationScore;

    return {
      total: Math.round(totalScore),
      skills: skillsScore,
      experience: experienceScore,
      communication: communicationScore,
      projects: projectsScore,
      education: educationScore,
    };
  } catch (error) {
    console.error("Error calculating AI score:", error);
    throw error;
  }
};

/**
 * Notify admins about top candidates
 * @param {String} jobId - Job ID
 * @param {Number} topCount - Number of top candidates to notify about
 */
exports.notifyAdminsAboutTopCandidates = async (jobId, topCount = 5) => {
  try {
    const topCandidates = await exports.getTopCandidates(topCount, jobId);

    if (topCandidates.length === 0) {
      return;
    }

    const candidateNames = topCandidates
      .map((app, idx) => `${idx + 1}. ${app.userId?.name || "Unknown"}`)
      .join("\n");

    // Create notification for all admins
    const admins = await require("../models/User").find({ role: "admin" });

    const notifications = admins.map((admin) => ({
      userId: admin._id,
      title: "Top Candidates Ready",
      message: `Top ${topCount} candidates ranked for this job:\n${candidateNames}`,
      type: "system",
      link: `/admin/jobs/${jobId}/candidates`,
    }));

    await Notification.insertMany(notifications);

    // Emit real-time notification
    if (global.io) {
      admins.forEach((admin) => {
        global.io.to(`user_${admin._id}`).emit("notification", {
          title: "Top Candidates Ready",
          message: `New top candidates available for review`,
          type: "system",
          jobId,
        });
      });
    }

    console.log(`✅ Admin notifications sent for job ${jobId}`);
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
};

/**
 * Get ranking statistics for a job
 * @param {String} jobId - Job ID
 * @returns {Promise<Object>} Ranking statistics
 */
exports.getRankingStats = async (jobId) => {
  try {
    const apps = await Application.find({ jobId });

    const scores = apps.map((app) => app.aiScore?.total || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return {
      totalCandidates: apps.length,
      averageScore: avgScore,
      maxScore,
      minScore,
      scoreDistribution: {
        excellent: apps.filter((a) => a.aiScore?.total >= 80).length,
        good: apps.filter((a) => (a.aiScore?.total || 0) >= 60 && (a.aiScore?.total || 0) < 80).length,
        average: apps.filter((a) => (a.aiScore?.total || 0) >= 40 && (a.aiScore?.total || 0) < 60).length,
        poor: apps.filter((a) => (a.aiScore?.total || 0) < 40).length,
      },
    };
  } catch (error) {
    console.error("Error calculating ranking stats:", error);
    throw error;
  }
};
