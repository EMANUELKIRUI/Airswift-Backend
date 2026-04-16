# Authentication & Socket Connection Fix Guide

## Issues Fixed

### 1. **Socket Connection Error: "Not authenticated"**
   - **Root Cause**: Socket tries to connect before login, no token in localStorage
   - **Fix**: Defer socket connection until after successful login

### 2. **API Endpoints Returning 401 Unauthorized**
   - **Root Cause**: Token not being sent in Authorization header for subsequent requests
   - **Fix**: Ensure axios interceptor is properly adding Bearer token to all requests

### 3. **Token Storage & Retrieval Issues**
   - **Root Cause**: Token might not be properly stored or accessed
   - **Fix**: Consistently retrieve token from localStorage and set in headers

---

## Implementation Steps

### Step 1: Update `api.js` (Axios Configuration)

```javascript
// ✅ REQUEST INTERCEPTOR: Add Authorization header with Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  console.log('📤 API REQUEST INTERCEPTOR:');
  console.log('   URL:', config.url);
  console.log('   Method:', config.method?.toUpperCase());
  console.log('   Token in localStorage:', token ? '✓ EXISTS' : '✗ MISSING');

  // ✅ FIX: Add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('   ✅ Authorization header set: Bearer [token]');
  } else {
    console.warn('   ⚠️ No token found - request may fail with 401');
  }

  return config;
});
```

**What It Does**:
- Checks if token exists in localStorage
- Adds `Authorization: Bearer {token}` header to all API requests
- Logs detailed information for debugging

---

### Step 2: Update `socket.js` (Client-Side Socket Configuration)

```javascript
// Create authenticated socket connection
const createSocket = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('⚠️ No token found for Socket.IO connection - socket will be created after login');
    return null;
  }

  // ... rest of socket setup
};

// Export functions for reconnection after login
export const reconnectSocketConnection = reconnectSocket;
```

**What It Does**:
- Returns `null` if no token (prevents "Not authenticated" error on app load)
- Provides `reconnectSocketConnection()` function to reconnect after login
- Automatically reconnects if token is refreshed

---

### Step 3: Update Login Component (`frontend-login.jsx`)

```javascript
import { reconnectSocketConnection } from './socket';

const handleLogin = async (e) => {
  // ... login code ...

  // 🔥 CRITICAL: Store token after successful login
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));

    console.log('✅ Token stored successfully');

    // 🔥 NEW: Reconnect socket with new token
    console.log('🔌 Reconnecting socket with token...');
    const socket = reconnectSocketConnection();
    if (socket) {
      console.log('✅ Socket reconnected:', socket.id);
    }

    // Redirect to dashboard
    window.location.href = '/dashboard';
  }
};
```

**What It Does**:
- Stores token in localStorage after successful login
- Calls `reconnectSocketConnection()` to establish socket connection
- Verifies socket connection before redirecting

---

### Step 4: Update Logout Functionality

```javascript
const handleLogout = () => {
  // Clear token and user data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminToken');

  // Disconnect socket
  import('./socket').then(({ disconnectSocketConnection }) => {
    disconnectSocketConnection();
  });

  // Redirect to login
  window.location.href = '/login';
};
```

---

## Backend Configuration

### Socket.IO Middleware (Already Configured in `server.js`)

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("Not authenticated"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Not authenticated"));
  }
});
```

**Status**: ✅ Already implemented in server.js

### API Auth Middleware (Already Configured in `backend/middleware/auth.js`)

```javascript
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

**Status**: ✅ Already implemented

---

## Debugging Checklist

### 1. Verify Token Storage
```javascript
// Run in browser console after login
localStorage.getItem('token'); // Should return JWT token, not null
```

### 2. Verify Token in API Requests
```javascript
// Run in browser console
// Look at Network tab → Select any API request
// Headers tab → Authorization header should show: Bearer [token]
```

### 3. Check Socket Connection
```javascript
// Run in browser console
// Should see: "✅ Socket.IO connected: {socketId}"
// Not: "❌ Socket.IO connection error: Not authenticated"
```

### 4. Verify API Interceptor Logs
```javascript
// Open browser console and make an API request
// Should log: "📤 API REQUEST INTERCEPTOR"
// Should show: "Token in localStorage: ✓ EXISTS"
```

---

## Common Issues & Solutions

### Issue 1: "Socket connection error: Not authenticated"
**Solution**:
- Ensure login completes before socket connects
- Check token is in localStorage
- Call `reconnectSocketConnection()` after login

### Issue 2: "401 Unauthorized on API requests"
**Cause**: Token not sent in header
**Solution**:
- Check `api.js` interceptor is properly adding Authorization header
- Verify token exists in localStorage
- Look at Network tab → API request headers

### Issue 3: "Token exists but still getting 401"
**Solution**:
- Clear localStorage and login again: `localStorage.clear()`
- Check if token is expired: `console.log(localStorage.getItem('token'))`
- Verify backend routes are protected with `verifyToken` middleware

### Issue 4: Socket connects but immediately disconnects
**Solution**:
- Check if token is valid/not expired
- Verify backend JWT_SECRET matches frontend
- Check browser console for connection errors

---

## Files Modified

1. ✅ `/socket.js` - Deferred socket connection, added reconnect functions
2. ✅ `/api.js` - Enhanced logging, ensured Authorization header
3. ✅ `/frontend-login.jsx` - Added socket reconnection after login
4. ✅ Backend already configured correctly

---

## Testing Steps

### Test 1: Fresh Login
```bash
1. Clear localStorage: localStorage.clear()
2. Navigate to login page
3. Check console for "⚠️ No token found for Socket.IO connection"
4. Login with valid credentials
5. Verify console shows:
   - "✅ Token stored successfully"
   - "🔌 Reconnecting socket with token..."
   - "✅ Socket reconnected: [socketId]"
```

### Test 2: API Requests After Login
```bash
1. After login, navigate to a page that makes API calls
2. Open Network tab and check an API request
3. Headers should show: Authorization: Bearer [token]
4. Response should be 200, not 401
```

### Test 3: Multiple API Calls
```bash
1. Make multiple API calls (profile, drafts, applications, etc.)
2. All should return 200/201
3. None should return 401
```

---

## Environment Variables Required

```env
# Frontend
NEXT_PUBLIC_API_URL=https://airswift-backend-fjt3.onrender.com
REACT_APP_API_URL=https://airswift-backend-fjt3.onrender.com

# Backend
JWT_SECRET=your-secret-key
FRONTEND_URL=https://airswift-frontend.vercel.app
```

---

## Summary

The fixes ensure:
1. ✅ Token is stored after login
2. ✅ Token is included in all API requests
3. ✅ Socket connects AFTER login with valid token
4. ✅ Socket reconnects if token is refreshed
5. ✅ Proper error handling and logging for debugging
