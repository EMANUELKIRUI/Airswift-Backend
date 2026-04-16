# 🔍 DEBUG LOG EXAMPLES - What You'll See

## ✅ SUCCESSFUL REQUEST

### Frontend Action
```javascript
// After login
const token = localStorage.getItem('token'); 
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl..."

// Make API request with interceptor
const response = await api.get('/profile');
// Interceptor adds: Authorization: Bearer eyJhbGc...
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJlZGQ1NDBlNGE4MmVkM2U2ZTFjYyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2MzMzNzI4LCJleHAiOjE3NzY0MjAxMjh9.RMphyUf8X-iEigSiq_0tFvHzgv8Z9E0MpdoAZA_gKys
   Authorization header exists: true
   📝 Verifying JWT token...
   ✅ Token verified. User ID: 69d2edd540e4a82ed3e6e1cc
```

### Frontend Response
```javascript
// Status: 200 OK
{
  message: "Protected data",
  user: {
    id: "69d2edd540e4a82ed3e6e1cc",
    name: "John Doe",
    email: "john@example.com"
  }
}
```

---

## ❌ ERROR 1: NO TOKEN AT ALL

### Frontend Action
```javascript
// After login, token is in localStorage (✅ correct)
// But API interceptor is not running or broken

// Make API request WITHOUT adding Authorization header
const response = await fetch('/api/profile');
// ❌ Interceptor didn't add Authorization header!
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: undefined
   Authorization header exists: false
   ❌ Missing Authorization header
```

### Response
```
Status: 401 Unauthorized
{
  message: "No token provided",
  error: "MISSING_AUTH_HEADER"
}
```

### Frontend Console Error
```
AxiosError: Request failed with status code 401
```

### Fix
```javascript
// Ensure api.js has:
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## ❌ ERROR 2: WRONG FORMAT (Basic instead of Bearer)

### Frontend Action
```javascript
// Accidentally using Basic auth format or wrong prefix
config.headers.Authorization = `Basic ${token}`;
// ❌ Should be: Bearer, not Basic!
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZDJl...
   Authorization header exists: true
   ❌ Missing Bearer prefix. Format should be: "Bearer [token]"
   Received: Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
```
Status: 401 Unauthorized
{
  message: "Invalid authorization format. Expected: Bearer [token]",
  error: "INVALID_AUTH_FORMAT"
}
```

### Fix
```javascript
// ❌ Wrong
Authorization: `Basic ${token}`

// ✅ Correct
Authorization: `Bearer ${token}`
```

---

## ❌ ERROR 3: NO SPACE AFTER BEARER

### Frontend Action
```javascript
// Missing space after Bearer
config.headers.Authorization = `Bearer${token}`;
// ❌ Should have space: Bearer [space] [token]
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: BearereyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Authorization header exists: true
   ❌ Missing Bearer prefix. Format should be: "Bearer [token]"
   Received: BearereyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
```
Status: 401 Unauthorized
{
  message: "Invalid authorization format. Expected: Bearer [token]",
  error: "INVALID_AUTH_FORMAT"
}
```

### Fix
```javascript
// ❌ Wrong (no space)
Authorization: `Bearer${token}`

// ✅ Correct (with space)
Authorization: `Bearer ${token}`
```

---

## ❌ ERROR 4: EMPTY TOKEN

### Frontend Action
```javascript
// Token exists but is empty string
localStorage.setItem('token', '');

// Make API request
api.get('/profile');
// Adds: Authorization: Bearer  (nothing after space)
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer 
   Authorization header exists: true
   ❌ Token is empty after Bearer prefix
```

### Response
```
Status: 401 Unauthorized
{
  message: "Token is empty",
  error: "EMPTY_TOKEN"
}
```

### Fix
```javascript
// ✅ Only add header if token has value
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

---

## ❌ ERROR 5: INVALID TOKEN (Corrupted)

### Frontend Action
```javascript
// Token was modified or corrupted somehow
localStorage.setItem('token', 'eyJ.corrupted.xyz');

// Make API request
api.get('/profile');
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJ.corrupted.xyz
   Authorization header exists: true
   📝 Verifying JWT token...
   ❌ Token verification failed: invalid signature
```

### Response
```
Status: 401 Unauthorized
{
  message: "Invalid token",
  error: "INVALID_TOKEN"
}
```

### Fix
```javascript
// Login again to get fresh token
localStorage.removeItem('token');
window.location.href = '/login';
```

---

## ❌ ERROR 6: EXPIRED TOKEN

### Frontend Action
```javascript
// Token is valid but expired (past exp time)
// Could happen if:
// - User logged in 25+ hours ago
// - System clock is wrong
// - Token was issued with short expiry

api.get('/profile');
```

### Server Console Output
```
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Authorization header exists: true
   📝 Verifying JWT token...
   ❌ Token verification failed: jwt expired
```

### Response
```
Status: 401 Unauthorized
{
  message: "Invalid token",
  error: "TOKEN_EXPIRED"
}
```

### Fix
```javascript
// Implement token refresh:
if (error.response?.status === 401 && error.response?.data?.error === 'TOKEN_EXPIRED') {
  // Call refresh endpoint
  const newTokenResponse = await api.post('/auth/refresh');
  localStorage.setItem('token', newTokenResponse.data.token);
  // Retry original request
  return api.request(originalRequest);
}
```

---

## ✅ SCENARIO: SOCKET CONNECTION

### Frontend Action
```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('token');
const socket = io(URL, {
  auth: {
    token: token  // ✅ Raw token, NOT "Bearer [token]"
  }
});
```

### Server Console Output
```
🔌 SOCKET AUTH MIDDLEWARE:
   Client IP: ::1
   Token provided: true
   📝 Verifying socket token...
   ✅ Socket token verified. User ID: 69d2edd540e4a82ed3e6e1cc
```

### Socket Events
```javascript
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});
```

---

## ✅ SCENARIO: MULTIPLE REQUESTS

### Frontend Action
```javascript
// After login with token in localStorage

// Request 1
const profile = await api.get('/profile');

// Request 2
const drafts = await api.get('/drafts/check');

// Request 3
const applications = await api.get('/applications');
```

### Server Console Output
```
Request 1 - GET /profile
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Authorization header exists: true
   ✅ Token verified. User ID: 69d2edd...
✓ 200 OK

Request 2 - GET /drafts/check
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Authorization header exists: true
   ✅ Token verified. User ID: 69d2edd...
✓ 200 OK

Request 3 - GET /applications
🔐 AUTH MIDDLEWARE CHECK:
   Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Authorization header exists: true
   ✅ Token verified. User ID: 69d2edd...
✓ 200 OK
```

### All Three Succeed ✅
```javascript
{
  profile: {...},
  drafts: {...},
  applications: [...]
}
```

---

## 🔍 HOW TO READ THE DEBUG LOGS

### Key Indicators

**✅ SUCCESS Markers**:
- `Auth header: Bearer eyJ...` - Token is being sent
- `Authorization header exists: true` - Header found
- `📝 Verifying JWT token...` - Starting verification
- `✅ Token verified. User ID: ...` - SUCCESS!

**❌ FAILURE Markers**:
- `Auth header: undefined` - No header sent!
- `Authorization header exists: false` - Header missing!
- `❌ Missing Bearer prefix` - Wrong format
- `❌ Token is empty` - No value after Bearer
- `❌ Token verification failed` - Invalid signature or expired

---

## 📊 MONITORING THE LOGS

```bash
# Watch for all auth checks
tail -f server.log | grep "🔐"

# Watch only failures
tail -f server.log | grep "❌"

# Watch token verification
tail -f server.log | grep "Auth header\|Token verified"
```

---

## Summary

When everything works correctly:
1. Frontend logs in ✅
2. Frontend stores token ✅
3. Frontend's interceptor adds header ✅
4. Backend receives: `Authorization: Bearer [valid-token]` ✅
5. Backend verifies signature ✅
6. Backend logs: `✅ Token verified` ✅
7. Request proceeds normally ✅
8. Response returns successfully ✅

When it breaks, check the debug logs to identify exactly where:
- Token storage? → Check localStorage
- Interceptor? → Check if header added
- Format? → Check for "Bearer " prefix
- Token value? → Check if empty or corrupted
- Expiry? → Check token exp time

The debug logs will tell you exactly what's wrong! 🎯
