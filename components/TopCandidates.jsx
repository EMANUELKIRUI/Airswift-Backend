import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/TopCandidates.css";

/**
 * TopCandidates Component
 * Displays the top-ranked candidates from admin review batch
 * Shows AI scoring breakdown and ranking
 */
export default function TopCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchJobs();
    fetchTopCandidates();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchTopCandidates(selectedJobId);
      fetchRankingStats(selectedJobId);
    }
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get("/api/jobs");
      setJobs(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const fetchTopCandidates = async (jobId = null) => {
    try {
      setLoading(true);
      const params = jobId ? `?jobId=${jobId}` : "";
      const response = await axios.get(`/api/applications/top-candidates${params}`);
      setCandidates(response.data?.data || response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching top candidates:", err);
      setError("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const fetchRankingStats = async (jobId) => {
    try {
      const response = await axios.get(`/api/applications/ranking-stats/${jobId}`);
      setStats(response.data?.data || response.data);
    } catch (err) {
      console.error("Error fetching ranking stats:", err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981"; // green
    if (score >= 60) return "#f59e0b"; // amber
    if (score >= 40) return "#ef4444"; // red
    return "#6b7280"; // gray
  };

  const ScoreBar = ({ label, score }) => (
    <div className="score-item">
      <span className="score-label">{label}</span>
      <div className="score-bar-container">
        <div
          className="score-bar"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(score),
          }}
        />
      </div>
      <span className="score-value">{score}/100</span>
    </div>
  );

  if (loading) {
    return (
      <div className="top-candidates-container">
        <div className="loading">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="top-candidates-container">
      <div className="header">
        <h1>🏆 Top Candidates</h1>
        <p className="subtitle">AI-ranked applicants from your batch reviews</p>
      </div>

      {/* Job Filter */}
      <div className="job-filter">
        <label htmlFor="job-select">Filter by Job:</label>
        <select
          id="job-select"
          value={selectedJobId || ""}
          onChange={(e) => setSelectedJobId(e.target.value || null)}
        >
          <option value="">All Jobs</option>
          {jobs.map((job) => (
            <option key={job._id || job.id} value={job._id || job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Applicants</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.averageScore}</div>
            <div className="stat-label">Avg Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.medianScore}</div>
            <div className="stat-label">Median Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.scoreDistribution?.excellent || 0}</div>
            <div className="stat-label">Excellent (80+)</div>
          </div>
        </div>
      )}

      {/* Candidates List */}
      {error && <div className="error-message">{error}</div>}

      {candidates.length === 0 ? (
        <div className="no-candidates">
          <p>No candidates found</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {candidates.map((candidate, index) => (
            <div key={candidate._id} className="candidate-card">
              {/* Rank Badge */}
              <div className="rank-badge">
                {index === 0 && "🥇"}
                {index === 1 && "🥈"}
                {index === 2 && "🥉"}
                {index > 2 && `#${candidate.rank || index + 1}`}
              </div>

              {/* Header */}
              <div className="candidate-header">
                <div>
                  <h3 className="candidate-name">
                    {candidate.userId?.name || "Unknown"}
                  </h3>
                  <p className="candidate-email">
                    {candidate.userId?.email || ""}
                  </p>
                </div>
                <div className="total-score">
                  <div className="score-number">
                    {candidate.aiScore?.total || 0}
                  </div>
                  <div className="score-text">Score</div>
                </div>
              </div>

              {/* Details */}
              <div className="candidate-details">
                <div className="detail-item">
                  <span className="detail-label">Job:</span>
                  <span className="detail-value">
                    {candidate.jobId?.title || "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`status ${candidate.applicationStatus}`}>
                    {candidate.applicationStatus || "pending"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Applied:</span>
                  <span className="detail-value">
                    {new Date(candidate.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="score-breakdown">
                <h4>Score Breakdown</h4>
                <ScoreBar
                  label="Skills"
                  score={candidate.aiScore?.skills || 0}
                />
                <ScoreBar
                  label="Experience"
                  score={candidate.aiScore?.experience || 0}
                />
                <ScoreBar
                  label="Communication"
                  score={candidate.aiScore?.communication || 0}
                />
              </div>

              {/* Actions */}
              <div className="candidate-actions">
                <button className="btn-primary">View Profile</button>
                <button className="btn-secondary">Review Documents</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
