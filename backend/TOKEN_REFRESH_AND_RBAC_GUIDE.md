# Token Refresh + Full RBAC System Documentation

## Overview

This system implements:
1. **Token Refresh** - Short-lived access tokens + long-lived refresh tokens
2. **Full RBAC** - Role-Based Access Control with granular permissions

## Architecture

### Token System

```
┌─────────────────────────────────────────┐
│         User Logs In                    │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │ Verify      │
        │ Credentials │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐   ┌───────▼────┐
│ Access     │   │ Refresh    │
│ Token      │   │ Token      │
│ 15 min     │   │ 7 days     │
│ (JWT)      │   │ (JWT)      │
└───┬────────┘   └───────┬────┘
    │                     │
    │ JSON                │ HTTP-Only
    │ Response            │ Cookie
    │                     │
    └─────────────────────┘
```

### Permission System

```
┌──────────────┐
│ User Login   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Access Token │ includes role + permissions
└──────┬───────┘
       │
       ▼
┌────────────────────────────┐
│ req.user = {              │
│   id,                      │
│   role,                    │
│   permissions: [...]       │
│ }                          │
└────────────────────────────┘
       │
       ├─▶ authorize('admin')
       │   Check if role == admin
       │
       └─▶ permit('edit_templates')
           Check if permissions include 'edit_templates'
```

## Implementation Details

### 1. Token Generation

**Access Token (Short-lived - 15 minutes)**
```javascript
// Generated at login and refresh
const accessToken = generateAccessToken(user);

// Contains:
{
  id: user._id,
  role: user.role,
  permissions: ['apply_jobs', 'view_profile', ...],
  exp: now + 15min
}
```

**Refresh Token (Long-lived - 7 days)**
```javascript
// Generated at login only
const refreshToken = generateRefreshToken(user);

// Contains:
{
  id: user._id,
  exp: now + 7days
}
```

### 2. Cookie Security

**Refresh Token Storage**
```javascript
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,      // ✅ Not accessible to JavaScript
  secure: true,        // ✅ HTTPS only (production)
  sameSite: 'strict',  // ✅ CSRF protection
  path: '/',
  domain: process.env.DOMAIN // Production domain
});
```

**Why HTTP-only?**
- Prevents XSS attacks from stealing tokens via JavaScript
- Only sent with requests to the server
- Backend controls expiry and rotation

### 3. Token Refresh Flow

```javascript
// Frontend: Every 15 minutes (or when access token expires)
fetch('/auth/refresh', {
  method: 'POST',
  credentials: 'include'  // Send cookies automatically
})
.then(res => res.json())
.then(data => {
  // Store new access token
  localStorage.setItem('accessToken', data.accessToken);
  // Refresh token automatically updated in cookie (HTTP-only)
})
```

### 4. Permissions System

**Defined Roles in `config/roles.js`:**

```javascript
const ROLES = {
  admin: {
    permissions: [
      'manage_users',
      'delete_user',
      'view_dashboard',
      'edit_templates',
      'manage_jobs',
      ...
    ]
  },
  user: {
    permissions: [
      'apply_jobs',
      'view_profile',
      'edit_profile',
      'submit_application',
      ...
    ]
  },
  recruiter: {
    permissions: [
      'recruit_users',
      'schedule_interviews',
      ...
    ]
  }
};
```

## Usage Guide

### Route Protection Patterns

#### Pattern 1: Any Authenticated User
```javascript
import { protect } from '../middleware/auth';

// Any logged-in user
router.get('/profile', protect, getProfile);
```

#### Pattern 2: Specific Role
```javascript
import { protect, authorize } from '../middleware/auth';

// Admin only
router.get('/admin/users', protect, authorize('admin'), getAllUsers);

// Admin or Recruiter
router.get('/interviews', protect, authorize('admin', 'recruiter'), getInterviews);
```

#### Pattern 3: Specific Permission
```javascript
import { protect, permit } from '../middleware/auth';

// Only users with 'edit_templates' permission
router.put('/email-templates/:id', protect, permit('edit_templates'), updateTemplate);

// Only users with 'apply_jobs' permission
router.post('/applications', protect, permit('apply_jobs'), applyJob);

// Multiple permissions required (all must be present)
router.post('/interviews', protect, permit('schedule_interviews', 'manage_interviews'), scheduleInterview);
```

#### Pattern 4: Combined Check
```javascript
// Admin role with specific permission
router.delete('/users/:id', 
  protect, 
  authorize('admin'),       // First: verify admin role
  permit('delete_user'),     // Then: verify permission
  deleteUser
);
```

### Frontend Integration

**Login Request:**
```javascript
// Frontend
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Save cookies
  body: JSON.stringify({ email, password })
});

const { accessToken, user } = await response.json();

// Store access token in localStorage (not secure for sensitive data)
localStorage.setItem('accessToken', accessToken);
// Refresh token automatically stored in HTTP-only cookie
```

**API Requests with Access Token:**
```javascript
// Frontend
const response = await fetch('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  credentials: 'include'  // Send cookies
});
```

**Refresh When Token Expires:**
```javascript
// Frontend utility
async function refreshAccessToken() {
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include'  // Send refresh token cookie
  });

  if (response.ok) {
    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  } else {
    // Refresh failed - redirect to login
    window.location.href = '/login';
  }
}
```

**Automatic Token Refresh Interceptor:**
```javascript
// Frontend - API interceptor
const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired - try to refresh
      try {
        await refreshAccessToken();
        // Retry original request
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## Security Features

### Token Rotation
```javascript
// At each refresh, new refresh token is issued
const newRefreshToken = generateRefreshToken(user);
user.refreshToken = newRefreshToken;
await user.save();

// Old refresh token becomes invalid
```

### Token Reuse Detection
```javascript
// If refresh token doesn't match stored token
if (user.refreshToken !== token) {
  // Possible attack - invalidate all tokens
  user.refreshToken = null;
  await user.save();
  return res.status(401).json({ message: 'Refresh token compromised' });
}
```

### HTTP-Only Cookies
- Refresh token cannot be accessed by JavaScript
- Prevents XSS attacks
- Automatically sent with `credentials: 'include'`

### CSRF Protection
```javascript
// sameSite: 'strict' prevents cross-site requests
// Cookie only sent to same domain
```

## Available Permissions

### User Permissions
```
'apply_jobs'           - Apply for job positions
'view_profile'         - View own profile
'edit_profile'         - Edit own profile
'submit_application'   - Submit job applications
'view_my_applications' - View own applications
'view_interviews'      - View own interviews
```

### Admin Permissions
```
'manage_users'          - Manage all users
'delete_user'           - Delete user accounts
'view_dashboard'        - Access admin dashboard
'view_all_applications' - View all applications
'manage_applications'   - Update application status
'edit_templates'        - Edit email templates
'manage_jobs'           - Create and edit jobs
'manage_interviews'     - Manage all interviews
'view_analytics'        - View system analytics
'view_audit_logs'       - View audit logs
'manage_settings'       - Manage system settings
```

### Recruiter Permissions
```
'recruit_users'           - Manage recruitment
'schedule_interviews'     - Schedule interviews
'view_recruiter_dashboard' - Access recruiter dashboard
```

## Environment Variables

```
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
REFRESH_TOKEN_SECRET=your-refresh-secret (alternative)
```

## Response Examples

### Login Success
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}

// Cookie set:
// refreshToken: [HTTP-only, Secure, SameSite=Strict]
```

### Refresh Token Success
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Cookie updated:
// refreshToken: [new token, HTTP-only, Secure, SameSite=Strict]
```

### Permission Denied
```json
{
  "message": "Permission denied",
  "required": ["edit_templates"],
  "current": ["apply_jobs", "view_profile"]
}
```

## Error Responses

| Status | Message | Meaning |
|--------|---------|---------|
| 401 | No token provided | Missing Authorization header |
| 401 | Invalid token | Token format is wrong |
| 401 | Token failed | Token expired or signature invalid |
| 401 | No refresh token | Cookie not sent with request |
| 401 | Refresh token compromised | Token reuse attack detected |
| 403 | Access denied. Requires: admin | Wrong role |
| 403 | Permission denied | Missing required permission |

## Middleware Reference

```javascript
import { 
  protect,           // Verify JWT token
  authorize,         // Check role
  permit             // Check permissions
} from '../middleware/auth'

// protect: Requires valid access token
router.get('/endpoint', protect, handler);

// authorize: Check role
router.get('/admin', protect, authorize('admin'), handler);

// permit: Check permission
router.post('/edit', protect, permit('edit_templates'), handler);

// Combined
router.delete('/user/:id', 
  protect, 
  authorize('admin'),
  permit('delete_user'),
  handler
);
```

## Best Practices

✅ **DO:**
1. Always use `protect` middleware first
2. Use `authorize()` for role checks
3. Use `permit()` for permission checks
4. Store refresh token in HTTP-only cookie
5. Refresh token before expiry (recommended: 14m for 15m token)
6. Implement token rotation on every refresh
7. Validate permissions on backend (never trust frontend)
8. Log permission denials for security audit

❌ **DON'T:**
1. Remove `httpOnly` from refresh token cookie
2. Send refresh token in JSON response
3. Ignore token expiry
4. Skip permission checks on backend
5. Store sensitive tokens in localStorage
6. Mix access and refresh token usage
7. Use same secret for both token types

## Troubleshooting

### Token Expires Immediately
- Check `JWT_SECRET` is set correctly
- Verify system clock is synchronized
- Check token generation includes correct expiry

### Refresh Fails with "No refresh token"
- Ensure frontend sends `credentials: 'include'`
- Check cookie domain/path matches backend
- Verify HTTPS is enabled in production

### Permission Denied Unexpectedly
- Check user role is in database
- Verify role has the required permission
- Ensure middleware order is: protect → authorize → permit

### Token Reuse Attack Detected
- This is a security feature - user must log in again
- Indicates possible compromise
- Review auth logs and user activity
