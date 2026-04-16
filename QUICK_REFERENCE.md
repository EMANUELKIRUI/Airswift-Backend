# 🚀 QUICK REFERENCE - AUTHENTICATION FIX

## The 3 Main Changes

### 1️⃣ Socket Connection (`socket.js`)
```javascript
// ❌ OLD: Connects immediately, fails if no token
const socket = io(SOCKET_URL, { auth: { token } });

// ✅ NEW: Only connects after login with token
export const reconnectSocketConnection = () => { /* ... */ };
```

### 2️⃣ API Interceptor (`api.js`)
```javascript
// ✅ Ensures every request includes Authorization header
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

### 3️⃣ Login Handler (`frontend-login.jsx`)
```javascript
// ✅ After login succeeds, reconnect socket with token
const socket = reconnectSocketConnection();
window.location.href = '/dashboard';
```

---

## Console Commands (Run After Login)

```javascript
// ✅ Check token storage
localStorage.getItem('token');

// ✅ Check socket connection
// Look at Network → WebSocket tab

// ✅ Full diagnostic test
AuthTroubleshoot.testCompleteFlow();

// ✅ Use auth service
import AuthService from './authService';
AuthService.login(email, password);
```

---

## Network Tab Checklist

### API Request Should Show:
```
✅ Headers → Authorization: Bearer eyJ...
✅ Response Status: 200 (not 401)
✅ Response includes data (not error)
```

### WebSocket Should Show:
```
✅ URL: wss://airswift-backend-fjt3.onrender.com/socket.io/
✅ Status: 101 Switching Protocols
✅ Handshake Query includes token
```

---

## Common Error Solutions

| Error | Solution |
|-------|----------|
| "Socket connection error: Not authenticated" | Call `reconnectSocketConnection()` after login |
| "401 Unauthorized" on APIs | Check token in localStorage: `localStorage.getItem('token')` |
| Token exists but still 401 | Check Authorization header being sent in Network tab |
| Socket won't connect | Verify token is valid and not expired |
| API shows no auth header | Ensure api interceptor is configured correctly |

---

## Environment Setup

```env
# .env.local (Frontend)
NEXT_PUBLIC_API_URL=https://airswift-backend-fjt3.onrender.com

# .env (Backend)
JWT_SECRET=your-secret-key
FRONTEND_URL=https://airswift-frontend.vercel.app
```

---

## Implementation Priority

1. **CRITICAL**: Update `socket.js` (prevents "Not authenticated" error)
2. **CRITICAL**: Verify `api.js` interceptor works (fixes 401 errors)
3. **CRITICAL**: Update login component (enables socket reconnection)
4. **OPTIONAL**: Add `authService.js` (cleaner code)
5. **OPTIONAL**: Add `authTroubleshoot.js` (debugging help)

---

## Files to Keep Open

| File | Purpose | When to Check |
|------|---------|---------------|
| `socket.js` | Socket connection | If socket not connecting |
| `api.js` | API authentication | If 401 errors |
| `frontend-login.jsx` | Login flow | After implementing fix |
| `authService.js` | Centralized auth | When refactoring |
| Browser Console | Live debugging | Always during testing |
| Network Tab | Request inspection | For 401 errors |

---

## Success Indicators ✅

After implementing the fix:
- [ ] Token appears in localStorage after login
- [ ] Console shows "Authorization header set: Bearer [token]"
- [ ] Socket shows "✅ Socket.IO connected: [socketId]"
- [ ] API requests show 200 status (not 401)
- [ ] Forms submit successfully
- [ ] Dashboard loads with data
- [ ] WebSocket shows 101 Switching Protocols

---

## One-Minute Test

```javascript
// 1. Login with valid credentials
// 2. Check localStorage
localStorage.getItem('token'); // Should return JWT

// 3. Check socket connection
// Look at Network → WebSocket
// Should see connection to socket.io endpoint

// 4. Make any API call
// Check Network tab → select request
// Headers should show Authorization: Bearer [token]
// Response should be 200, not 401

// ✅ If all pass, fix is working!
```

---

## Debugging Priority

If things aren't working, check in this order:

1. **Token Storage**
   ```javascript
   console.log(localStorage.getItem('token'));
   ```

2. **Token Format**
   ```javascript
   const token = localStorage.getItem('token');
   const parts = token?.split('.');
   console.log('Valid JWT:', parts?.length === 3);
   ```

3. **Interceptor Running**
   ```javascript
   // Make any API call, check console for:
   // "📤 API REQUEST INTERCEPTOR"
   ```

4. **Authorization Header**
   ```javascript
   // Open Network tab
   // Select ANY API request
   // Check Headers section for "Authorization: Bearer ..."
   ```

5. **Socket Connection**
   ```javascript
   // Check Network → WebSocket tab
   // Should see wss://airswift-backend-fjt3.onrender.com/socket.io/
   ```

---

## Integration Hints

### If using Next.js:
- Place socket.js in `src/utils/socket.js`
- Place api.js in `src/services/api.js`
- Import in pages or app wrapper

### If using React:
- Place socket.js in `src/services/socket.js`
- Place api.js in `src/services/api.js`
- Import in App.jsx or context

### If using Vue:
- Adapt socket.js to Vue composable
- Adapt api.js to use your HTTP client
- Call reconnectSocket in login handler

---

## Rollback Plan

If something breaks, revert to original:

```bash
# Git revert
git checkout -- socket.js api.js frontend-login.jsx

# Or manually restore config
localStorage.clear()
location.reload()
```

---

## Need Help?

1. Run diagnostic: `AuthTroubleshoot.testCompleteFlow()`
2. Check console for error messages
3. Inspect Network tab for missing Authorization header
4. Verify backend JWT_SECRET matches frontend setup
5. Check CORS headers in response

---

## Files Summary

```
✅ socket.js          - Deferred + reconnect
✅ api.js             - Interceptor + logging
✅ frontend-login.jsx - Socket reconnect after login
✨ authService.js     - Centralized service
✨ authTroubleshoot.js- Testing utilities
📚 Guides & docs      - Implementation help
```

---

> **Last Updated**: April 16, 2026
> **Status**: ✅ READY FOR IMPLEMENTATION
