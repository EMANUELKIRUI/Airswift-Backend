# ✅ BACKEND AUTHORIZATION HEADER CONFIRMATION

## Expected Format

Your backend **REQUIRES** this exact header format:

```
Authorization: Bearer <token>
```

### Breakdown:
- **Header Name**: `Authorization` (case-insensitive, but standard is capital A and Z)
- **Prefix**: `Bearer ` (exactly, with capital B and space after)
- **Token**: Your JWT token from login

### Examples:

✅ **CORRECT**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl...
```

❌ **WRONG** (missing Bearer):
```
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl...
```

❌ **WRONG** (using Basic instead):
```
Authorization: Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl...
```

❌ **WRONG** (no space after Bearer):
```
Authorization: BearereyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl...
```

---

## What Backend Checks

When a request comes in with the Authorization header, the backend middleware does this:

```javascript
const authHeader = req.headers.authorization;

console.log('Auth header:', authHeader);  // NEW DEBUG LOG

// Step 1: Header exists?
if (!authHeader) {
  return 401 "No token provided"
}

// Step 2: Starts with "Bearer "?
if (!authHeader.startsWith('Bearer ')) {
  return 401 "Invalid authorization format"
}

// Step 3: Extract token after "Bearer "
const token = authHeader.split(' ')[1];

// Step 4: Token has value?
if (!token) {
  return 401 "Token is empty"
}

// Step 5: Token signature valid?
jwt.verify(token, process.env.JWT_SECRET);
// If fails: return 401 "Invalid token"
// If passes: req.user = decoded, continue
```

---

## Debug Output

With the new logging, when requests come in you'll see:

### ✅ Valid Request:
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJp...
   Authorization header exists: true
   📝 Verifying JWT token...
   ✅ Token verified. User ID: 69d2edd540e4a82ed3e6e1cc
```

### ❌ Missing Token:
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: undefined
   Authorization header exists: false
   ❌ Missing Authorization header
```

### ❌ Wrong Format:
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Basic xyz123
   Authorization header exists: true
   ❌ Missing Bearer prefix. Format should be: "Bearer [token]"
   Received: Basic xyz123
```

---

## Frontend Implementation

Your frontend axios interceptor must add this header to every request:

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

This automatically adds: `Authorization: Bearer [token]`

---

## Socket.IO Exception

⚠️ **Socket.IO does NOT use the Authorization header format!**

For socket connections, pass the raw token:

```javascript
const socket = io(URL, {
  auth: {
    token: localStorage.getItem('token')  // Raw token, no "Bearer " prefix
  }
});
```

Backend socket middleware extracts and verifies the raw token directly.

---

## Verification

To test if backend receives the header correctly:

```bash
# Get a valid token first
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make request with correct header
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"

# Server logs should show:
# Auth header: Bearer eyJhbGciOiJ...
# Authorization header exists: true
# ✅ Token verified.
```

---

## Summary

✅ **Backend format**: `Authorization: Bearer [token]`
✅ **Backend checks**: Header → Bearer prefix → Token value → JWT signature
✅ **Debug logging**: Added to show exactly what's received
✅ **Frontend must**: Add this header to every API request
⚠️ **Socket exception**: Use raw token in `auth.token`, no Bearer prefix

Backend is configured and ready to receive tokens! 🎉
