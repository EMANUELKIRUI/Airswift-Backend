# Audit Logs - Fix & Setup Guide

## Problem
Admin panel showed error: "Unable to load audit logs. Please try again."

## Root Causes Fixed

### 1. **Inconsistent Response Format**
- **Issue**: Endpoints returned raw array instead of JSON object with success flag
- **Fix**: Updated all endpoints to return `{ success: true, data: logs, pagination: {...} }`

### 2. **Incomplete Error Handling**
- **Issue**: Generic error messages without context
- **Fix**: Added detailed error logging and better error responses

### 3. **Missing Pagination Support**
- **Issue**: Endpoints didn't support pagination which frontend might expect
- **Fix**: Added pagination with page, limit, and total count

### 4. **Inconsistent Permissions**
- **Issue**: Some endpoints missing proper authentication
- **Fix**: Ensured all endpoints have `verifyToken` + `permit('view_audit_logs')`

## Endpoints Fixed

### ✅ Primary Endpoint: GET `/api/admin/audit-logs`
**File**: `backend/routes/auditLogs.js`  
**Auth**: Required (verifyToken + permit('view_audit_logs'))

**Query Parameters**:
- `search` - Search description (case-insensitive regex)
- `action` - Filter by action type
- `user` - Filter by user ID
- `startDate` - Filter from date (ISO format)
- `endDate` - Filter to date (ISO format)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50, max: 200)

**Success Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60abc123",
      "user_id": {
        "_id": "60user123",
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin"
      },
      "action": "LOGIN",
      "resource": "AUTH",
      "description": "User successfully logged in",
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-04-20T10:30:00Z"
      },
      "createdAt": "2026-04-20T10:30:00Z",
      "updatedAt": "2026-04-20T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

**Error Response (500)**:
```json
{
  "success": false,
  "message": "Failed to fetch audit logs",
  "error": "Connection timeout" // Only in development
}
```

---

### ✅ Alternative Endpoint: GET `/api/admin/audit`
**File**: `backend/routes/admin.js`  
**Auth**: Required (protect + authorize('admin') + permit('view_audit_logs'))  
**Note**: Same functionality as primary endpoint, routed through admin middleware

---

### ✅ Individual Log Endpoint: GET `/api/admin/audit-logs/:id`
**File**: `backend/routes/auditLogs.js`  
**Auth**: Required (verifyToken + permit('view_audit_logs'))

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "60abc123",
    "user_id": {...},
    "action": "LOGIN",
    "resource": "AUTH",
    ...
  }
}
```

---

## Setup Instructions

### 1. Verify Backend Routes
```bash
cd /workspaces/Airswift-Backend/backend
npm start
```

### 2. Generate Sample Audit Logs
```bash
cd /workspaces/Airswift-Backend
node seed-audit-logs.js
```

Output:
```
✅ Connected to MongoDB
🗑️ Clearing existing audit logs...
✅ Cleared existing audit logs
📝 Creating sample audit logs...
✅ Created 20 sample audit logs

📊 Audit Log Summary:
Total logs: 20

By Action:
  LOGIN: 2
  CREATE_APPLICATION: 3
  UPDATE_APPLICATION: 2
  ...
```

### 3. Test Audit Logs Endpoint
```bash
# With cURL
curl -X GET "http://localhost:5000/api/admin/audit-logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Access Admin Panel
- Navigate to: `http://localhost:3000/admin/audit`
- The logs should now display without errors

---

## Audit Log Events Tracked

### Authentication Events
- `LOGIN` - User login successful
- `LOGOUT` - User logout
- `FAILED_LOGIN` - Login attempt failed
- `EMAIL_VERIFICATION` - Email address verified
- `PASSWORD_RESET` - Password reset successful
- `REGISTER` - New user registration

### Application Events
- `APPLICATION_SUBMITTED` - User submitted application
- `UPDATE_APPLICATION` - Admin updated application
- `APPLICATION_APPROVED` - Admin approved application
- `APPLICATION_REJECTED` - Admin rejected application
- `APPLICATION_SHORTLISTED` - Application shortlisted

### User Management Events
- `CREATE_USER` - New user created
- `UPDATE_USER` - User information updated
- `DELETE_USER` - User account deleted
- `UPDATE_USER_ROLE` - User role changed

### Interview Events
- `SCHEDULE_INTERVIEW` - Interview scheduled
- `INTERVIEW_COMPLETED` - Interview marked as complete
- `INTERVIEW_ATTENDED` - Applicant attended interview

### System Events
- `EXPORT_DATA` - Data export requested
- `IMPORT_DATA` - Data import completed
- `CHANGE_SETTINGS` - System settings modified
- `VIEW_DASHBOARD` - Dashboard accessed

---

## How to Enable Audit Logging in New Features

### Method 1: Using createAuditLog (Recommended)
```javascript
const { createAuditLog } = require('../utils/auditLogger');

// In your controller
await createAuditLog({
  user: req.user,
  action: "CREATE_APPLICATION",
  resource: "APPLICATION",
  description: "User submitted new application",
  metadata: {
    applicationId: application._id,
    jobId: job._id,
  }
});
```

### Method 2: Using logAction
```javascript
const { logAction } = require('../utils/auditLogger');

await logAction({
  userId: req.user.id,
  action: "UPDATE_USER",
  resource: "USER",
  description: `Admin updated user ${user.name}`,
  metadata: { userId: user._id, changes: {...} }
});
```

### Method 3: Using logUserActivity
```javascript
const { logUserActivity } = require('../utils/auditLogger');

await logUserActivity(req.user.id, "LOGIN", req, {
  description: "User login via email",
  event: "user_login"
});
```

---

## Audit Log Performance Optimization

### Indexes (Recommended)
```javascript
// Add to AuditLogMongo.js schema
auditLogSchema.index({ user_id: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ createdAt: -1 });
```

### Pagination Best Practices
- Use `page` and `limit` parameters
- Limit results to prevent memory issues
- Cache frequently accessed ranges

### Archive Old Logs
```bash
# Delete logs older than 90 days
node -e "
const mongoose = require('mongoose');
const AuditLog = require('./backend/models/AuditLogMongo');
const date = new Date(Date.now() - 90*24*60*60*1000);
AuditLog.deleteMany({ createdAt: { \$lt: date } }).then(
  res => console.log('Deleted', res.deletedCount, 'old logs')
).catch(err => console.error(err));
"
```

---

## Troubleshooting

### Error: "Failed to fetch audit logs"

**Check 1**: Is MongoDB running?
```bash
# Test connection
mongo --version
```

**Check 2**: Is the backend running?
```bash
# Check if service is listening
netstat -tuln | grep 5000
```

**Check 3**: Are you authenticated?
```bash
# Verify token in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/audit-logs
```

**Check 4**: Do you have permission?
```bash
# Verify admin user has 'view_audit_logs' permission
# Check backend/config/roles.js
```

### Error: "Audit logs fetch error: user not authenticated"

**Solution**: Make sure to include Bearer token in Authorization header
```bash
curl -X GET http://localhost:5000/api/admin/audit-logs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Response is empty array but should have logs

**Solution 1**: Seed sample data
```bash
node seed-audit-logs.js
```

**Solution 2**: Check if audit logging is enabled in your application events
```javascript
// Verify createAuditLog is being called when events occur
// Check console.log outputs in server
```

---

## Testing Checklist

- [ ] Backend started without errors
- [ ] MongoDB connections working
- [ ] Sample audit logs seeded successfully
- [ ] Admin can access `/api/admin/audit-logs` endpoint
- [ ] Logs display in admin panel
- [ ] Pagination works correctly
- [ ] Filters (search, action, user, date) work
- [ ] Individual log details can be retrieved
- [ ] New events create audit logs automatically

---

## Configuration Files Involved

1. `backend/routes/auditLogs.js` - Main audit logs routes
2. `backend/routes/audit.js` - Alternative audit routes
3. `backend/routes/admin.js` - Admin routes with audit endpoint
4. `backend/models/AuditLogMongo.js` - Audit log schema
5. `backend/utils/auditLogger.js` - Audit logging utilities
6. `backend/config/roles.js` - Permission definitions
7. `backend/middleware/auth.js` - Authentication middleware

---

## Real-time Updates

Audit logs are emitted in real-time via Socket.io for admin dashboard:
```javascript
io.to("admins").emit("auditLogCreated", log);
```

Subscribe to real-time updates in frontend:
```javascript
socket.on("auditLogCreated", (log) => {
  // Update dashboard in real-time
  setLogs(prev => [log, ...prev]);
});
```

---

## API Response Examples

### Example 1: List All Logs (Last 7 Days)
```bash
curl "http://localhost:5000/api/admin/audit-logs?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 2: Search Logs
```bash
curl "http://localhost:5000/api/admin/audit-logs?search=login&page=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3: Filter by Action
```bash
curl "http://localhost:5000/api/admin/audit-logs?action=LOGIN&page=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 4: Filter by Date Range
```bash
curl "http://localhost:5000/api/admin/audit-logs?startDate=2026-04-01&endDate=2026-04-20" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5: Get Single Log
```bash
curl "http://localhost:5000/api/admin/audit-logs/60abc123" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related Documentation

- [APPLICATION_FLOW_FIX_SUMMARY.md](./APPLICATION_FLOW_FIX_SUMMARY.md) - Application submission fixes
- [API_ENDPOINTS_REFERENCE.md](./API_ENDPOINTS_REFERENCE.md) - Full API endpoints
- [backend/models/AuditLogMongo.js](./backend/models/AuditLogMongo.js) - Schema definition
- [backend/config/roles.js](./backend/config/roles.js) - Permission definitions
