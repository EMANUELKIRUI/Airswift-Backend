import React, { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';
import api from '../api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState({
    stats: {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      interviewsScheduled: 0,
      unreadMessages: 0,
      unreadNotifications: 0,
    },
    user: null,
    recentActivity: {
      applications: [],
      notifications: [],
    },
    upcomingInterviews: [],
    latestApplications: [],
    recentMessages: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/dashboard');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Loading dashboard...</div>
      </UserLayout>
    );
  }

  const { stats, user, recentActivity, upcomingInterviews, latestApplications, recentMessages } = data;

  return (
    <UserLayout>
      <div className="dashboard">
        {/* 1. Welcome Section */}
        <div className="dashboard-header">
          <h1>👋 Welcome back, {user?.name || 'User'}!</h1>
          <p>Here's what’s happening with your applications</p>
        </div>

        {/* 2. Key Summary Cards */}
        <div className="summary-cards">
          <div className="card">
            <h3>📝 Total Applications</h3>
            <p className="number">{stats.totalApplications}</p>
          </div>
          <div className="card">
            <h3>⏳ Pending Applications</h3>
            <p className="number">{stats.pendingApplications}</p>
          </div>
          <div className="card">
            <h3>✅ Approved Applications</h3>
            <p className="number">{stats.approvedApplications}</p>
          </div>
          <div className="card">
            <h3>❌ Rejected Applications</h3>
            <p className="number">{stats.rejectedApplications}</p>
          </div>
          <div className="card">
            <h3>📅 Upcoming Interviews</h3>
            <p className="number">{stats.interviewsScheduled}</p>
          </div>
          <div className="card">
            <h3>💬 Unread Messages</h3>
            <p className="number">{stats.unreadMessages}</p>
          </div>
        </div>

        {/* 3. Recent Activity Feed */}
        <div className="recent-activity">
          <h2>📢 Recent Activity</h2>
          {recentActivity && (recentActivity.applications?.length > 0 || recentActivity.notifications?.length > 0) ? (
            <ul>
              {recentActivity.applications?.map((activity, index) => (
                <li key={`app-${index}`}>
                  <strong>{activity.jobTitle}</strong>: Application status is {activity.status}
                  <span className="activity-date">{formatDate(activity.submittedAt)}</span>
                </li>
              ))}
              {recentActivity.notifications?.map((notif, index) => (
                <li key={`notif-${index}`}>
                  <strong>{notif.title}</strong>: {notif.message}
                  <span className="activity-date">{formatDate(notif.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent activity</p>
          )}
        </div>

        {/* 4. Upcoming Interviews */}
        <div className="upcoming-interviews">
          <h2>📅 Upcoming Interviews</h2>
          {upcomingInterviews.length > 0 ? (
            <div className="interviews-list">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="interview-card">
                  <h3>{interview.jobTitle}</h3>
                  <p><strong>Date & Time:</strong> {formatDateTime(interview.scheduledAt)}</p>
                  <p><strong>Status:</strong> {interview.status}</p>
                  {interview.meetingLink && (
                    <p><strong>Link:</strong> <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">Join Interview</a></p>
                  )}
                  <p><strong>Type:</strong> {interview.type} ({interview.mode})</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No interviews scheduled yet</p>
          )}
        </div>

        {/* 5. Latest Application Status */}
        <div className="latest-applications">
          <h2>📝 Latest Application Status</h2>
          {latestApplications.length > 0 ? (
            <>
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestApplications.map((app) => (
                    <tr key={app.id}>
                      <td>{app.jobTitle}</td>
                      <td>{formatDate(app.appliedAt)}</td>
                      <td className={`status-${app.status.toLowerCase()}`}>{app.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link to="/applications" className="view-all-btn">View All Applications</Link>
            </>
          ) : (
            <p>No applications yet</p>
          )}
        </div>

        {/* 6. Recent Messages Preview */}
        <div className="recent-messages">
          <h2>💬 Recent Messages</h2>
          {recentMessages.length > 0 ? (
            <>
              <div className="messages-list">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="message-preview">
                    <strong>{msg.senderName} ({msg.senderRole}):</strong> {msg.text}
                    <span className="message-date">{formatDate(msg.date)}</span>
                  </div>
                ))}
              </div>
              <Link to="/messages" className="view-all-btn">Go to Messages</Link>
            </>
          ) : (
            <p>No messages yet</p>
          )}
        </div>

        {/* 7. Notifications Panel */}
        {stats.unreadNotifications > 0 && (
          <div className="notifications-panel">
            <h2>🔔 Notifications</h2>
            <p>You have {stats.unreadNotifications} unread notification{stats.unreadNotifications > 1 ? 's' : ''}</p>
            <Link to="/notifications" className="view-notifications-btn">View Notifications</Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default Dashboard;