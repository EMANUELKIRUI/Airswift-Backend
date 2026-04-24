import React, { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';
import api from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    interviewsScheduled: 0,
    unreadMessages: 0,
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/dashboard');
      if (response.data.success) {
        setStats(response.data.stats);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Loading dashboard...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>👋 Welcome back, {user?.name || 'User'}!</h1>
          <p>Here's an overview of your job applications and activities.</p>
        </div>

        <div className="summary-cards">
          <div className="card">
            <h3>Total Applications</h3>
            <p className="number">{stats.totalApplications}</p>
          </div>
          <div className="card">
            <h3>Pending Applications</h3>
            <p className="number">{stats.pendingApplications}</p>
          </div>
          <div className="card">
            <h3>Interviews Scheduled</h3>
            <p className="number">{stats.interviewsScheduled}</p>
          </div>
          <div className="card">
            <h3>Unread Messages</h3>
            <p className="number">{stats.unreadMessages}</p>
          </div>
        </div>

        <div className="recent-activity">
          <h2>📢 Recent Activity</h2>
          <ul>
            <li>Application submitted for Software Engineer position</li>
            <li>Interview scheduled for Product Manager role</li>
            <li>New message from HR Department</li>
          </ul>
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;