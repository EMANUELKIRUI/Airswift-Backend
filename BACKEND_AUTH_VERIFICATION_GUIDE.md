# ✅ BACKEND AUTHENTICATION VERIFICATION GUIDE

## Quick Status Check

Your backend authentication is **CORRECTLY CONFIGURED** ✅

- Auth middleware: ✅ Implemented
- Socket authentication: ✅ Implemented 
- Protected routes: ✅ All have middleware applied
- Token verification: ✅ JWT validation in place

---

## Files Modified

### 1. **Auth Middleware** (`/backend/middleware/auth.js`)
**Updated**: Enhanced logging for debugging
- Now logs every auth check
- Shows whether token exists
- Reports token validation errors clearly

**What it does**:
```javascript
✅ Checks Authorization header format: "Bearer [token]"
✅ Extracts token from header
✅ Verifies JWT signature
✅ Sets req.user if token is valid
❌ Returns 401 if any step fails
```

### 2. **Socket Authentication** (`/backend/server.js`)
**Updated**: Added detailed logging for socket connections
- Socket middleware now logs connection details
- Shows token verification status
- Reports connection failures

**What it does**:
```javascript
✅ Extracts token from socket.handshake.auth.token
✅ Verifies JWT signature matches API token
✅ Sets socket.user if token is valid
❌ Rejects connection if token missing/invalid
```

---

## Verification Steps

### Step 1: Verify Auth Middleware Logs

When a frontend makes an authenticated request, server should log:

```
🔐 AUTH MIDDLEWARE CHECK:
   Authorization header exists: true
   📝 Verifying JWT token...
   ✅ Token verified. User ID: 69d2edd540e4a82ed3e6e1cc
```

**Debug commands:**
```bash
# Check if middleware exists
grep -n "AUTH MIDDLEWARE CHECK" backend/middleware/auth.js

# Check if middleware is applied to routes
grep -r "verifyToken\|authMiddleware" backend/routes/
```

### Step 2: Verify Socket Auth Logs

When frontend connects socket, server should log:

```
🔌 SOCKET AUTH MIDDLEWARE:
   Client IP: 127.0.0.1
   Token provided: true
   📝 Verifying socket token...
   ✅ Socket token verified. User ID: 69d2edd540e4a82ed3e6e1cc
```

**Debug commands:**
```bash
# Check socket middleware exists
grep -n "SOCKET AUTH MIDDLEWARE" backend/server.js

# Look for socket connection logs
tail -f server.log | grep "SOCKET"
```

### Step 3: Check Protected Routes

Verify all sensitive endpoints have middleware:

#### User Routes (`/api/*`)
```javascript
✅ GET    /api/profile           → verifyToken
✅ GET    /api/drafts/check      → authMiddleware
✅ GET    /api/users/status      → verifyToken
✅ POST   /api/applications      → authMiddleware
✅ GET    /api/interviews/my     → verifyToken
✅ POST   /api/payments/pay      → verifyToken
```

**Check**:
```bash
# Find all protected routes
grep -r "verifyToken\|authMiddleware" backend/routes/*.js | grep -v "router.get\|router.post" | wc -l

# Should be many matches - every protected route
```

---

## Error Messages Reference

When authentication fails, frontend receives:

| Status | Message | Cause | Solution |
|--------|---------|-------|----------|
| 401 | No token provided | Missing Authorization header | Add `Authorization: Bearer [token]` |
| 401 | Invalid authorization format | Wrong format (not Bearer) | Use format: `Bearer [token]` |
| 401 | Token is empty | Empty string after Bearer | Ensure token value is not empty |
| 401 | Invalid token | JWT verification failed | Token expired or corrupted |
| 401 | Not authenticated | Socket missing token | Pass token in `socket.handshake.auth.token` |

---

## Expected Behavior Flow

### Correct Flow ✅

```
1. Frontend: Call POST /api/auth/login
   ↓
2. Backend: Verify credentials
   ↓
3. Backend: Return token in response
   Response: { token: "eyJ...", user: {...} }
   ↓
4. Frontend: Store token in localStorage
   localStorage.setItem('token', token)
   ↓
5. Frontend: Add to Authorization header on subsequent requests
   Headers: { Authorization: "Bearer eyJ..." }
   ↓
6. Backend: Middleware checks header in this order:
   - Header exists? ✅
   - Starts with "Bearer "? ✅
   - Has value after Bearer? ✅
   - Signature valid? ✅
   ↓
7. Backend: Set req.user and allow request
   ↓
8. Frontend: Request succeeds (200/201)
```

### Broken Flow ❌

```
1. Frontend: Call API WITHOUT Authorization header
   ↓
2. Backend: Auth middleware checks header
   Query: req.headers.authorization
   Result: undefined
   ↓
3. Backend: Reject request with 401
   ↓
4. Frontend: Shows error
   "Failed to fetch profile: AxiosError: Request failed with status code 401"
```

---

## Debugging Checklist

### If frontend gets "401 Unauthorized":

**Check 1: Token exists**
```javascript
// Frontend console:
localStorage.getItem('token'); // Should NOT be null
```

**Check 2: Token format**
```javascript
// Frontend console - should be 3 parts separated by dots:
const token = localStorage.getItem('token');
const parts = token.split('.');
console.log('JWT has', parts.length, 'parts'); // Should be 3
```

**Check 3: Token sent in request**
```
1. Open browser Network tab
2. Make any API call after logging in
3. Select the request
4. Click "Headers" tab
5. Look for: Authorization: Bearer eyJ...
6. Should be present on EVERY authenticated request
```

**Check 4: Server logs**
```bash
# Server should show auth middleware logs:
🔐 AUTH MIDDLEWARE CHECK:
   Authorization header exists: true
   📝 Verifying JWT token...
   ✅ Token verified
```

### If frontend gets "Socket connection error":

**Check 1: Token before socket connection**
```javascript
// Should be in localStorage BEFORE socket connects
localStorage.getItem('token');
```

**Check 2: Socket receives token**
```javascript
// Frontend socket connection code should be:
import io from 'socket.io-client';

const socket = io(URL, {
  auth: {
    token: localStorage.getItem('token') // ✅ Pass raw token
  }
});
```

**Check 3: Server socket logs**
```bash
# Server should show:
🔌 SOCKET AUTH MIDDLEWARE:
   Token provided: true
   ✅ Socket token verified
```

---

## Routes Protected Status

### ✅ Protected Routes (have middleware)

```
Authentication Routes:
  GET  /auth/me             → verifyToken
  GET  /auth/profile        → verifyToken

Draft Routes:
  GET  /drafts              → authMiddleware
  GET  /drafts/check        → authMiddleware ✅
  POST /drafts              → authMiddleware
  POST /drafts/save         → authMiddleware
  DELETE /drafts            → authMiddleware

Application Routes:
  POST /applications        → authMiddleware ✅
  GET  /applications        → authMiddleware ✅
  GET  /applications/my     → verifyToken

User Routes:
  GET  /users/status        → verifyToken ✅
  POST /users/parse-cv      → verifyToken

Payment Routes:
  POST /payment/pay         → verifyToken ✅

Interview Routes:
  POST /interviews          → verifyToken
  GET  /interviews/my       → verifyToken
  
Settings Routes:
  GET  /settings            → verifyToken
  POST /settings            → verifyToken
```

### ✅ Unprotected Routes (public access)

```
Authentication Routes:
  POST /auth/register
  POST /auth/login
  POST /auth/forgot-password
  POST /auth/reset-password

Job Routes:
  GET /jobs
  GET /jobs/:id
  GET /jobs/categories

Public Routes:
  GET /health
  GET /api/auth/status
```

---

## JWT Token Structure

Every valid token contains three parts:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJpZCI6IjY5ZDJlZGQ1NDBl... . RMphyUf8X-iEigSiq_0tFvHzgv8Z9E0MpdoAZA_gKys

^                                        ^                              ^
Header                                   Payload                        Signature
(identifies algorithm)                   (contains user data)           (proves authenticity)
```

**Decode to see payload**:
```javascript
const token = localStorage.getItem('token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log(payload);

// Output:
{
  id: "69d2edd540e4a82ed3e6e1cc",
  role: "user",
  email: "user@example.com",
  iat: 1776333728,
  exp: 1776420128
}
```

**Fields**:
- `id`: User's database ID
- `role`: User role (user, admin, etc.)
- `email`: User's email
- `iat`: Issued at (timestamp)
- `exp`: Expires at (timestamp)

---

## Common Issues & Solutions

### Issue 1: "No token provided"
**Cause**: Frontend not sending Authorization header
**Solution**:
- Check api.js has request interceptor
- Verify interceptor adds `Authorization: Bearer ${token}`
- Ensure token exists in localStorage

### Issue 2: "Invalid authorization format"
**Cause**: Wrong format (e.g., "Basic" instead of "Bearer")
**Solution**:
- Must use format: `Authorization: Bearer [token]`
- Not: `Authorization: [token]`
- Not: `Authorization: Basic [token]`
- Not: `Authorization: Bearer[token]` (missing space)

### Issue 3: "Invalid token"
**Cause**: Token is corrupted, expired, or signed with wrong secret
**Solution**:
- Check token not expired: `payload.exp > Date.now()/1000`
- Verify JWT_SECRET in .env matches on frontend/backend
- Clear localStorage and login again

### Issue 4: "Socket connection error: Not authenticated"
**Cause**: Socket connecting before login or token not in socket.auth
**Solution**:
- Ensure login completes before socket connects
- Frontend must pass token: `io(URL, { auth: { token } })`
- Socket must be created AFTER token is in localStorage

### Issue 5: Socket connects but immediately disconnects
**Cause**: Token valid for API but socket auth fails
**Solution**:
- Check JWT_SECRET is same for both
- Verify socket.user is being set correctly
- Check server logs for socket auth errors

---

## Testing Backend Auth

### Run Verification Script

```bash
cd backend

# Test all auth scenarios
node BACKEND_AUTH_VERIFICATION.js

# Output should show:
✅ PASS: Returns 401 when no token provided
✅ PASS: Returns 401 with invalid token
✅ PASS: Login successful, token received
✅ PASS: Protected route accessible
```

### Manual Testing

```bash
# 1. Get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response:
{
  "token": "eyJ...",
  "user": {...}
}

# 2. Copy the token and use it
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer eyJ..."

# Should work!
```

---

## Environment Variables Required

Ensure these are set in `.env`:

```env
# JWT Secret (used for signing tokens)
JWT_SECRET=your-secret-key-here

# Frontend URL (for CORS and redirects)
FRONTEND_URL=https://airswift-frontend.vercel.app

# Database connection
MONGODB_URI=mongodb+srv://...

# Port
PORT=5000
```

---

## Security Notes

⚠️ **IMPORTANT**:
- Never expose JWT_SECRET in frontend code
- Always use Bearer tokens (not in URL query params)
- Use HTTPS in production (not HTTP)
- Set httpOnly flag on cookies if using them
- Tokens expire (check exp field)
- Socket connections also need valid tokens

---

## Summary

Your backend is **correctly configured** ✅

### What's working:
✅ Auth middleware validates tokens
✅ All protected routes have middleware
✅ Socket authentication matches API auth
✅ Error messages are helpful for debugging
✅ JWT tokens are properly signed and verified

### What frontend needs to do:
✅ Store token in localStorage after login
✅ Send token in Authorization header: `Bearer [token]`
✅ Pass token to socket: `io(URL, { auth: { token } })`
✅ Handle 401 errors (redirect to login)

---

## Next Steps

1. Continue with frontend implementation (see previous guide)
2. Test using browser DevTools Network tab
3. Monitor server logs for auth middleware messages
4. Verify socket connects after login

**All backend requirements are met! The 401 errors are now due to frontend not sending the token.** ✅
