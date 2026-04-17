// ✅ CLEAN ADMIN DASHBOARD COMPONENT (No Guards - Protected by Layout)
// Main admin dashboard with overview and navigation

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Your axios instance

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalApplications: 0,
    totalUsers: 0,
    totalJobs: 0,
    pendingApplications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats || {});
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Applications</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalApplications || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active Jobs</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalJobs || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Pending Applications</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.pendingApplications || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/applications')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Manage Applications
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate('/admin/jobs')}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Manage Jobs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;