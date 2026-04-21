# Admin Applications Functionality - Complete Documentation

## Overview

The admin applications feature allows system administrators to view and manage all job applications submitted by users. This functionality includes:

- ✅ Viewing all applications in the system
- ✅ Permission-based access control
- ✅ Real-time application tracking
- ✅ Application status management
- ✅ Applicant information with full details

---

## API Endpoints

### 1. Get All Applications (Primary Endpoint)

**Endpoint**: `GET /api/applications/admin`

**Alternative**: `GET /api/admin/applications`

**Authentication**: Required (Bearer token)

**Permissions Required**: `view_all_applications`

**Request Headers**:
```http
Authorization: Bearer <admin_token>
```

**Response Format** (Success - 200):
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "location": "New York"
      },
      "jobId": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Software Engineer",
        "description": "Senior software engineer position"
      },
      "nationalId": "12345678",
      "phone": "1234567890",
      "passport": "https://cloudinary.com/...",
      "cv": "https://cloudinary.com/...",
      "coverLetter": "I am excited to apply...",
      "applicationStatus": "pending",
      "interview": {
        "scheduled": false,
        "date": null,
        "location": null,
        "mode": null
      },
      "aiScore": 0,
      "submittedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Response** (Forbidden - 403):
```json
{
  "message": "Permission denied",
  "required": ["view_all_applications"],
  "current": ["some_permission"]
}
```

**Error Response** (Not Authenticated - 401):
```json
{
  "message": "No token provided"
}
```

---

### 2. Update Application Status

**Endpoint**: `PUT /api/applications/admin/application/:id/status`

**Authentication**: Required (Bearer token)

**Permissions Required**: `manage_applications`

**Request Body**:
```json
{
  "status": "shortlisted",
  "interviewDate": "2024-02-01T10:00:00Z"
}
```

**Valid Status Values**:
- `pending` - Initial state
- `reviewed` - Admin has reviewed
- `shortlisted` - Candidate is shortlisted
- `accepted` - Accepted
- `rejected` - Rejected
- `interview` - Interview scheduled

---

### 3. Add Notes to Application

**Endpoint**: `PUT /api/applications/admin/application/:id/notes`

**Authentication**: Required (Bearer token)

**Permissions Required**: `manage_applications`

**Request Body**:
```json
{
  "notes": "Excellent technical background. Consider for leadership track."
}
```

---

### 4. Get Admin Statistics

**Endpoint**: `GET /api/applications/admin/stats`

**Authentication**: Required (Bearer token)

**Permissions Required**: `view_analytics`

**Response Format**:
```json
{
  "totalApplications": 25,
  "pendingApplications": 10,
  "reviewedApplications": 8,
  "shortlistedApplications": 5,
  "acceptedApplications": 2,
  "rejectedApplications": 0
}
```

---

## Permissions System

### Role: Admin

Admin users have the following permissions (all of them):

```
✅ view_all_applications  - View all applications submitted
✅ manage_applications    - Update application status and add notes
✅ update_applications    - Update application status
✅ manage_interviews      - Schedule and manage interviews
✅ view_analytics         - View system analytics and statistics
✅ view_audit_logs        - View audit logs
✅ manage_users           - Manage user accounts
✅ ... (and more)
```

### Rule: User

Regular users can only:
- ✅ Apply for jobs (`apply_jobs`)
- ✅ View their own applications (`view_my_applications`)
- ✅ View their own profile

Users cannot:
- ❌ View other users' applications
- ❌ Update application statuses
- ❌ Access admin endpoints

---

## Authentication Flow

### 1. Admin Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439010",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### 2. Use Token for Admin Endpoints

All admin endpoints require the bearer token in the `Authorization` header:

```bash
GET /api/applications/admin
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Middleware Stack

For admin application endpoints:

```javascript
1. protect              // Verifies JWT token and fetches user
2. authorize('admin')   // Confirms user has admin role
3. permit(...)          // Checks specific permission (on any admin route)
```

---

## Code Implementation

### Middleware Chain Example

```javascript
router.get(
  '/admin',
  protect,                              // Step 1: Authenticate
  permit('view_all_applications'),      // Step 2: Check permission
  async (req, res) => {
    // Step 3: Access control passed, execute handler
  }
);
```

### Permission Checking Flow

```
Request → Extract Token → Verify JWT → Fetch User
       ↓
Get User Role → Load Permissions from Config
       ↓
Check if permission exists in user's permission list
       ↓
Continue if match → 403 Forbidden if not
```

---

## Testing

### Run Comprehensive Test Suite

```bash
# Ensure backend is running on port 5000
npm start

# In another terminal, run tests
cd /workspaces/Airswift-Backend
node test-admin-applications.js
```

### Test Coverage

The test script verifies:
1. ✅ Admin can login/signup
2. ✅ Regular user can login/signup
3. ✅ Jobs endpoint is accessible
4. ✅ User can submit application
5. ✅ **Admin can fetch all applications (v1)**
6. ✅ **Admin can fetch all applications (v2)**
7. ✅ Regular user is denied access (403)

### Quick Manual Test

```bash
# 1. Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Note the token from response

# 2. Fetch all applications
curl -X GET http://localhost:5000/api/applications/admin \
  -H "Authorization: Bearer <TOKEN_HERE>"

# Should return:
# {
#   "success": true,
#   "count": N,
#   "data": [...]
# }
```

---

## Troubleshooting

### Issue: "Permission denied" Error

**Cause**: User doesn't have `view_all_applications` permission

**Fix**: Ensure user has `admin` role
```javascript
// In database:
db.users.update({_id: userId}, {role: 'admin'})
```

### Issue: "No token provided" Error

**Cause**: Missing or invalid Authorization header

**Fix**: Include Bearer token in header
```bash
# ✅ Correct
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Wrong (missing Bearer)
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: Empty Applications List

**Cause**: No applications in database yet

**Fix**: Have a user submit an application first:
1. Login as regular user
2. Submit job application via `/api/applications`
3. Then fetch as admin

### Issue: Inconsistent Response Formats

**Status**: ✅ FIXED (April 21, 2026)

Both endpoints now return consistent format:
```json
{
  "success": true,
  "count": N,
  "data": [...]
}
```

---

## Response Format Standardization

### Before Fix ❌
- `/api/applications/admin` returned array
- `/api/admin/applications` returned array
- `/api/applications/admin/all` returned `{success, count, applications}`

### After Fix ✅
- `/api/applications/admin` returns `{success, count, data}`
- `/api/admin/applications` returns `{success, count, data}`
- `/api/applications/admin/all` REMOVED (consolidated to `/admin`)

---

## Related Files

### Routes
- [applications.js](../backend/routes/applications.js) - Primary application endpoints
- [admin.js](../backend/routes/admin.js) - Admin panel endpoints

### Controllers
- [applicationController.js](../backend/controllers/applicationController.js) - Application logic

### Middleware
- [auth.js](../backend/middleware/auth.js) - JWT verification and permission checking

### Configuration
- [roles.js](../backend/config/roles.js) - Role and permission definitions

### Tests
- [test-admin-applications.js](../test-admin-applications.js) - Comprehensive test suite

---

## Summary

The admin applications feature is now:
- ✅ **Working correctly** with permission-based access control
- ✅ **Consolidated** - no duplicate endpoints
- ✅ **Standardized** - consistent response formats
- ✅ **Well-tested** - comprehensive test coverage
- ✅ **Properly documented** - this documentation

Admins can now reliably fetch all applications using either:
- `GET /api/applications/admin`
- `GET /api/admin/applications`

Both return the same consistent response format with full applicant details.
