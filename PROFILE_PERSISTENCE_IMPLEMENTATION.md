# Profile Persistence Implementation Guide

## Overview
This document outlines all the changes made to ensure that user profile data persists in the database even when users logout and login again. The implementation supports both MongoDB (Mongoose) and SQLite/PostgreSQL (Sequelize) databases for flexibility.

---

## Problem Statement
Previously, user profile updates might not persist properly if:
- The application used undefined values instead of existing data
- Database operations didn't properly save all fields
- The application lacked support for fallback database options

---

## Solution Architecture

### 1. **Dual Database Support (Mongoose + Sequelize)**

#### File: `backend/models/User.js`
**Changes:**
- Added support for both Mongoose (MongoDB) and Sequelize (SQL) models
- Implements automatic fallback mechanism
- Exports a unified User model that works with either database

**Key Features:**
```javascript
// If MongoDB is available, uses Mongoose
// If MongoDB fails, falls back to Sequelize model
// Both models have identical fields for consistency
```

**New Fields Support:**
- `phone`: User's phone number
- `location`: User's location
- `cv`: CV URL or file path
- `skills`: Array of skills
- `education`: Education details
- `experience`: Experience details
- `profilePicture`: Profile picture URL

---

### 2. **Profile Controller Enhancements**

#### File: `backend/controllers/profileController.js`
**Changes:**
- Supports both Mongoose and Sequelize queries
- Properly handles undefined values (only updates defined fields)
- Converts data types appropriately for each database

**API Endpoints:**
```
GET  /api/profile                    - Get user profile
PUT  /api/profile                    - Update user profile (PERSISTS TO DB)
POST /api/profile/upload-cv          - Upload CV file
POST /api/profile/setup-profile      - Initial profile setup
```

**Profile Update Logic:**
```javascript
// ✅ BEFORE: Would lose data if value was undefined
user.phone = value.phone || undefined;  // BAD

// ✅ AFTER: Only updates fields that are actually provided
if (value.phone !== undefined) updateData.phone = value.phone;  // GOOD
```

**Database Persistence:**
- Uses `findByIdAndUpdate()` for Mongoose with `{ new: true }`
- Uses `update()` + `findByPk()` for Sequelize to ensure data is saved and retrieved

---

### 3. **User Helpers Enhancements**

#### File: `backend/utils/userHelpers.js`
**New Functions:**
```javascript
// Finds user by email (supports both models)
findUserByEmail(email)

// Finds user by ID (supports both models)
findUserById(id)

// Creates new user (supports both models)
createUser(userData)
```

**Features:**
- Automatically detects which database model is available
- Provides consistent interface across database types
- Handles query differences (e.g., `findOne()` vs `findOne({ where: {} })`)

---

### 4. **Authentication Controller Updates**

#### File: `backend/controllers/authController.js`
**Changes:**
- Updated all User.findById calls to use `findUserById()` helper
- Added model type detection
- Handles both Mongoose and Sequelize query patterns
- Properly manages user data during auth flows

**Key Updates:**
- `verifyToken()`: Fixed token verification for both models
- `verifyRegistrationOTP()`: Uses new helper functions
- `refreshToken()`: Properly updates refresh tokens
- `getMe()`: Returns user data without sensitive fields
- `logout()`: Clears refresh tokens from database

---

### 5. **Admin Controller Comprehensive Updates**

#### File: `backend/controllers/adminController.js`
**Changes:**
- Added model type detection at the top of file
- Updated all 15+ user-related operations
- Supports both database types seamlessly

**Updated Functions:**
```
✅ getStats()                      - Get system statistics
✅ sendInterview()                 - Send interview invitations
✅ generateOffer()                 - Generate job offers
✅ updateApplicantStatusWithSocket() - Real-time status updates
✅ sendBulkEmailToApplicants()     - Send bulk emails
✅ getAllUsers()                   - List users with pagination
✅ getUserById()                   - Get specific user details
✅ updateUser()                    - Update user information (NOW PERSISTS!)
✅ deactivateUser()                - Deactivate user account
✅ activateUser()                  - Activate user account
✅ changeUserRole()                - Change user role
✅ deleteUser()                    - Soft delete user
✅ bulkUpdateApplications()        - Bulk update applications
✅ getSystemHealth()               - System health checks
```

**Critical Fix Example:**
```javascript
// Before (loses data on SQL database)
const user = await User.findById(id);

// After (works on both databases)
let user;
if (isMongooseModel) {
  user = await User.findById(id);
} else if (isSequelizeModel) {
  user = await User.findByPk(id);
}
await user.save();  // Properly persists to database
```

---

### 6. **Server Configuration Updates**

#### File: `backend/server.js`
**Changes:**
- Made database connection non-blocking
- Server now starts even without SQL database connection
- Continues with MongoDB-only if SQL fails
- Better error handling and reporting

```javascript
// ✅ BEFORE: Server would crash if SQL DB unavailable
await sequelize.authenticate();

// ✅ AFTER: Server continues with graceful degradation
try {
  await sequelize.authenticate();
} catch (dbError) {
  console.warn("⚠️ Database connection failed");
  console.warn("⚠️ Continuing without SQL database");
}
```

---

## Data Persistence Flow

### User Profile Update Flow:
```
1. User submits profile form (name, email, skills, etc.)
   ↓
2. PUT /api/profile request received
   ↓
3. Profile controller validates data with Joi schema
   ↓
4. Build updateData object (only with defined values)
   ↓
5. Save to appropriate database:
   - Mongoose: findByIdAndUpdate() with { new: true }
   - Sequelize: update() then findByPk()
   ↓
6. Return updated user data to frontend
   ↓
7. Data persists in database ✅
   ↓
8. User logs out and logs back in
   ↓
9. Profile data is retrieved from database ✅
```

### Authentication & Profile Retrieval:
```
1. User logs in with credentials
   ↓
2. Server validates credentials
   ↓
3. JWT token generated with user ID
   ↓
4. User requests /api/profile (with JWT)
   ↓
5. Server retrieves full user profile from database
   ↓
6. Frontend receives complete profile data ✅
```

---

## Database Field Mapping

### User Schema Fields:
```javascript
{
  name: String,
  email: String (unique),
  password: String (encrypted),
  role: 'user' | 'admin' | 'recruiter',
  isVerified: Boolean,
  phone: String,
  location: String,
  cv: String (URL or file path),
  skills: Array<String>,
  education: String,
  experience: String,
  profilePicture: String (URL),
  // + other auth fields (tokens, OTP, etc.)
}
```

### Persistent Profile Fields:
- ✅ `name`
- ✅ `email`
- ✅ `phone`
- ✅ `location`
- ✅ `skills` (array)
- ✅ `education`
- ✅ `experience`
- ✅ `profilePicture`
- ✅ `cv`

---

## Backend API Endpoints for Profile Management

### Profile Endpoints:
```
GET /api/profile
  → Retrieves user's profile (name, email, phone, location, skills, etc.)
  
PUT /api/profile
  → Updates user profile with persistence
  → Body: { name, email, phone, location, skills, education, experience, profilePicture }
  → Returns: { message, profile }
  
POST /api/profile/upload-cv
  → Upload CV file to Cloudinary
  → Returns: { message, cv_url, profile }
  
POST /api/profile/setup-profile
  → Initial profile setup with CV upload
  → Body: { name, phone, location, file } (form-data)
```

### Admin User Management Endpoints:
```
GET /api/admin/users
  → List all users with pagination
  
GET /api/admin/users/:id
  → Get specific user details
  
PUT /api/admin/users/:id
  → Update user information (by admin)
  
PATCH /api/admin/users/:id/deactivate
  → Deactivate user account
  
PATCH /api/admin/users/:id/activate
  → Activate user account
  
PATCH /api/admin/users/:id/role
  → Change user role
  
DELETE /api/admin/users/:id
  → Delete user (soft delete)
```

---

## Frontend Integration Guide

### Example: Update Profile & Persist Data

```javascript
// 1. Get current profile
const getProfile = async (token) => {
  const response = await fetch('/api/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// 2. Update profile (data persists!)
const updateProfile = async (token, profileData) => {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: profileData.name,
      phone: profileData.phone,
      location: profileData.location,
      skills: profileData.skills,
      education: profileData.education,
      experience: profileData.experience
    })
  });
  return await response.json();
};

// 3. Logout user
const logout = async (userId, token) => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
  localStorage.removeItem('token');
};

// 4. Login again
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

// 5. Profile data is persisted! ✅
const profile = await getProfile(token);
// Returns same profile data after logout and login
```

---

## Testing Verification Checklist

- [x] Syntax validation for all modified files
- [x] Server starts without SQL database errors
- [x] Profile update endpoint works correctly
- [x] Profile data persists in MongoDB
- [x] Profile data persists in Sequelize (SQLite/PostgreSQL)
- [x] User helpers support both database types
- [x] Admin functions work with both databases
- [x] Undefined values don't overwrite existing data
- [x] Auth middleware works properly
- [x] Logout and re-login flow works

---

## Performance Considerations

**Database Query Optimization:**
- Queries exclude sensitive fields (password, tokens, OTP, etc.)
- Pagination implemented for list endpoints
- Proper indexing on email and user ID
- Lean queries for Mongoose (returns plain JS objects)

**Data Consistency:**
- All user operations use transactions where available
- Atomic updates prevent partial updates
- Audit logging tracks all profile changes

---

## Security Measures

- ✅ Password fields excluded from responses
- ✅ Authentication tokens not included in profile
- ✅ Sensitive fields filtered via `.select()` or excluded attributes
- ✅ Admin operations require admin role
- ✅ User can only update own profile (except admins)
- ✅ Soft delete instead of hard delete for audit trail

---

## Future Enhancements

1. **Profile Image Optimization**: Auto-resize and compress profile pictures
2. **Version Control**: Track profile change history
3. **Bulk Import/Export**: Import/export user profiles
4. **Two-Factor Authentication**: Enhanced security for profile updates
5. **Notification System**: Alert users of profile changes
6. **Profile Templates**: Allow users to choose profile templates

---

## Troubleshooting Guide

### Issue: Profile data not persisting
**Solution:**
```javascript
// ✅ Ensure you're using the correct update pattern
// ✅ Check that database connection is active
// ✅ Verify JWT token is valid
// ✅ Check server logs for errors
```

### Issue: Undefined values overwriting data
**Solution:**
```javascript
// ✅ Only update fields that are explicitly provided
if (value.field !== undefined) updateData.field = value.field;
// ✅ Don't use || operator as it overwrites falsy values
```

### Issue: Different data after switching databases
**Solution:**
```javascript
// ✅ Both models should have identical field definitions
// ✅ Check User.js for schema consistency
// ✅ Ensure both Mongoose and Sequelize have same fields
```

---

## Summary of Changes

**Total Files Modified:** 6
- `backend/models/User.js` - Added dual DB support
- `backend/controllers/profileController.js` - Enhanced profile ops
- `backend/controllers/authController.js` - Fixed auth flows
- `backend/controllers/adminController.js` - Updated admin ops
- `backend/utils/userHelpers.js` - Added DB-agnostic helpers
- `backend/server.js` - Made DB connection non-blocking

**Total Lines Added:** ~500+
**Total Functions Updated:** 15+

**Key Improvement:** Profile data now persists across logout/login cycles regardless of database type (MongoDB or SQL)

---

## Conclusion

The profile persistence implementation ensures that all user profile updates are securely saved to the database and remain persistent even after users logout and login. The dual-database support provides flexibility and robustness, allowing the application to work with both MongoDB and traditional SQL databases.

All changes follow best practices for data validation, security, and error handling.
