const Application = require("../models/ApplicationMongoose");
const Job = require("../models/Job");

/**
 * Rank candidates for a specific job based on their AI scores
 * @param {string} jobId - The job ID
 * @returns {Promise<Array>} Sorted and ranked applications
 */
exports.rankCandidates = async (jobId) => {
  try {
    const applications = await Application.find({ jobId })
      .populate("userId", "name email")
      .populate("jobId", "title company");

    // Sort by total AI score in descending order
    const sorted = applications.sort((a, b) => {
      const scoreA = a.aiScore?.total || 0;
      const scoreB = b.aiScore?.total || 0;
      return scoreB - scoreA;
    });

    // Assign rank to each application
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1;
      await sorted[i].save();
    }

    return sorted;
  } catch (error) {
    console.error("Error ranking candidates:", error);
    throw error;
  }
};

/**
 * Get top candidates across all jobs or for a specific job
 * @param {string} jobId - Optional job ID to filter by
 * @param {number} limit - Number of top candidates to return (default 20)
 * @returns {Promise<Array>} Top ranked candidates
 */
exports.getTopCandidates = async (jobId, limit = 20) => {
  try {
    const query = Application.find()
      .sort({ "aiScore.total": -1 })
      .limit(limit)
      .populate("userId", "name email phone location")
      .populate("jobId", "title company salary");

    if (jobId) {
      query.where({ jobId });
    }

    const candidates = await query.exec();
    return candidates;
  } catch (error) {
    console.error("Error fetching top candidates:", error);
    throw error;
  }
};

/**
 * Calculate and update AI score for an application
 * Usually called after CV parsing/analysis
 * @param {string} applicationId - Application ID
 * @param {object} scoreData - Score breakdown { skills, experience, communication }
 * @returns {Promise<object>} Updated application
 */
exports.updateAIScore = async (applicationId, scoreData) => {
  try {
    const { skills = 0, experience = 0, communication = 0 } = scoreData;
    
    // Calculate total as average of all scores
    const total = Math.round((skills + experience + communication) / 3);

    const application = await Application.findByIdAndUpdate(
      applicationId,
      {
        "aiScore.skills": Math.min(100, Math.max(0, skills)),
        "aiScore.experience": Math.min(100, Math.max(0, experience)),
        "aiScore.communication": Math.min(100, Math.max(0, communication)),
        "aiScore.total": Math.min(100, Math.max(0, total)),
      },
      { new: true }
    );

    return application;
  } catch (error) {
    console.error("Error updating AI score:", error);
    throw error;
  }
};

/**
 * Get ranking statistics for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<object>} Statistics like average score, median, etc.
 */
exports.getRankingStats = async (jobId) => {
  try {
    const applications = await Application.find({ jobId });

    if (applications.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        medianScore: 0,
      };
    }

    const scores = applications
      .map(app => app.aiScore?.total || 0)
      .sort((a, b) => a - b);

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median =
      scores.length % 2 === 0
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)];

    return {
      total: applications.length,
      averageScore: Math.round(average),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      medianScore: Math.round(median),
      scoreDistribution: {
        excellent: scores.filter(s => s >= 80).length,
        good: scores.filter(s => s >= 60 && s < 80).length,
        average: scores.filter(s => s >= 40 && s < 60).length,
        poor: scores.filter(s => s < 40).length,
      },
    };
  } catch (error) {
    console.error("Error getting ranking stats:", error);
    throw error;
  }
};

/**
 * Bulk update scores and re-rank candidates
 * Useful after batch CV analysis
 * @param {Array} updates - Array of { applicationId, scores }
 * @returns {Promise<Array>} Updated applications
 */
exports.bulkUpdateAndRank = async (updates) => {
  try {
    const results = [];

    for (const update of updates) {
      const app = await this.updateAIScore(
        update.applicationId,
        update.scores
      );
      results.push(app);
    }

    // Get the job ID from first application to re-rank
    if (results.length > 0) {
      const jobId = results[0].jobId;
      await this.rankCandidates(jobId);
    }

    return results;
  } catch (error) {
    console.error("Error in bulk update and rank:", error);
    throw error;
  }
};
