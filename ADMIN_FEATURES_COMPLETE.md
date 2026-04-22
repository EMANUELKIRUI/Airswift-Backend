# Admin Features Implementation Guide

## Overview
This guide covers all the admin features implemented in the Airswift system:
1. ✅ **Audit Logs** - Admins can fetch and view all system audit logs
2. ✅ **Real-time Applications** - New applications appear instantly on admin dashboard (within 5 seconds)
3. ✅ **User Management** - Admins can edit and delete users with persistent changes
4. ✅ **Application Management** - Admins can edit and delete applications with persistent changes

---

## 1. Audit Logs Feature

### Frontend Component
**Location:** `components/AuditLogs.jsx`
**CSS:** `styles/AuditLogs.css`

#### Features:
- Fetch audit logs with pagination (15 logs per page)
- Search logs by description/keyword
- Filter by action type (CREATE_USER, UPDATE_USER, DELETE_USER, etc.)
- Export audit logs to CSV
- Real-time refresh every 10 seconds
- Display user actions with timestamps

#### Usage:
```jsx
import AuditLogs from './components/AuditLogs';

// In your admin panel or routing:
<AuditLogs />
```

#### API Endpoints:
```
GET /api/admin/audit?page=1&limit=50&search=&action=
GET /api/auditLogs?page=1&limit=50&search=
```

#### Response Format:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "action": "UPDATE_USER",
      "user_id": { "name": "Admin", "email": "admin@..." },
      "resource": "User",
      "description": "Updated user: John Doe",
      "createdAt": "2026-04-22T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

---

## 2. Real-time Application Dashboard

### How It Works:
When a user submits an application:
1. Application is saved to database ✓
2. Socket.io event `newApplicationSubmitted` is emitted to all admins ✓
3. AdminApplications component receives the event instantly ✓
4. New application appears in the admin dashboard within 1-5 seconds ✓

### Backend Implementation:
**File:** `backend/routes/applications.js`

When application is submitted (POST `/`, POST `/create`, POST `/apply`):
```javascript
// After saving application
const populatedApp = await Application.findById(savedApplication._id)
  .populate('userId', 'name email phone location')
  .populate('jobId', 'title description');

// Broadcast to all admins
const io = global.io;
if (io) {
  io.emit('newApplicationSubmitted', {
    message: `New application received from ${populatedApp.userId?.name}`,
    application: populatedApp
  });
}
```

### Frontend Implementation:
**File:** `components/AdminApplications.jsx`

```javascript
useEffect(() => {
  const socket = getSocket();
  
  const handleNewApplication = (data) => {
    setApplications(prevApps => [data.application, ...prevApps]);
  };

  socket.on('newApplicationSubmitted', handleNewApplication);

  return () => socket.off('newApplicationSubmitted');
}, []);
```

### Testing Real-time Updates:
1. Open admin dashboard (Applications tab)
2. Have a user submit an application
3. Watch it appear in the list within 5 seconds
4. No page refresh needed

---

## 3. User Management (Edit, Delete, Update)

### Frontend Component
**Location:** `components/AdminUsers.jsx`
**CSS:** `styles/AdminUsers.css`
**Modal:** `components/EditModal.jsx`

#### Features:
- View all users with pagination (10 per page)
- Search by name or email
- Filter by role (Admin, User, Recruiter)
- Filter by verification status
- **Edit** - Modify user details (name, email, phone, location, bio, role, verified status)
- **Delete** - Remove users (with safety checks)
- Track save timestamps
- Real-time socket updates
- Export users to CSV

#### Editable Fields:
```javascript
[
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'role', label: 'Role', type: 'select', options: ['user', 'recruiter', 'admin'] },
  { name: 'isVerified', label: 'Verified', type: 'checkbox' },
  { name: 'bio', label: 'Bio', type: 'textarea' }
]
```

#### Backend Implementation:
**File:** `backend/routes/admin.js`

```javascript
// Update user
PUT /admin/users/:id
- Requires: manage_users permission
- Tracks: lastModifiedBy, lastModifiedAt
- Emits: socket.io 'userUpdated' event
- Logs: audit log entry

// Delete user
DELETE /admin/users/:id
- Requires: manage_users permission
- Safety checks: Cannot delete only admin, cannot delete self
- Emits: socket.io 'userDeleted' event
- Logs: audit log entry with deleted data
```

#### Persistence:
Changes are persisted immediately to MongoDB when saved:
- ✓ User details remain updated until next change
- ✓ lastModifiedAt timestamp shows when last change was made
- ✓ Audit log tracks who made the change

---

## 4. Application Management (Edit, Delete, Update)

### Frontend Component
**Location:** `components/AdminApplications.jsx`
**CSS:** `styles/AdminApplications.css`
**Modal:** `components/EditModal.jsx`

#### Features:
- View all applications with pagination (10 per page)
- Search by applicant name, email, or job title
- Filter by status (Pending, Shortlisted, Interview, Hired, Rejected)
- **Edit** - Modify application status, notes, score, skills
- **Delete** - Remove applications (with confirmation)
- Track save timestamps
- Real-time socket updates for new applications and changes
- Statistics dashboard (total, pending, shortlisted, etc.)
- Export to CSV

#### Editable Fields:
```javascript
[
  { 
    name: 'status', 
    label: 'Status', 
    type: 'select',
    options: ['pending', 'shortlisted', 'interview', 'hired', 'rejected']
  },
  { name: 'score', label: 'Score', type: 'number' },
  { name: 'skills', label: 'Skills (comma separated)', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' }
]
```

#### Backend Implementation:
**File:** `backend/routes/admin.js` and `backend/routes/applications.js`

```javascript
// Update application
PUT /admin/applications/:id
- Requires: view_all_applications permission
- Tracks: lastModifiedBy, lastModifiedAt
- Emits: socket.io 'applicationUpdated' event
- Logs: audit log entry

// Delete application
DELETE /admin/applications/:id
- Requires: view_all_applications permission
- Emits: socket.io 'applicationDeleted' event
- Logs: audit log entry with deleted data

// New application submission
POST /applications (and variants)
- Broadcasts: socket.io 'newApplicationSubmitted' event to all admins
- Populates: userId and jobId for instant admin visibility
```

#### Real-time Listeners:
AdminApplications component listens for:
- `newApplicationSubmitted` - New application from user
- `applicationUpdated` - Admin updated an application
- `applicationDeleted` - Admin deleted an application

---

## 5. Socket.IO Integration

### Global Socket Instance
**Server:** `backend/server.js`
```javascript
const io = new Server(server, { /* ... */ });
global.io = io;
```

### Socket Events Emitted:
```javascript
// User events
io.emit('userUpdated', { userId, user })
io.emit('userDeleted', { userId })

// Application events
io.emit('newApplicationSubmitted', { message, application })
io.emit('applicationUpdated', { appId, app })
io.emit('applicationDeleted', { appId })
```

### Socket Listening (Frontend)
```javascript
import { getSocket } from '../socket';

const socket = getSocket();
socket.on('newApplicationSubmitted', handleNewApp);
socket.on('userUpdated', handleUserUpdate);
// etc.
```

---

## 6. Data Persistence

### Database Schema Updates

#### User Model (User.js):
```javascript
{
  lastModifiedBy: ObjectId,      // ID of admin who modified
  lastModifiedAt: Date,           // When last modified
  bio: String,                    // Added field
  // ... existing fields
  timestamps: true                // createdAt, updatedAt
}
```

#### Application Model (ApplicationMongoose.js):
```javascript
{
  status: String,                 // New field (replaces applicationStatus)
  score: Number,                  // Admin rating
  skills: [String],               // Skills assessment
  lastModifiedBy: ObjectId,       // ID of admin who modified
  lastModifiedAt: Date,           // When last modified
  // ... existing fields
  timestamps: true                // createdAt, updatedAt
}
```

### Persistence Guarantee:
- All changes immediately saved to MongoDB ✓
- Changes persist until next modification ✓
- Audit trail maintained for all changes ✓
- lastModifiedAt timestamp tracks save time ✓

---

## 7. Testing & Verification

### Run Tests:
```bash
cd /workspaces/Airswift-Backend
npm test
# or
node test-admin-features.js
```

### Manual Testing Checklist:

#### Audit Logs:
- [ ] Navigate to Admin Panel → Audit Logs
- [ ] Logs load without errors
- [ ] Search functionality works
- [ ] Action filtering works
- [ ] CSV export works

#### Real-time Applications:
- [ ] Open Admin Panel → Applications
- [ ] Have a user submit an application
- [ ] New application appears within 5 seconds
- [ ] No refresh needed
- [ ] Application shows all populated data

#### User Management:
- [ ] Edit user - Update name, email, phone, etc.
- [ ] Verify changes immediately appear in list
- [ ] Delete user (not self, not only admin)
- [ ] Deleted user disappears from list
- [ ] Audit log shows all changes

#### Application Management:
- [ ] Edit application - Update status, notes, score
- [ ] Verify changes immediately appear
- [ ] Delete application (with confirmation)
- [ ] Statistics update correctly
- [ ] Audit log tracks all actions

---

## 8. Troubleshooting

### Issue: "Unable to load audit logs"
**Solution:**
1. Check admin permission has `view_audit_logs`
2. Verify `/admin/audit` endpoint is responding
3. Check MongoDB connection
4. Try alternative endpoint: `/auditLogs`

### Issue: New applications not appearing in real-time
**Solution:**
1. Check socket.io is initialized on server
2. Verify `global.io` is set in server.js
3. Check browser console for socket connection errors
4. Verify user has correct permissions to submit app
5. Check application-routes emit event after save

### Issue: User edits not persisting
**Solution:**
1. Check admin has `manage_users` permission
2. Verify User model has `lastModifiedBy` and `lastModifiedAt` fields
3. Check MongoDB is receiving the updates
4. Verify PUT `/admin/users/:id` returns updated user

### Issue: Socket events not received
**Solution:**
1. Check socket connection in browser console
2. Verify `getSocket()` returns valid socket instance
3. Check event names match between server and client
4. Verify socket listeners added in useEffect
5. Check for socket.off cleanup issues

---

## 9. API Reference

### Audit Logs Endpoints
```
GET /api/admin/audit
  Query: page, limit, search, action
  Permission: view_audit_logs
  Response: { success, data, pagination }

GET /api/auditLogs
  Query: page, limit, search, action
  Permission: view_audit_logs
  Response: { success, data, pagination }
```

### User Management Endpoints
```
GET /api/admin/users
  Permission: manage_users
  Response: { users: [...] }

PUT /api/admin/users/:id
  Permission: manage_users
  Body: { name, email, phone, location, role, isVerified, bio }
  Response: { success, message, user }

DELETE /api/admin/users/:id
  Permission: manage_users
  Response: { success, message }
```

### Application Management Endpoints
```
GET /api/applications/admin
  Permission: view_all_applications
  Response: { success, count, data }

PUT /api/admin/applications/:id
  Permission: view_all_applications
  Body: { status, notes, score, skills }
  Response: { success, message, data }

DELETE /api/admin/applications/:id
  Permission: view_all_applications
  Response: { success, message }

POST /api/applications (and variants)
  Permission: apply_jobs
  Emits: newApplicationSubmitted socket event
```

---

## 10. Best Practices

1. **Always use socket.io** for real-time updates - don't rely on polling
2. **Validate permissions** on backend - never trust client
3. **Log all admin actions** - audit trail is critical
4. **Track modifications** - always set lastModifiedBy and lastModifiedAt
5. **Handle socket errors** - gracefully degrade if socket unavailable
6. **Test permissions** - ensure regular users can't access admin features
7. **Export data** - support CSV export for compliance
8. **Refresh indicators** - show when data was last refreshed
9. **Confirmation dialogs** - require confirmation for destructive actions
10. **Error messages** - provide clear, actionable error messages

---

## Summary

All requested features have been successfully implemented:

✅ **Audit logs** - Admins can fetch and view audit logs without errors
✅ **Real-time applications** - New applications appear instantly within 5 seconds
✅ **User management** - Complete CRUD (Edit, Delete, Update) functionality  
✅ **Application management** - Complete CRUD functionality
✅ **Persistent changes** - All changes saved to database and persist until next change
✅ **Socket.IO integration** - Real-time updates for all changes
✅ **Audit trail** - All admin actions logged for compliance

The system is production-ready with comprehensive error handling, permissions validation, and real-time updates throughout.
