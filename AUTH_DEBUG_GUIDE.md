# 🔐 Authentication & Token Debugging Guide

## Overview
This guide documents the auth fixes and debugging procedures for token/authentication issues in the Airswift backend.

---

## ✅ Fixes Applied

### FIX 1: Enhanced Auth Middleware with Debugging
**Files Modified:**
- `backend/middleware/auth.js`
- `backend/middleware/authMiddleware.js`

**What was added:**
- Detailed console logging for token extraction and verification
- Error details in responses (not just generic messages)
- Validation checks to prevent server crashes

**Benefits:**
- ✅ Easy identification of missing tokens
- ✅ Debug logs show token source (cookies vs Authorization header)
- ✅ Clear error messages for frontend debugging

---

### FIX 2: Authorization Header Support (Bearer Token)
**Files Modified:**
- `backend/middleware/auth.js`
- `backend/middleware/authMiddleware.js`

**What was added:**
```javascript
// Try cookies first (preferred)
let token = req.cookies?.accessToken || null;

// Fallback to Authorization header (Bearer token)
if (!token) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
}
```

**Benefits:**
- ✅ Middleware now accepts both authentication methods
- ✅ Frontend can use either method
- ✅ Better compatibility with different client types

**Frontend Usage:**
```javascript
// Option 1: Use Authorization header (recommended for SPAs)
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Option 2: Use cookies (automatic with credentials)
axiosInstance.defaults.withCredentials = true;
```

---

### FIX 3: Req.User Validation in Protected Routes
**Files Modified:**
- `backend/routes/jobSearch.js` (recommendations endpoint)
- `backend/routes/jobs.js` (recommendations endpoint)

**What was added:**
```javascript
// ✅ FIX 5: Validate req.user exists before accessing properties
if (!req.user || !req.user.id) {
  console.error("❌ RECOMMENDATIONS FAILED: req.user is missing or has no id");
  return res.status(401).json({ 
    error: "Unauthorized",
    message: "User authentication required"
  });
}
```

**Benefits:**
- ✅ Prevents "Cannot read property 'id' of undefined" crashes
- ✅ Graceful error responses instead of 500 errors
- ✅ Clear error messages for debugging

---

### FIX 4: Proper Error Handling in Middleware
**Files Modified:**
- `backend/middleware/auth.js`
- `backend/middleware/authMiddleware.js`

**What was added:**
- Try-catch blocks around all critical operations
- Specific error codes (NO_TOKEN, INVALID_TOKEN, NO_USER, NO_ROLE)
- Detailed console logging for each step

**Error Codes:**
| Code | Meaning | Action |
|------|---------|--------|
| `NO_TOKEN` | Token not found in cookies or headers | Check localStorage/sessionStorage |
| `INVALID_TOKEN` | Token exists but failed verification | Re-login to get fresh token |
| `NO_USER` | req.user object is missing | Check middleware execution |
| `NO_ROLE` | User has no role assigned | Update user record in database |
| `INSUFFICIENT_ROLE` | User role doesn't match endpoint requirements | Check user permissions |

---

## 🔍 Debugging Procedures

### STEP 1: Check Backend Logs
When authentication fails, check the backend console for these debug messages:

```bash
# If token is missing:
⚠️ UNAUTHORIZED: No token found (cookies or Authorization header)

# If token is invalid:
⚠️ TOKEN VERIFICATION FAILED: jwt malformed / jwt expired

# If user object is missing:
❌ AUTHORIZATION FAILED: req.user is missing
```

---

### STEP 2: Verify Login Response
**Backend sends this on successful login:**
```javascript
res.status(200).json({
  success: true,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    has_submitted: user.has_submitted || false,
  },
  token: accessToken,  // ✅ THIS MUST EXIST
  has_submitted: user.has_submitted || false,
  redirect_to: (user.has_submitted || false) ? '/dashboard' : '/application-form'
});
```

**Frontend verification:**
```javascript
// In login response handler
if (!response.data.token) {
  console.error("❌ CRITICAL: Backend login didn't return token!");
  console.log("Response structure:", response.data);
}
```

---

### STEP 3: Frontend Token Storage Check

**Add this debugging code to your frontend:**

```javascript
// After login
const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    
    console.log("✅ LOGIN RESPONSE:", response.data);
    console.log("✅ TOKEN from response:", response.data.token);
    
    // Store token
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      console.log("✅ TOKEN SAVED to localStorage");
      console.log("TOKEN value:", localStorage.getItem('token'));
    } else {
      console.error("❌ CRITICAL: response.data.token is undefined!");
    }
    
    return response.data;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
  }
};

// Before API request
const verifyToken = () => {
  const token = localStorage.getItem('token');
  console.log("TOKEN in localStorage:", token);
  
  if (!token) {
    console.error("❌ NO TOKEN: localStorage.getItem('token') returned null");
    // Redirect to login
  }
  
  return token;
};
```

---

### STEP 4: Verify Axios Request Headers

**Add this debugging to axios configuration:**

```javascript
// Setup axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // For cookies
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    console.log("═══════ API REQUEST ═══════");
    console.log("URL:", config.url);
    console.log("TOKEN from storage:", token ? "EXISTS ✓" : "MISSING ✗");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Authorization header set:", "Bearer [token]");
    }
    
    console.log("Request headers:", config.headers);
    console.log("Cookies enabled (withCredentials):", config.withCredentials);
    console.log("═══════════════════════════");
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log("✅ REQUEST SUCCESS:", response.status, response.data);
    return response;
  },
  (error) => {
    console.error("❌ REQUEST FAILED:", {
      status: error.response?.status,
      error: error.response?.data?.error,
      message: error.response?.data?.message,
      headers: error.config?.headers,
    });
    
    if (error.response?.status === 401) {
      console.warn("⚠️ UNAUTHORIZED - Token may be invalid or expired");
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

### STEP 5: Backend Request Logger

**Check what the backend receives:**

The enhanced middleware now logs this for every request:

```
👉 TOKEN from cookies: EXISTS
👉 AUTH TOKEN CHECK: ✓ EXISTS
✓ User authenticated: 64a2f3b8c9d1e2f3g4h5i6j7
```

**If you see:**
```
👉 TOKEN from cookies: MISSING
👉 TOKEN from Authorization header: MISSING
👉 AUTH TOKEN CHECK: ✗ MISSING
```

Then the frontend is **not sending the token** even though it might be stored.

---

## 🚨 Common Issues & Solutions

### Issue 1: "Not authenticated" error on ALL requests
**Symptoms:**
- All protected endpoints return 401
- Login works fine
- Token is being saved to localStorage

**Debug Steps:**
1. Check backend logs for: `⚠️ UNAUTHORIZED: No token found`
2. Verify axios config has `Authorization: Bearer [token]`
3. Check browser DevTools → Network → Request Headers
4. Look for `Authorization` header in the request

**Solution:**
```javascript
// Make sure this runs AFTER login
const token = localStorage.getItem('token');
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

---

### Issue 2: Token is undefined on frontend
**Symptoms:**
- `localStorage.getItem('token')` returns `null`
- Login succeeded but no token was stored

**Debug Steps:**
1. Check backend login response: `console.log(response.data.token)`
2. Verify response contains `token` field
3. Check if login is actually returning token or just user data

**Solution:**
Backend login endpoint MUST return:
```javascript
res.json({
  token: accessToken,  // ✅ THIS IS REQUIRED
  user: userData
});
```

---

### Issue 3: "Invalid token" error
**Symptoms:**
- Token is being sent
- All requests return 401 with "Invalid token"
- Token works sometimes, fails sometimes

**Debug Steps:**
1. Check if JWT_SECRET is the same in .env
2. Verify token isn't expired (check jwt.io decode)
3. Check backend logs for: `⚠️ TOKEN VERIFICATION FAILED`

**Solution:**
```bash
# Verify environment variable
echo $JWT_SECRET

# Re-login to get fresh token (old ones may be expired)
# Check token expiration
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN_HERE'))"
```

---

### Issue 4: Server crashes with "Cannot read property 'id' of undefined"
**Symptoms:**
- Protected endpoints return 500 instead of 401
- Backend console shows: `TypeError: Cannot read property 'id' of undefined`

**Debug Steps:**
1. Check if middleware is applied to route
2. Verify `verifyToken` middleware is before route handler
3. Check if route handler validates `req.user`

**Solution:**
Routes now have this check:
```javascript
if (!req.user || !req.user.id) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

---

## 📋 Checklist for Backend Testing

- [ ] Login returns `{ token, user }` object
- [ ] Token is valid JWT that can be decoded
- [ ] Middleware accepts cookies (`req.cookies.accessToken`)
- [ ] Middleware accepts Authorization header (`Bearer token`)
- [ ] Middleware logs: `👉 AUTH TOKEN CHECK: ✓ EXISTS`
- [ ] Protected routes validate `req.user` exists
- [ ] All error responses include error codes (NO_TOKEN, INVALID_TOKEN, etc.)
- [ ] No unhandled errors crash the server
- [ ] Middleware runs try-catch to prevent crashes

---

## 📋 Checklist for Frontend Testing

- [ ] Login stores token: `localStorage.setItem('token', response.data.token)`
- [ ] Token retrieved correctly: `localStorage.getItem('token')` returns non-null
- [ ] Axios included Authorization header: `Authorization: Bearer [token]`
- [ ] Axios configured: `withCredentials: true`
- [ ] Protected routes check token before API calls
- [ ] Token refreshed on 401 response (optional)
- [ ] Logged out properly: `localStorage.removeItem('token')`
- [ ] Console logs show token steps (debug mode)

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `backend/middleware/auth.js` | Primary auth middleware (enhanced) |
| `backend/middleware/authMiddleware.js` | Alternative auth middleware (enhanced) |
| `backend/controllers/authController.js` | Login response returns `token + user` |
| `backend/routes/auth.js` | Auth endpoints |
| `backend/routes/jobSearch.js` | Protected route with req.user validation |
| `backend/routes/jobs.js` | Protected route with req.user validation |

---

## 🆘 Emergency Debugging

If all else fails, use this hardcore debugging approach:

**Backend (server.js or main route):**
```javascript
app.use((req, res, next) => {
  console.log("═══ REQUEST DEBUG ═══");
  console.log("Path:", req.path);
  console.log("Method:", req.method);
  console.log("Cookies:", req.cookies);
  console.log("Authorization Header:", req.headers.authorization?.substring(0, 50) + "...");
  console.log("User object:", req.user ? `✓ Exists: ${req.user.id}` : "✗ Missing");
  console.log("═══════════════════");
  next();
});
```

**Frontend (before API call):**
```javascript
console.log("API CALL DEBUG:");
console.log("Token:", localStorage.getItem('token') ? "EXISTS" : "MISSING");
console.log("Axios default headers:", api.defaults.headers);
console.log("Request config:", { 
  url, 
  headers: api.defaults.headers 
});
```

Then check backend AND browser console simultaneously to trace the token flow.

---

## 📞 Support

If you encounter issues:

1. **Check the logs** - Backend and frontend console
2. **Run the checklists** above
3. **Trace token flow:**
   - Frontend: Is token stored?
   - Frontend: Is token sent in headers?
   - Backend: Does middleware receive token?
   - Backend: Can middleware verify token?
   - Backend: Is req.user set correctly?
4. **Use the emergency debugging** section
5. **Check error codes** in the error handling table

---

**Last Updated:** April 10, 2026
**Status:** ✅ All fixes applied and tested
