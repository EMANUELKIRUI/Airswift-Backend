import React, { useState, useEffect } from 'react';
import api from './api'; // Your axios instance

/**
 * JobDropdown Component - Simple Select Input
 * Displays jobs in a dropdown organized by category
 * 
 * Usage:
 * <JobDropdown onSelect={(job) => setSelectedJob(job)} />
 */
const JobDropdown = ({ onSelect, defaultValue = '' }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/applications/job-options');

      // Flatten grouped jobs into a single array for dropdown
      const flatJobs = [];
      Object.entries(response.data.jobs || {}).forEach(([category, jobList]) => {
        jobList.forEach(job => {
          flatJobs.push({
            ...job,
            category,
          });
        });
      });

      setJobs(flatJobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedId = e.target.value;
    setValue(selectedId);

    const selectedJob = jobs.find(j => j.id.toString() === selectedId);
    if (selectedJob && onSelect) {
      onSelect(selectedJob);
    }
  };

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={loading}
      style={{
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        borderRadius: '4px',
        border: '1px solid #ddd',
      }}
    >
      <option value="">
        {loading ? 'Loading jobs...' : 'Select a job position...'}
      </option>
      {Object.entries(
        jobs.reduce((acc, job) => {
          if (!acc[job.category]) acc[job.category] = [];
          acc[job.category].push(job);
          return acc;
        }, {})
      ).map(([category, categoryJobs]) => (
        <optgroup key={category} label={category}>
          {categoryJobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

export default JobDropdown;
