import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ApplyPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (!userData || !savedToken) {
      router.push('/login');
      return;
    }

    setToken(savedToken);
    fetchJobs(savedToken);
  }, [router]);

  const fetchJobs = async (authToken) => {
    try {
      const response = await fetch('/api/jobs', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError('Failed to load jobs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      const response = await fetch('/api/applications/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        alert('Application submitted!');
      } else {
        alert('Failed to apply');
      }
    } catch (err) {
      alert('Error applying for job');
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading jobs...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </div>
      
      <h1>Available Jobs</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {jobs.length === 0 ? (
        <p>No jobs available</p>
      ) : (
        <div>
          {jobs.map(job => (
            <div key={job.id} style={{
              border: '1px solid #ddd',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '5px'
            }}>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <button onClick={() => handleApply(job.id)}>Apply Now</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
