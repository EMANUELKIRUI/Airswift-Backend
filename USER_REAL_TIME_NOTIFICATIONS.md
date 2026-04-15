# 🔥 Real-Time User Notifications & Status Updates

## Overview

Your backend now emits real-time notifications to users when their application status changes or interviews are scheduled. This guide shows how to implement the notification bell and real-time updates on the frontend.

---

## 1️⃣ SETUP: Socket.io Client for Users

**Create `services/userSocket.js`:**

```javascript
import { io } from 'socket.io-client';

let socket = null;

// Initialize socket connection for regular users
export const initializeUserSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
    auth: {
      token: token // Pass JWT token for authentication
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ User socket connected:', socket.id);

    // 🔥 Auto-join user room
    if (socket.user?.id) {
      socket.emit('join_user', socket.user.id);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('❌ User socket error:', error);
  });

  return socket;
};

// Get socket instance
export const getUserSocket = () => socket;

// Disconnect socket
export const disconnectUserSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

---

## 2️⃣ USER DASHBOARD: Listen for Status Updates

**Update your user dashboard to listen for real-time updates:**

```javascript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API from '@/utils/api';
import { initializeUserSocket, getUserSocket } from '@/services/userSocket';

export default function UserDashboard() {
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize socket
    const socket = initializeUserSocket(token);

    // 🔥 Listen for application status updates
    socket.on('application_status_updated', (data) => {
      console.log('🔥 Application status updated:', data);

      // Update application status in state
      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === data.applicationId
            ? { ...app, status: data.status, updatedAt: data.timestamp }
            : app
        )
      );

      // Show toast notification
      showToast(`Application status updated to: ${data.status}`, 'info');

      // Add to notifications
      addNotification({
        id: Date.now(),
        message: data.message,
        type: 'status_update',
        read: false,
        timestamp: new Date(data.timestamp)
      });
    });

    // 🔥 Listen for interview scheduling
    socket.on('interview_scheduled', (data) => {
      console.log('🎤 Interview scheduled:', data);

      // Update application with interview info
      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === data.applicationId
            ? {
                ...app,
                interviewScheduled: true,
                interviewDate: data.scheduledDate,
                interviewType: data.interviewType
              }
            : app
        )
      );

      // Show toast notification
      showToast(`Interview scheduled for ${new Date(data.scheduledDate).toLocaleString()}`, 'success');

      // Add to notifications
      addNotification({
        id: Date.now(),
        message: data.message,
        type: 'interview_scheduled',
        read: false,
        timestamp: new Date(data.timestamp)
      });
    });

    // 🔥 Listen for general notifications
    socket.on('notification', (data) => {
      console.log('🔔 Notification received:', data);

      // Show toast notification
      showToast(data.message, getToastType(data.type));

      // Add to notifications
      addNotification({
        id: Date.now(),
        message: data.message,
        type: data.type,
        read: false,
        timestamp: new Date(data.timestamp),
        data: data.data
      });
    });

    // Load initial data
    loadApplications();

    return () => {
      socket.off('application_status_updated');
      socket.off('interview_scheduled');
      socket.off('notification');
    };
  }, []);

  const loadApplications = async () => {
    try {
      const response = await API.get('/api/applications/mongo');
      setApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading applications:', error);
      setLoading(false);
    }
  };

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const showToast = (message, type = 'info') => {
    // Implement your toast system here
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    // E.g., toast[type](message)
  };

  const getToastType = (notificationType) => {
    switch (notificationType) {
      case 'application_accepted': return 'success';
      case 'application_rejected': return 'error';
      case 'interview_scheduled': return 'success';
      case 'interview_reminder': return 'warning';
      default: return 'info';
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="user-dashboard">
      <header>
        <h1>My Applications</h1>
        <NotificationBell notifications={notifications} />
      </header>

      <div className="applications">
        {applications.map((app) => (
          <ApplicationCard key={app._id} application={app} />
        ))}
      </div>
    </div>
  );
}
```

---

## 3️⃣ NOTIFICATION BELL COMPONENT

**Create `components/NotificationBell.jsx`:**

```javascript
import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react'; // Install lucide-react

export default function NotificationBell({ notifications }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = (notificationId) => {
    // Update notification as read in your state/backend
    console.log('Mark as read:', notificationId);
  };

  const clearNotification = (notificationId) => {
    // Remove notification from state
    console.log('Clear notification:', notificationId);
  };

  return (
    <div className="notification-bell">
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <small>{new Date(notification.timestamp).toLocaleString()}</small>
                  </div>
                  <button
                    className="clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notification.id);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Add CSS styles:**

```css
.notification-bell {
  position: relative;
}

.bell-button {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  max-height: 400px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.notification-header h3 {
  margin: 0;
  font-size: 16px;
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.notification-content p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.notification-content small {
  color: #666;
  font-size: 12px;
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .clear-btn {
  opacity: 1;
}

.no-notifications {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}
```

---

## 4️⃣ APPLICATION CARD COMPONENT

**Create `components/ApplicationCard.jsx`:**

```javascript
import React from 'react';

export default function ApplicationCard({ application }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffa726';
      case 'reviewed': return '#42a5f5';
      case 'accepted': return '#66bb6a';
      case 'rejected': return '#ef5350';
      default: return '#999';
    }
  };

  return (
    <div className="application-card">
      <div className="card-header">
        <h3>{application.jobTitle}</h3>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(application.status) }}
        >
          {application.status}
        </span>
      </div>

      <div className="card-body">
        <p><strong>Applied:</strong> {new Date(application.createdAt).toLocaleDateString()}</p>
        <p><strong>Last Updated:</strong> {new Date(application.updatedAt).toLocaleDateString()}</p>

        {application.interviewScheduled && (
          <div className="interview-info">
            <p><strong>🎤 Interview Scheduled:</strong></p>
            <p>{new Date(application.interviewDate).toLocaleString()}</p>
            <p><em>{application.interviewType}</em></p>
          </div>
        )}

        {/* Timeline */}
        {application.timeline && application.timeline.length > 0 && (
          <div className="timeline">
            <h4>Status History</h4>
            {application.timeline.map((entry, idx) => (
              <div key={idx} className="timeline-item">
                <span className="status">{entry.status}</span>
                <span className="date">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 5️⃣ TOAST NOTIFICATION SYSTEM

**Install and setup react-hot-toast:**

```bash
npm install react-hot-toast
```

**Update `_app.js`:**

```javascript
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}
```

**Update dashboard to use toast:**

```javascript
import toast from 'react-hot-toast';

// In your event listeners:
socket.on('application_status_updated', (data) => {
  // Update state...
  toast.success(`Application status updated to: ${data.status}`);
});

socket.on('interview_scheduled', (data) => {
  toast.success(`Interview scheduled for ${new Date(data.scheduledDate).toLocaleString()}`);
});

socket.on('notification', (data) => {
  const toastType = getToastType(data.type);
  toast[toastType](data.message);
});
```

---

## 6️⃣ COMPLETE USER DASHBOARD EXAMPLE

```javascript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import API from '@/utils/api';
import { initializeUserSocket, getUserSocket } from '@/services/userSocket';
import NotificationBell from '@/components/NotificationBell';
import ApplicationCard from '@/components/ApplicationCard';

export default function UserDashboard() {
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize socket
    const socket = initializeUserSocket(token);

    // 🔥 APPLICATION STATUS UPDATES
    socket.on('application_status_updated', (data) => {
      console.log('🔥 Status updated:', data);

      setApplications((prev) =>
        prev.map((app) =>
          app._id === data.applicationId
            ? { ...app, status: data.status, updatedAt: data.timestamp }
            : app
        )
      );

      toast.success(data.message);
      addNotification(data);
    });

    // 🔥 INTERVIEW SCHEDULING
    socket.on('interview_scheduled', (data) => {
      console.log('🎤 Interview scheduled:', data);

      setApplications((prev) =>
        prev.map((app) =>
          app._id === data.applicationId
            ? {
                ...app,
                interviewScheduled: true,
                interviewDate: data.scheduledDate,
                interviewType: data.interviewType
              }
            : app
        )
      );

      toast.success(data.message);
      addNotification(data);
    });

    // 🔥 GENERAL NOTIFICATIONS
    socket.on('notification', (data) => {
      console.log('🔔 Notification:', data);

      const toastType = getToastType(data.type);
      toast[toastType](data.message);
      addNotification(data);
    });

    // Load initial data
    loadDashboardData();

    return () => {
      socket.off('application_status_updated');
      socket.off('interview_scheduled');
      socket.off('notification');
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [appsResponse, notifsResponse] = await Promise.all([
        API.get('/api/applications/mongo'),
        API.get('/api/notifications') // If you have a notifications endpoint
      ]);

      setApplications(appsResponse.data);
      setNotifications(notifsResponse.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (data) => {
    const notification = {
      id: Date.now(),
      message: data.message,
      type: data.type,
      read: false,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data.data
    };

    setNotifications((prev) => [notification, ...prev]);
  };

  const getToastType = (type) => {
    switch (type) {
      case 'application_accepted': return 'success';
      case 'application_rejected': return 'error';
      case 'interview_scheduled': return 'success';
      case 'interview_reminder': return 'warning';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your applications...</p>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>My Job Applications</h1>
          <p>Track your application status in real-time</p>
        </div>
        <NotificationBell notifications={notifications} />
      </header>

      <div className="applications-grid">
        {applications.length === 0 ? (
          <div className="empty-state">
            <h3>No applications yet</h3>
            <p>Start by applying for jobs that interest you!</p>
            <button onClick={() => router.push('/jobs')}>
              Browse Jobs
            </button>
          </div>
        ) : (
          applications.map((app) => (
            <ApplicationCard key={app._id} application={app} />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 7️⃣ BACKEND EVENT FLOW

**When admin updates application status:**

```
Admin clicks "Accept" → API call → Database update → emitApplicationStatusUpdate()
    ↓
Event sent to:
  - Admin room (for admin dashboard)
  - User room (user_${userId}) for real-time update
  - Notification sent to user
    ↓
User sees:
  - Toast notification
  - Status update in dashboard
  - Notification in bell
```

**When interview is scheduled:**

```
Admin schedules interview → API call → Database save → emitInterviewScheduled()
    ↓
Event sent to:
  - Admin room (for admin dashboard)
  - User room (user_${userId}) for real-time update
  - Notification sent to user
    ↓
User sees:
  - Toast notification
  - Interview info in application card
  - Notification in bell
```

---

## 8️⃣ NOTIFICATION TYPES REFERENCE

| Event | User Receives | Toast Type | Bell Icon |
|-------|---------------|------------|-----------|
| `application_status_updated` | Status change message | info | 🔔 |
| `interview_scheduled` | Interview scheduled message | success | 🎤 |
| `notification` | Custom message | varies | 🔔 |

---

## 9️⃣ TESTING REAL-TIME UPDATES

**Test with two browser windows:**

1. **Window 1:** Login as user, go to dashboard
2. **Window 2:** Login as admin, update application status
3. **Window 1:** Should see real-time update + toast + bell notification

**Test interview scheduling:**

1. **Window 1:** User dashboard
2. **Window 2:** Admin schedules interview
3. **Window 1:** Should see interview info appear instantly

---

## 🔟 COMPLETE SETUP CHECKLIST

- [ ] Socket.io client installed
- [ ] User socket service created with authentication
- [ ] User dashboard listens to `application_status_updated`
- [ ] User dashboard listens to `interview_scheduled`
- [ ] User dashboard listens to `notification`
- [ ] Notification bell component created
- [ ] Toast notifications setup (react-hot-toast)
- [ ] Application cards show real-time status
- [ ] Interview info appears when scheduled
- [ ] Notifications persist in bell dropdown
- [ ] Socket reconnects on disconnect
- [ ] User-specific rooms work (`join_user` event)

---

## 🚀 ADVANCED FEATURES (Optional)

### Persistent Notifications

**Add to your backend notifications model:**

```javascript
// models/Notification.js
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  type: String,
  read: { type: Boolean, default: false },
  data: Object,
}, { timestamps: true });
```

**API endpoints:**

```javascript
// GET /api/notifications - get user's notifications
// PUT /api/notifications/:id/read - mark as read
// DELETE /api/notifications/:id - delete notification
```

### Notification Preferences

**Add user preferences:**

```javascript
// User model
notificationPreferences: {
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  sms: { type: Boolean, default: false }
}
```

---

Happy real-time coding! 🎉
