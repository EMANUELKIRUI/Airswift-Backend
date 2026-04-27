import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import DashboardSummary from '../../components/DashboardSummary';
import RecentActivity from '../../components/RecentActivity';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const JobSeekerDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({
    stats: {
      totalApplications: 0,
      pendingApplications: 0,
      interviewsScheduled: 0,
      unreadMessages: 0,
    },
    recentActivity: [],
    profileCompletion: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'user') {
      router.push('/unauthorized');
      return;
    }
    fetchDashboardData();
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: 'Total Applications',
      value: data.stats.totalApplications,
      icon: '📝',
      color: 'border-blue-500',
      link: '/job-seeker/applications',
      description: 'Jobs you\'ve applied to',
    },
    {
      title: 'Pending Applications',
      value: data.stats.pendingApplications,
      icon: '⏳',
      color: 'border-yellow-500',
      link: '/job-seeker/applications',
      description: 'Awaiting review',
    },
    {
      title: 'Interviews Scheduled',
      value: data.stats.interviewsScheduled,
      icon: '📅',
      color: 'border-green-500',
      link: '/job-seeker/interviews',
      description: 'Upcoming interviews',
    },
    {
      title: 'Unread Messages',
      value: data.stats.unreadMessages,
      icon: '💬',
      color: 'border-purple-500',
      link: '/job-seeker/messages',
      description: 'From recruiters',
    },
  ];

  const quickLinks = [
    { href: '/job-seeker/apply', icon: '📝', label: 'Apply for Jobs' },
    { href: '/job-seeker/applications', icon: '📂', label: 'My Applications' },
    { href: '/job-seeker/interviews', icon: '📅', label: 'My Interviews' },
    { href: '/job-seeker/messages', icon: '💬', label: 'Messages' },
    { href: '/job-seeker/settings', icon: '⚙️', label: 'Settings' },
  ];

  const proTips = [
    'Complete your profile to increase application success rates',
    'Respond to interview invitations within 24 hours',
    'Keep your CV updated with your latest achievements',
    'Follow up on applications after 1-2 weeks',
  ];

  if (authLoading || loading) {
    return (
      <UserDashboardLayout>
        <div className="loading-spinner">Loading dashboard...</div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="job-seeker-dashboard">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <div className="welcome-content">
            <h1>👋 Welcome back, {user?.name || 'Job Seeker'}!</h1>
            <p>Here's what's happening with your job applications</p>
            <div className="profile-completion">
              <div className="completion-bar">
                <div
                  className="completion-fill"
                  style={{ width: `${data.profileCompletion}%` }}
                ></div>
              </div>
              <span className="completion-text">
                Profile {data.profileCompletion}% complete
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <DashboardSummary cards={summaryCards} loading={loading} />

        {/* Recent Activity */}
        <RecentActivity activities={data.recentActivity} loading={loading} />

        {/* Quick Links */}
        <div className="quick-links">
          <h2>🚀 Quick Actions</h2>
          <div className="links-grid">
            {quickLinks.map((link, index) => (
              <a key={index} href={link.href} className="quick-link-card">
                <span className="link-icon">{link.icon}</span>
                <span className="link-label">{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Pro Tips */}
        <div className="pro-tips">
          <h2>💡 Pro Tips</h2>
          <div className="tips-list">
            {proTips.map((tip, index) => (
              <div key={index} className="tip-item">
                <span className="tip-icon">💡</span>
                <span className="tip-text">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
};

export default JobSeekerDashboard;