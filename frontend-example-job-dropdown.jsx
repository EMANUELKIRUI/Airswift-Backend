// ✅ FIXED: Job Selection Input Component
// Copy this to your frontend React application

import React, { useState, useEffect } from 'react';
import api from './api'; // Your API configuration with interceptors

const JobSelectionInput = () => {
  const [jobs, setJobs] = useState([]);
  const [jobText, setJobText] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const safeJobs = Array.isArray(jobs) ? jobs : [];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/jobs');
      console.log('Jobs fetched:', response.data);

      const jobsData = Array.isArray(response.data)
        ? response.data
        : response.data.jobs
        ? response.data.jobs
        : [];

      setJobs(jobsData);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobInputChange = (e) => {
    const value = e.target.value;
    setJobText(value);

    const matched = safeJobs.find(
      (job) => job.title.toLowerCase() === value.toLowerCase()
    );

    setSelectedJobId(matched ? matched._id : '');
  };

  if (loading) {
    return (
      <div className="job-dropdown">
        <label htmlFor="job-input">Job Title *</label>
        <input id="job-input" type="text" placeholder="Loading job titles..." disabled />
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-dropdown">
        <label htmlFor="job-input">Job Title *</label>
        <input id="job-input" type="text" placeholder={error} disabled />
        <button onClick={fetchJobs} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="job-dropdown">
      <label htmlFor="job-input">Job Title *</label>
      <input
        id="job-input"
        type="text"
        list="job-options"
        value={jobText}
        onChange={handleJobInputChange}
        placeholder="Type the job title you want"
      />
      <datalist id="job-options">
        {safeJobs.map((job) => (
          <option key={job._id} value={job.title} />
        ))}
      </datalist>

      <div className="debug-info" style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>Jobs loaded: {safeJobs.length}</p>
        <p>Job title: {jobText || 'None'}</p>
        <p>Matched job ID: {selectedJobId || 'None'}</p>
      </div>
    </div>
  );
};

export default JobSelectionInput;
