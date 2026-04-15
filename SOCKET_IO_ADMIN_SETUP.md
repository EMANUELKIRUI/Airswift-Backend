# 🔥 Real-Time Application Events - Frontend Implementation

## Overview

Your backend is now emitting application events **only to admins** via Socket.io. This guide shows how to connect your admin dashboard to receive real-time notifications.

---

## 1️⃣ SETUP: Install Socket.io Client

```bash
npm install socket.io-client
```

---

## 2️⃣ CREATE Socket.io Service

Create `services/socket.js`:

```javascript
import { io } from 'socket.io-client';

let socket = null;

// Initialize socket connection
export const initializeSocket = (token) => {
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
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  return socket;
};

// Get socket instance
export const getSocket = () => socket;

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

---

## 3️⃣ SETUP: Socket Authentication in Backend

Add this to your `server.js` Socket.io setup (around line 82):

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    // Allow connection but mark as unauthenticated
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    // Allow connection; will be validated in event handlers
    next();
  }
});
```

---

## 4️⃣ ADMIN DASHBOARD: Listen for New Applications

Create `pages/admin/applications.jsx`:

```javascript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API from '@/utils/api';
import { initializeSocket, getSocket } from '@/services/socket';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize socket with authentication token
    const socket = initializeSocket(token);

    // 🔥 Listen for new applications
    socket.on('new_application', (data) => {
      console.log('🔥 New application received:', data);

      // Add to top of list instantly
      setApplications((prev) => {
        // Avoid duplicates
        const exists = prev.some((app) => app.applicationId === data.applicationId);
        if (exists) return prev;
        
        return [
          {
            applicationId: data.applicationId,
            applicantName: data.applicantName,
            jobTitle: data.jobTitle,
            email: data.email,
            score: data.score,
            status: data.status,
            timestamp: new Date(data.timestamp),
          },
          ...prev,
        ];
      });

      // Optional: Show toast notification
      showNotification(`New application from ${data.applicantName}!`);
    });

    // 🔄 Listen for application status updates
    socket.on('applicationUpdate', (data) => {
      console.log('🔄 Application updated:', data);

      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === data.applicationId
            ? { ...app, status: data.status, updatedAt: new Date(data.timestamp) }
            : app
        )
      );

      showNotification(`Application status updated to: ${data.status}`);
    });

    // Load existing applications
    loadApplications();

    // Cleanup on unmount
    return () => {
      socket.off('new_application');
      socket.off('applicationUpdate');
    };
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/applications/mongo');
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message) => {
    // Implement your notification logic here
    console.log('🔔 Notification:', message);
    // E.g., toast.success(message)
  };

  if (loading) return <div>Loading applications...</div>;

  return (
    <div className="admin-applications">
      <h1>Live Applications Dashboard 🔥</h1>
      
      <div className="applications-list">
        {applications.length === 0 ? (
          <p>No applications yet</p>
        ) : (
          applications.map((app) => (
            <div key={app.applicationId} className="application-card">
              <div className="card-header">
                <h3>{app.applicantName}</h3>
                <span className={`status status-${app.status}`}>{app.status}</span>
              </div>
              <p><strong>Job:</strong> {app.jobTitle}</p>
              <p><strong>Email:</strong> {app.email}</p>
              <p><strong>Score:</strong> {app.score}/100</p>
              <p><strong>Submitted:</strong> {new Date(app.timestamp).toLocaleString()}</p>
              <button onClick={() => viewApplicationDetails(app.applicationId)}>
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const viewApplicationDetails = (appId) => {
  // Navigate to application detail page
  console.log('View application:', appId);
};
```

---

## 5️⃣ LISTEN FOR INTERVIEW SCHEDULING

**Add to your admin applications page:**

```javascript
useEffect(() => {
  const socket = getSocket();
  
  if (!socket) return;

  // 🎤 Listen for new interviews
  socket.on('new_interview', (data) => {
    console.log('🎤 Interview scheduled:', data);
    
    setApplications((prev) =>
      prev.map((app) =>
        app.applicationId === data.applicationId
          ? { ...app, interviewScheduled: true, interviewDate: data.scheduledDate }
          : app
      )
    );

    showNotification(
      `Interview scheduled for ${data.applicantName} on ${new Date(data.scheduledDate).toLocaleDateString()}`
    );
  });

  return () => {
    socket.off('new_interview');
  };
}, []);
```

---

## 6️⃣ LISTEN FOR CV SCORING UPDATES

**Add to your admin dashboard:**

```javascript
useEffect(() => {
  const socket = getSocket();
  
  if (!socket) return;

  // 🧠 Listen for CV scoring
  socket.on('cvScoringComplete', (data) => {
    console.log('🧠 CV Scoring complete:', data);
    
    setApplications((prev) =>
      prev.map((app) =>
        app.applicationId === data.applicationId
          ? { 
              ...app, 
              score: data.score, 
              skills: data.skills,
              scoredAt: new Date(data.timestamp)
            }
          : app
      )
    );

    showNotification(
      `CV scoring complete for ${data.applicantName}: ${data.score}/100`
    );
  });

  return () => {
    socket.off('cvScoringComplete');
  };
}, []);
```

---

## 7️⃣ COMPLETE ADMIN PAGE (FULL EXAMPLE)

```javascript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API from '@/utils/api';
import { initializeSocket, getSocket } from '@/services/socket';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, reviewed, accepted, rejected
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize socket
    const socket = initializeSocket(token);

    // 🔥 New application
    socket.on('new_application', (data) => {
      console.log('🔥 New application:', data);
      setApplications((prev) => {
        const exists = prev.some((app) => app.applicationId === data.applicationId);
        if (exists) return prev;
        setUnreadCount((count) => count + 1);
        return [formatApplicationData(data), ...prev];
      });
    });

    // 🔄 Status update
    socket.on('applicationUpdate', (data) => {
      console.log('🔄 Status updated:', data);
      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === data.applicationId
            ? { ...app, status: data.status, updatedAt: data.timestamp }
            : app
        )
      );
    });

    // 🎤 Interview scheduled
    socket.on('new_interview', (data) => {
      console.log('🎤 Interview scheduled:', data);
      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === data.applicationId
            ? { ...app, interviewDate: data.scheduledDate }
            : app
        )
      );
    });

    // Load initial data
    loadApplications();

    return () => {
      socket.off('new_application');
      socket.off('applicationUpdate');
      socket.off('new_interview');
    };
  }, []);

  const loadApplications = async () => {
    try {
      const response = await API.get('/api/applications/mongo');
      setApplications(response.data.map(formatApplicationData));
      setLoading(false);
    } catch (error) {
      console.error('Error loading applications:', error);
      setLoading(false);
    }
  };

  const formatApplicationData = (app) => ({
    applicationId: app._id || app.applicationId,
    applicantName: app.userId?.name || app.applicantName,
    jobTitle: app.jobId?.title || app.jobTitle,
    email: app.userId?.email || app.email,
    score: app.aiScore || app.score || 0,
    status: app.status || 'pending',
    timestamp: app.createdAt || new Date(),
  });

  const filteredApplications = applications.filter(
    (app) => filter === 'all' || app.status === filter
  );

  if (loading) return <div className="loading">Loading applications...</div>;

  return (
    <div className="admin-applications-page">
      <div className="header">
        <h1>Live Applications Dashboard</h1>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount} new</span>}
      </div>

      <div className="filters">
        {['all', 'pending', 'reviewed', 'accepted', 'rejected'].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="applications">
        {filteredApplications.map((app) => (
          <div key={app.applicationId} className="app-card">
            <div className="app-header">
              <h3>{app.applicantName}</h3>
              <span className={`status ${app.status}`}>{app.status}</span>
            </div>
            <p>📋 {app.jobTitle}</p>
            <p>📧 {app.email}</p>
            <p>⭐ Score: {app.score}</p>
            <div className="app-actions">
              <button onClick={() => router.push(`/admin/applications/${app.applicationId}`)}>
                View Details
              </button>
              <button onClick={() => scheduleInterview(app.applicationId)}>
                Schedule Interview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const scheduleInterview = (appId) => {
  console.log('Schedule interview for:', appId);
  // Implement interview scheduling
};
```

---

## 🔐 SOCKET AUTHENTICATION

**Backend already handles this automatically:**

1. When admin connects with token, Socket.io verifies it
2. Socket checks if user role is 'admin'
3. If admin, socket automatically joins 'admins' room
4. All admin events are emitted only to this room

---

## 🎯 EVENT NAMES REFERENCE

| Event | Trigger | Data |
|-------|---------|------|
| `new_application` | User submits application | `{ applicationId, applicantName, jobTitle, email, score, status, timestamp }` |
| `applicationUpdate` | Admin updates status | `{ applicationId, applicantName, jobTitle, status, updatedBy, timestamp }` |
| `new_interview` | Interview scheduled | `{ applicationId, interviewId, applicantName, scheduledDate, interviewType, roomId }` |
| `cvScoringComplete` | AI finishes scoring CV | `{ applicationId, applicantName, score, skills, timestamp }` |

---

## 🧪 TESTING SOCKET CONNECTION

**Add debug page at `/debug/socket`:**

```javascript
import { getSocket } from '@/services/socket';
import { initializeSocket } from '@/services/socket';

export default function SocketDebug() {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = initializeSocket(token);

    socket.on('connect', () => setStatus('Connected ✅'));
    socket.on('disconnect', () => setStatus('Disconnected ❌'));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const testEmitApplicationEvent = () => {
    const socket = getSocket();
    // This won't work from client, but shows structure
    console.log('Socket connected:', socket?.connected);
  };

  return (
    <div>
      <h1>Socket.io Debug</h1>
      <p>Status: {status}</p>
      <button onClick={testEmitApplicationEvent}>Test Connection</button>
    </div>
  );
}
```

---

## ✅ CHECKLIST

- [ ] Socket.io client installed
- [ ] Socket service created with authentication
- [ ] Admin dashboard listens to `new_application` event
- [ ] Admin dashboard listens to `applicationUpdate` event
- [ ] Admin dashboard listens to `new_interview` event
- [ ] Applications appear instantly when submitted
- [ ] Status updates appear in real-time
- [ ] New applications show at top of list
- [ ] Unread count updates
- [ ] Socket reconnects on disconnect
- [ ] Backend Socket.use auth middleware adds token verification

---

## 🚀 DEPLOYMENT NOTES

**For production (Vercel frontend + backend):**

```javascript
// Backend Socket.io CORS (already set in server.js)
const io = new Server(server, {
  cors: {
    origin: "https://airswift-frontend.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Frontend socket initialization
const socket = io('https://your-backend-api.com', {
  transports: ['websocket', 'polling']
});
```

---

Happy real-time coding! 🎉
