import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketNotifications } from '../../hooks/useSocketNotifications';
import toast from 'react-hot-toast';

const JobSeekerNotifications = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, application, interview, message, system

  const { subscribe } = useSocketNotifications();

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
    fetchNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = subscribe('notification', (data) => {
      fetchNotifications(); // Refresh notifications
      toast.success('New notification received!');
    });

    return () => unsubscribe();
  }, [user, authLoading, router, subscribe]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application': return '📝';
      case 'interview': return '📅';
      case 'message': return '💬';
      case 'system': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'application': return 'border-blue-500';
      case 'interview': return 'border-green-500';
      case 'message': return 'border-purple-500';
      case 'system': return 'border-gray-500';
      default: return 'border-gray-500';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    return notif.type === filter;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  if (authLoading || loading) {
    return (
      <UserDashboardLayout>
        <div className="loading-spinner">Loading notifications...</div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="job-seeker-notifications">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-content">
            <h1>🔔 Notifications</h1>
            <p>Stay updated with your application status and messages</p>
          </div>

          <div className="notifications-stats">
            <div className="stat-item">
              <span className="stat-value">{notifications.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{unreadCount}</span>
              <span className="stat-label">Unread</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="notifications-controls">
          <div className="filter-tabs">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`filter-btn ${filter === 'application' ? 'active' : ''}`}
              onClick={() => setFilter('application')}
            >
              Applications
            </button>
            <button
              className={`filter-btn ${filter === 'interview' ? 'active' : ''}`}
              onClick={() => setFilter('interview')}
            >
              Interviews
            </button>
            <button
              className={`filter-btn ${filter === 'message' ? 'active' : ''}`}
              onClick={() => setFilter('message')}
            >
              Messages
            </button>
            <button
              className={`filter-btn ${filter === 'system' ? 'active' : ''}`}
              onClick={() => setFilter('system')}
            >
              System
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''} ${getNotificationColor(notification.type)}`}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="notification-actions">
                  {!notification.read && (
                    <button
                      className="action-btn mark-read"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete notification"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-notifications">
              <div className="empty-icon">🔔</div>
              <h3>No notifications</h3>
              <p>
                {filter === 'all'
                  ? "You're all caught up! Check back later for updates."
                  : `No ${filter} notifications at the moment.`
                }
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="notifications-help">
          <h3>💡 Notification Types</h3>
          <div className="notification-types">
            <div className="type-item">
              <span className="type-icon">📝</span>
              <div className="type-info">
                <strong>Application Updates</strong>
                <p>Status changes on your job applications</p>
              </div>
            </div>
            <div className="type-item">
              <span className="type-icon">📅</span>
              <div className="type-info">
                <strong>Interview Notifications</strong>
                <p>Interview scheduling and reminders</p>
              </div>
            </div>
            <div className="type-item">
              <span className="type-icon">💬</span>
              <div className="type-info">
                <strong>Messages</strong>
                <p>New messages from recruiters</p>
              </div>
            </div>
            <div className="type-item">
              <span className="type-icon">ℹ️</span>
              <div className="type-info">
                <strong>System Updates</strong>
                <p>Platform announcements and updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
};

export default JobSeekerNotifications;