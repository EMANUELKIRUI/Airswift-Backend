// ✅ SAFE DASHBOARD COMPONENT - Prevents Crashes
// Copy this to your frontend dashboard

import React, { useState, useEffect } from 'react';
import api from './api'; // Your API configuration with interceptors

const SafeDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    applications: [],
    jobs: [],
    users: [],
    stats: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Axios interceptor automatically adds Authorization header
      const response = await api.get('/admin/dashboard');

      // ✅ SAFE: Ensure all data is arrays to prevent crashes
      const safeData = {
        applications: Array.isArray(response.data.applications) ? response.data.applications : [],
        jobs: Array.isArray(response.data.jobs) ? response.data.jobs : [],
        users: Array.isArray(response.data.users) ? response.data.users : [],
        stats: response.data.stats || {}
      };

      setDashboardData(safeData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);

      // ✅ SAFE: Set empty arrays on error to prevent crashes
      setDashboardData({
        applications: [],
        jobs: [],
        users: [],
        stats: {}
      });

      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
        // Redirect to login will be handled by axios interceptor
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ SAFE: Use safe arrays everywhere
  const safeApplications = Array.isArray(dashboardData.applications) ? dashboardData.applications : [];
  const safeJobs = Array.isArray(dashboardData.jobs) ? dashboardData.jobs : [];
  const safeUsers = Array.isArray(dashboardData.users) ? dashboardData.users : [];

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>

      {/* ✅ SAFE: Recent Applications */}
      <div className="section">
        <h2>Recent Applications</h2>
        <div className="applications-list">
          {safeApplications.slice(0, 5).map((app) => (
            <div key={app._id} className="application-item">
              <h3>{app.name}</h3>
              <p>{app.email}</p>
              <span className={`status ${app.status}`}>{app.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ SAFE: Active Jobs */}
      <div className="section">
        <h2>Active Jobs</h2>
        <div className="jobs-list">
          {safeJobs.slice(0, 5).map((job) => (
            <div key={job._id} className="job-item">
              <h3>{job.title}</h3>
              <p>{job.company}</p>
              <span className="applicants">{job.applicantCount || 0} applicants</span>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ SAFE: Recent Users */}
      <div className="section">
        <h2>Recent Users</h2>
        <div className="users-list">
          {safeUsers.slice(0, 5).map((user) => (
            <div key={user._id} className="user-item">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className={`role ${user.role}`}>{user.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      <div className="debug-info" style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', fontSize: '12px' }}>
        <h3>Debug Information:</h3>
        <p>Applications: {safeApplications.length}</p>
        <p>Jobs: {safeJobs.length}</p>
        <p>Users: {safeUsers.length}</p>
        <p>Token in localStorage: {localStorage.getItem('token') ? '✅ EXISTS' : '❌ MISSING'}</p>
      </div>
    </div>
  );
};

export default SafeDashboard;