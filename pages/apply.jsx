import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import UserLayout from '../components/UserLayout';
import api from '../api';

const Apply = () => {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    jobId: '',
    coverLetter: '',
    cv: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data.jobs || response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, cv: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('job_id', formData.jobId);
      data.append('cover_letter', formData.coverLetter);
      if (formData.cv) {
        data.append('cv', formData.cv);
      }

      await api.post('/applications', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      router.push('/applications');
    } catch (err) {
      setError(err.response?.data?.message || 'Application submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout>
      <div className="apply-page">
        <h1>📝 Submit Your Application</h1>
        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-group">
            <label htmlFor="jobId">Select Job</label>
            <select
              id="jobId"
              name="jobId"
              value={formData.jobId}
              onChange={handleInputChange}
              required
            >
              <option value="">Choose a job...</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title} - {job.company}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="coverLetter">Cover Letter</label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleInputChange}
              placeholder="Tell us why you're interested in this position..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cv">CV/Resume</label>
            <input
              type="file"
              id="cv"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </UserLayout>
  );
};

export default Apply;