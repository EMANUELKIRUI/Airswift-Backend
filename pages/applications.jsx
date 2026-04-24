import React, { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';
import api from '../api';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/applications/my');
      setApplications(response.data.applications || response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      reviewed: 'status-reviewed',
      approved: 'status-approved',
      rejected: 'status-rejected',
    };
    return statusClasses[status] || 'status-default';
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Loading applications...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="applications-page">
        <h1>📂 My Applications</h1>
        {applications.length === 0 ? (
          <p>No applications yet.</p>
        ) : (
          <table className="applications-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td>{app.job?.title || 'N/A'}</td>
                  <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-view">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </UserLayout>
  );
};

export default Applications;