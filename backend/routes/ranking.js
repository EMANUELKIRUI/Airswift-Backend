const express = require('express');
const router = express.Router();
const rankingService = require('../services/rankingService');
const auth = require('../middleware/auth');
const { adminOnly, recruiterOnly } = require('../middleware/permission');

/**
 * Rank candidates for a job
 * POST /api/applications/rank/:jobId
 * Admin/Recruiter only
 */
router.post('/rank/:jobId', auth, recruiterOnly, async (req, res) => {
  try {
    const { jobId } = req.params;

    const ranked = await rankingService.rankCandidates(jobId);

    return res.json({
      success: true,
      message: `Successfully ranked ${ranked.length} candidates`,
      data: ranked,
    });
  } catch (error) {
    console.error('Ranking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to rank candidates',
      error: error.message,
    });
  }
});

/**
 * Get top candidates across all jobs
 * GET /api/applications/top-candidates
 * GET /api/applications/top-candidates?jobId=xxx&limit=20
 * Public endpoint (but could be restricted)
 */
router.get('/top-candidates', async (req, res) => {
  try {
    const { jobId, limit = 20 } = req.query;

    const candidates = await rankingService.getTopCandidates(jobId, parseInt(limit));

    return res.json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    console.error('Get top candidates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top candidates',
      error: error.message,
    });
  }
});

/**
 * Update AI score for an application
 * POST /api/applications/:applicationId/ai-score
 * Admin only
 */
router.post('/:applicationId/ai-score', auth, adminOnly, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { skills = 0, experience = 0, communication = 0 } = req.body;

    const updated = await rankingService.updateAIScore(applicationId, {
      skills,
      experience,
      communication,
    });

    return res.json({
      success: true,
      message: 'AI score updated',
      data: updated,
    });
  } catch (error) {
    console.error('Update AI score error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update AI score',
      error: error.message,
    });
  }
});

/**
 * Get ranking statistics for a job
 * GET /api/applications/ranking-stats/:jobId
 * Admin/Recruiter only
 */
router.get('/ranking-stats/:jobId', auth, recruiterOnly, async (req, res) => {
  try {
    const { jobId } = req.params;

    const stats = await rankingService.getRankingStats(jobId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get ranking stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get ranking statistics',
      error: error.message,
    });
  }
});

/**
 * Bulk update and re-rank candidates
 * POST /api/applications/bulk-rank
 * Admin only
 * Body: { updates: [{ applicationId, scores: { skills, experience, communication } }] }
 */
router.post('/bulk-rank', auth, adminOnly, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates must be an array',
      });
    }

    const results = await rankingService.bulkUpdateAndRank(updates);

    return res.json({
      success: true,
      message: `Updated ${results.length} applications`,
      data: results,
    });
  } catch (error) {
    console.error('Bulk rank error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk update and rank',
      error: error.message,
    });
  }
});

module.exports = router;
