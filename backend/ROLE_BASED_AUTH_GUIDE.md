# Role-Based Authentication Guide

## Overview
This backend implements clean, role-based authentication using JWT tokens. All routes are protected with authentication middleware, and role-based authorization is applied where needed.

## Valid Roles
- `admin` - Administrative access to system management, user management, applications
- `user` - Regular user applying for jobs and managing their profile
- `recruiter` - Recruiter-specific features (if implemented)

## How It Works

### 1. JWT Token Includes Role
When a user logs in, the JWT token includes their role:

```javascript
// In authController.js - loginUser function
const token = jwt.sign(
  {
    id: user._id,
    role: user.role,      // ✅ Role is included
    email: user.email,
  },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);
```

### 2. Auth Middleware (Verify Token)
The `protect` middleware verifies the token and extracts the user's role:

```javascript
// In middleware/auth.js
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ Check header exists and has Bearer prefix
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // ✅ Prevent undefined tokens
    if (!token || token === 'undefined') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // ✅ Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Now req.user has id, role, email
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token failed' });
  }
};
```

### 3. Role Authorization Middleware
The `authorize` middleware checks if the user has the required role:

```javascript
// In middleware/auth.js
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }

    // ✅ Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires: ${roles.join(', ')}`,
      });
    }

    next();
  };
};
```

## Usage in Routes

### Protected Routes - All Users
Any authenticated user can access:

```javascript
import { protect } from '../middleware/auth.js';

// Only needs authentication, no role restriction
router.get('/profile', protect, getProfile);
router.post('/applications', protect, applyJob);
```

### Admin-Only Routes
Only admins can access:

```javascript
import { protect, authorize } from '../middleware/auth.js';

// Requires admin role
router.get('/admin/dashboard', protect, authorize('admin'), getAdminDashboard);
router.get('/admin/users', protect, authorize('admin'), getAllUsers);
```

### Multi-Role Routes
Multiple roles can access:

```javascript
import { protect, authorize } from '../middleware/auth.js';

// Both admin and recruiter can access
router.get('/interviews', protect, authorize('admin', 'recruiter'), getInterviews);
```

## Practical Examples

### Example 1: User Profile Route
```javascript
// ✅ Both user and admin can access (but each sees their own data)
router.get('/profile', protect, async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  res.json(user);
});
```

### Example 2: Admin Dashboard
```javascript
// ✅ Only admin can access
router.get('/admin/dashboard', protect, authorize('admin'), async (req, res) => {
  const stats = await getSystemStats();
  res.json(stats);
});
```

### Example 3: Application Status Update
```javascript
// ✅ Only admin can update application status
router.put('/applications/:id/status', 
  protect, 
  authorize('admin'),
  updateApplicationStatus
);
```

### Example 4: Report Access
```javascript
// ✅ User can see their own reports
// ✅ Admin can see all reports
router.get('/reports', protect, async (req, res) => {
  if (req.user.role === 'admin') {
    const reports = await Report.find();
    return res.json(reports);
  }
  
  const reports = await Report.find({ userId: req.user.id });
  res.json(reports);
});
```

## Updated Routes

### Already Using New Pattern ✅
- `/admin` - All routes now use `protect, authorize('admin')`
- `/applications-mongoose` - Updated to use clean syntax

### Command to Update All Routes
Find routes still using `verifyToken, adminOnly`:

```bash
grep -r "verifyToken, adminOnly" backend/routes/
grep -r "adminMiddleware" backend/routes/
```

Then replace with:
```javascript
protect, authorize('admin')
```

## Error Responses

### 401 Unauthorized (No Token)
```json
{
  "message": "No token provided"
}
```

### 401 Unauthorized (Invalid Token)
```json
{
  "message": "Invalid token"
}
```

### 403 Forbidden (Wrong Role)
```json
{
  "message": "Access denied. Requires: admin"
}
```

## Middleware Export Reference

```javascript
// From middleware/auth.js
module.exports = { 
  authMiddleware,      // Main protect function
  protect,             // Alias for authMiddleware
  verifyToken,         // Alias for authMiddleware
  verifyRole,          // Single role check (legacy)
  authorize,           // Multiple role check (recommended)
  authorizeRoles       // Alias for authorize
};
```

## Best Practices

### ✅ DO:
1. Always use `protect` first to verify token
2. Use `authorize('admin')` for admin-only routes
3. Use `authorize('admin', 'user')` for multi-role access
4. Check `req.user.role` inside route handlers for conditional logic
5. Use meaningful error messages

### ❌ DON'T:
1. Forget to include `protect` before `authorize`
2. Check `adminOnly` directly in route handlers
3. Trust frontend-sent role information
4. Use multiple role checkers in sequence

## Implementation Checklist

- [x] JWT includes role in token
- [x] Auth middleware verifies tokens and extracts role
- [x] Role authorization middleware checks permissions
- [x] Admin routes protected with authorize('admin')
- [x] Error responses clear and informative
- [x] Exports clean and well-named

## Socket.IO Authentication

Socket connections also verify JWT tokens:

```javascript
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token || token === 'undefined') {
      return next(new Error('Not authenticated'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;  // Socket user has role too
    next();
  } catch (err) {
    next(new Error('Not authenticated'));
  }
});

// Use role in socket events
socket.on('admin_action', (data) => {
  if (socket.user.role !== 'admin') {
    return socket.emit('error', 'Admin only');
  }
  // Process admin action
});
```

## Next Steps

1. Update remaining routes to use `protect, authorize('admin')`
2. Replace `adminOnly` middleware usage with `authorize('admin')`
3. Test all protected endpoints with valid/invalid tokens
4. Verify role checks work correctly
