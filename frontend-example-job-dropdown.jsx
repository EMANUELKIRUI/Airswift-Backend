// ✅ FIXED: Job Selection Dropdown Component
// Copy this to your frontend React application

import React, { useState, useEffect } from 'react';
import api from './api'; // Your API configuration with interceptors

const JobSelectionDropdown = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ FIX 4: Prevent crash with safe array check
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Axios interceptor automatically adds Authorization header
      const response = await api.get('/jobs');

      console.log('Jobs fetched:', response.data);

      // ✅ FIX 4: Ensure jobs is always an array
      const jobsData = Array.isArray(response.data) ? response.data :
                      (response.data.jobs ? response.data.jobs : []);

      setJobs(jobsData);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
      setJobs([]); // ✅ Prevent crash - set to empty array
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (e) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);

    if (jobId) {
      const selectedJob = safeJobs.find(job => job._id === jobId);
      console.log('Selected job:', selectedJob);
    }
  };

  if (loading) {
    return (
      <div className="job-dropdown">
        <label htmlFor="job-select">Select a Job:</label>
        <select id="job-select" disabled>
          <option>Loading jobs...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-dropdown">
        <label htmlFor="job-select">Select a Job:</label>
        <select id="job-select" disabled>
          <option>{error}</option>
        </select>
        <button onClick={fetchJobs} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="job-dropdown">
      <label htmlFor="job-select">Select a Job:</label>

      {/* ✅ FIX 3: Correct dropdown mapping */}
      <select
        id="job-select"
        value={selectedJobId}
        onChange={handleJobChange}
      >
        <option value="">Choose a job</option>

        {/* ✅ FIX 3: Map correctly with key and value */}
        {safeJobs.map((job) => (
          <option key={job._id} value={job._id}>
            {job.title}
          </option>
        ))}
      </select>

      {/* Debug info */}
      <div className="debug-info" style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>Jobs loaded: {safeJobs.length}</p>
        <p>Selected: {selectedJobId || 'None'}</p>
      </div>
    </div>
  );
};

export default JobSelectionDropdown;