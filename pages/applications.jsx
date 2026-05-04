import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (!userData || !savedToken) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Only admins can view applications
    if (parsedUser.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    setToken(savedToken);
    fetchApplications(savedToken);
  }, [router]);

  const fetchApplications = async (authToken) => {
    try {
      const response = await fetch('/api/admin/applications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch applications');
      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError('Failed to load applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </div>

      <h1>Job Applications</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Job</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Applicant Email</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Applied On</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{app.job?.title || 'N/A'}</td>
                <td style={{ padding: '10px' }}>{app.user?.email || 'N/A'}</td>
                <td style={{ padding: '10px' }}>{app.status}</td>
                <td style={{ padding: '10px' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
