import React, { useState, useEffect } from 'react';
import api from './api'; // Your axios instance

/**
 * JobSelector Component
 * Displays all jobs from database grouped by category
 * Users can select a job and the component returns the selection
 * 
 * Usage:
 * <JobSelector onSelect={(job) => console.log(job)} />
 */
const JobSelector = ({ onSelect, selectedJobId = null }) => {
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(selectedJobId);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch jobs from API endpoint
      const response = await api.get('/applications/job-options');
      console.log('✅ Jobs fetched:', response.data);

      setJobs(response.data.jobs || {});
    } catch (err) {
      console.error('❌ Error fetching jobs:', err);
      setError(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (job) => {
    setSelected(job.id);
    if (onSelect) {
      onSelect(job);
    }
  };

  if (loading) {
    return (
      <div className="job-selector">
        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-selector error">
        <p>❌ {error}</p>
        <button onClick={fetchJobs}>Retry</button>
      </div>
    );
  }

  return (
    <div className="job-selector">
      <h2>Select a Job Position</h2>
      <p className="subtitle">Browse all available positions by category</p>

      {Object.keys(jobs).length === 0 ? (
        <p>No jobs available</p>
      ) : (
        <div className="job-categories">
          {Object.entries(jobs).map(([category, jobList]) => (
            <div key={category} className="category-section">
              <h3 className="category-header">📁 {category}</h3>
              <div className="job-grid">
                {jobList.map((job) => (
                  <div
                    key={job.id}
                    className={`job-card ${selected === job.id ? 'selected' : ''}`}
                    onClick={() => handleJobSelect(job)}
                  >
                    <div className="job-title">{job.title}</div>
                    <div className="job-id">ID: {job.id}</div>
                    {selected === job.id && <div className="checkmark">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .job-selector {
          max-width: 1000px;
          margin: 20px auto;
          padding: 20px;
        }

        .job-selector h2 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #333;
        }

        .subtitle {
          color: #666;
          margin-bottom: 30px;
        }

        .job-categories {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .category-section {
          border: 1px solid #e0e0e0;
          padding: 20px;
          border-radius: 8px;
          background: #fafafa;
        }

        .category-header {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #333;
        }

        .job-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }

        .job-card {
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          background: white;
          transition: all 0.3s ease;
          position: relative;
        }

        .job-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
          transform: translateY(-2px);
        }

        .job-card.selected {
          border-color: #28a745;
          background: #f0f9f6;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
        }

        .job-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
          color: #333;
        }

        .job-id {
          font-size: 12px;
          color: #999;
        }

        .checkmark {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #28a745;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
        }

        .error {
          color: #dc3545;
          padding: 20px;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          background: #f8d7da;
        }

        button {
          padding: 8px 16px;
          margin-top: 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default JobSelector;
