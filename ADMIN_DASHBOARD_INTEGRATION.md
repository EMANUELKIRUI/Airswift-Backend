# Admin Dashboard Integration Guide

## Overview
This guide shows how to integrate all admin features (Users, Applications, Settings) into a comprehensive admin dashboard.

## Quick Start

### 1. Create Admin Dashboard Component

```javascript
// components/AdminDashboard.jsx
import React, { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminApplications from './AdminApplications';
import AdminSettings from './AdminSettings';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="admin-dashboard">
      {/* Navigation Tabs */}
      <div className="admin-nav">
        <button
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          📋 Applications
        </button>
        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'applications' && <AdminApplications />}
        {activeTab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}

function AdminOverview() {
  return (
    <div className="overview-section">
      <h2>⚡ Dashboard Overview</h2>
      <p>Welcome to the Admin Panel. Use the tabs above to manage:</p>
      <ul>
        <li><strong>👥 Users:</strong> View, edit, and delete user accounts</li>
        <li><strong>📋 Applications:</strong> View, edit (status, score, notes), and delete job applications</li>
        <li><strong>⚙️ Settings:</strong> Configure system settings and preferences</li>
      </ul>
      <div className="feature-cards">
        <div className="feature-card">
          <h3>✏️ Edit Features</h3>
          <p>Click Edit button to modify user/application details. Changes are saved immediately with timestamps.</p>
        </div>
        <div className="feature-card">
          <h3>🗑️ Delete Features</h3>
          <p>Click Delete with confirmation to remove users or applications. Full audit trail maintained.</p>
        </div>
        <div className="feature-card">
          <h3>💾 Persistent Saves</h3>
          <p>All changes tracked with timestamps. Changes persist until you modify them again.</p>
        </div>
        <div className="feature-card">
          <h3>📝 Audit Logs</h3>
          <p>Every change recorded with admin ID, action, and timestamp for full accountability.</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
```

### 2. Create Dashboard Styles

```css
/* styles/AdminDashboard.css */

.admin-dashboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}

.admin-nav {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.nav-btn {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-btn:hover {
  background: #e0e0e0;
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.admin-content {
  flex: 1;
}

.overview-section {
  padding: 30px;
}

.overview-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.overview-section p {
  color: #666;
  margin-bottom: 10px;
}

.overview-section ul {
  margin: 15px 0 30px 20px;
  list-style-type: none;
}

.overview-section li {
  padding: 8px 0;
  color: #555;
  line-height: 1.6;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.feature-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #667eea;
}

.feature-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.feature-card p {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 768px) {
  .admin-nav {
    flex-wrap: wrap;
    gap: 8px;
  }

  .nav-btn {
    padding: 8px 15px;
    font-size: 12px;
  }

  .overview-section {
    padding: 20px;
  }

  .feature-cards {
    grid-template-columns: 1fr;
  }
}
```

### 3. Update App.jsx

```javascript
// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppNotificationProvider } from './components/AppNotificationProvider';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppNotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

## Features Summary

### User Management (AdminUsers.jsx)
```
GET /admin/users                 - List all users
PUT /admin/users/:id             - Edit user details
DELETE /admin/users/:id          - Delete user

Editable Fields:
- name, email, phone, location, role, isVerified, bio

Timestamps:
- lastModifiedBy (admin who made change)
- lastModifiedAt (when change was made)

Indicators:
- 💾 HH:MM:SS save timestamp display
```

### Application Management (AdminApplications.jsx)
```
GET /admin/applications          - List all applications
PUT /admin/applications/:id      - Update application
DELETE /admin/applications/:id   - Delete application

Editable Fields:
- status, score, skills, notes

Timestamps:
- lastModifiedBy (admin who made change)
- lastModifiedAt (when change was made)

Indicators:
- 💾 HH:MM:SS save timestamp display
```

### Settings Management (AdminSettings.jsx)
```
GET /admin/settings              - Get all settings
PUT /admin/settings              - Update settings
GET /admin/settings/history      - View change history

Categories:
- System (Site Name, Logo, Email)
- Features (Notifications, Applications)
- Security (Login Attempts, Session Timeout, 2FA)
- Maintenance (Mode, Message, Backup)

Timestamps:
- 💾 HH:MM individual field save times
- ● Modified field indicators
- Unsaved changes counter

Changes Tracked:
- UPDATE_SETTINGS in audit logs
- Old values and new values
- Admin ID and timestamp
```

## Workflow Examples

### Editing a User
```
1. Click Users tab
2. Click ✏️ Edit on user row
3. Modal opens with current user data
4. Edit any fields (name, email, role, etc.)
5. Click "Save Changes"
6. See ✅ success notification
7. 💾 save timestamp appears in table
8. Timestamp persists until next edit
9. Audit log records the change
```

### Changing Settings
```
1. Click Settings tab
2. Browse through categories (System, Features, Security, Maintenance)
3. Modify any settings (checkboxes, text, numbers)
4. See ● indicator on modified fields
5. See count of unsaved changes
6. Click "Save All Settings"
7. See 💾 timestamps on each saved field
8. Timestamps persist until next change
9. Full history in audit logs
10. Socket.io notifies other admins in real-time
```

### Deleting an Application
```
1. Click Applications tab
2. Click 🗑️ Delete on application row
3. Confirm deletion in dialog
4. Application removed from table
5. Audit log records deletion
6. Other admins see update in real-time
```

## Permissions Required

```javascript
{
  manage_users: 'Can view, edit, delete users',
  view_all_applications: 'Can view, edit, delete applications',
  manage_settings: 'Can view and edit system settings',
  view_audit_logs: 'Can view audit logs'
}
```

## Real-Time Updates

All changes broadcast via Socket.io:
```javascript
// User updated
io.emit('userUpdated', { userId, user });

// User deleted
io.emit('userDeleted', { userId });

// Application updated
io.emit('applicationUpdated', { appId, app });

// Application deleted
io.emit('applicationDeleted', { appId });

// Settings updated
io.emit('settingsUpdated', { settings });
```

## Audit Trail

All operations logged to AuditLog:
```javascript
{
  user_id: ObjectId,           // Admin who made change
  action: String,              // UPDATE_USER, DELETE_USER, UPDATE_APPLICATION, DELETE_APPLICATION, UPDATE_SETTINGS
  resource: String,            // User, Application, Settings
  description: String,         // Human readable description
  changes: Object,             // What changed (old → new)
  deletedData: Object,         // For deletions, what was deleted
  createdAt: Date             // When it happened
}
```

## Performance Tips

1. **Pagination:** Tables show 10 items per page
2. **Search:** Filter by name or email
3. **Sort:** Click column headers to sort
4. **Real-time:** Socket.io broadcasts changes
5. **Caching:** Original values cached for comparison
6. **Lazy Loading:** Settings categories load on-demand

## Testing Checklist

- [ ] Create admin user with manage_settings permission
- [ ] Load AdminDashboard component
- [ ] Edit user and verify save timestamp
- [ ] Delete user and verify audit log
- [ ] Edit application status
- [ ] Delete application
- [ ] Change settings in multiple categories
- [ ] Save settings and verify timestamps
- [ ] Discard changes and verify rollback
- [ ] Check audit logs for all entries
- [ ] Verify socket.io broadcasts
- [ ] Test on mobile responsive

## Troubleshooting

**Settings not saving?**
- Check manage_settings permission
- Verify `/admin/settings` endpoint is working
- Check browser console for errors
- Verify Settings model exists

**Changes not showing?**
- Check socket.io connection
- Verify real-time update emitters
- Check browser network tab
- Verify admin has correct role

**Timestamps not appearing?**
- Check lastModifiedAt field on model
- Verify save handler updates timestamp
- Check CSS display settings
- Verify date formatting

## Security Notes

✅ All endpoints require authentication
✅ Role and permission checks enforced
✅ All changes audited with admin ID
✅ Database transactions ensure consistency
✅ Socket.io broadcasts limited to authenticated users
✅ Input validation on all fields
✅ Soft delete not implemented (hard delete in use)

---

**Integration Version:** 1.0
**Date:** April 2026
