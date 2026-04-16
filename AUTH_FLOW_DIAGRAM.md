# FULL AUTHENTICATION FLOW - BACKEND + FRONTEND

## Complete Request/Response Flow

### 1️⃣ LOGIN PHASE

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User enters email & password
         │
         ├─→ POST /api/auth/login          ✅ Receives request
             { email, password }  ────────→ Checks credentials
                                           Finds user in DB
                                           Hashes password matches
                                           Generates JWT token
                                           ✅ Returns 200
         ←─────── { token, user} ←─────── token signed with JWT_SECRET
             "eyJhbG..."

Stores in localStorage
localStorage.setItem('token', token)
```

### 2️⃣ SUBSEQUENT API CALLS

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make API request
axios interceptor adds header:
{ Authorization: "Bearer eyJhbG..." }
         │
         ├─→ GET /api/profile              ✅ Receives request
             + Authorization header       
                                           Auth middleware:
                                           1. Check header exists
                                           2. Check Bearer prefix  
                                           3. Extract token
                                           4. jwt.verify(token)
                                           5. Set req.user
                                           6. Call next()
                                           
                                           Handler executes
                                           ✅ Returns 200
         ←─────── { message, user } ←─────
```

### 3️⃣ SOCKET CONNECTION

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After login & token stored:

Create socket with token:
io(URL, {
  auth: { token: localStorage.token }
})
         │
         ├─→ SOCKET.IO Handshake           ✅ Socket middleware:
             with auth.token              1. Extract token
                                           2. jwt.verify(token)
                                           3. Set socket.user
                                           4. Accept connection
                                           
                                           ✅ emit: connect
         ←─────── connection event ←──────
         
Socket ready for real-time events
```

---

## Error Scenarios

### ❌ Scenario 1: No Token Sent

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/profile
(NO Authorization header)
         │
         ├─→                                Auth middleware check:
                                            1. req.headers.authorization?
                                               → undefined
                                            2. ❌ Return 401
         
                                           Response: {
                                             status: 401,
                                             message: "No token provided"
                                           }
         ←────────────────────────────────

Frontend receives: 401 Unauthorized
Console error: "Request failed with status code 401"
```

### ❌ Scenario 2: Invalid Token Format

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/profile
Authorization: "Basic xyz123"  ← Wrong format!
         │
         ├─→                                Auth middleware check:
                                            1. req.headers exists? ✅
                                            2. Starts with "Bearer "?
                                               → "Basic" ≠ Bearer
                                            3. ❌ Return 401
         
                                           Response: {
                                             status: 401,
                                             message: "Invalid auth format"
                                           }
         ←────────────────────────────────
```

### ❌ Scenario 3: Expired Token

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/profile
Authorization: "Bearer eyJ..." (expired)
         │
         ├─→                                Auth middleware check:
                                            1. Header exists? ✅
                                            2. Format correct? ✅
                                            3. jwt.verify(token)
                                               → "TokenExpiredError"
                                            4. ❌ Return 401
         
                                           Response: {
                                             status: 401,
                                             error: "TOKEN_EXPIRED"
                                           }
         ←────────────────────────────────

Frontend should: redirect to /login
```

### ❌ Scenario 4: Socket No Token

```
FRONTEND                                    BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

io(URL, { })  ← No auth provided!

         │
         ├─→ SOCKET.IO Handshake           Socket middleware:
             (no token)                    1. socket.handshake.auth.token?
                                               → undefined
                                           2. ❌ Error: "Not authenticated"
         
         ←────────────────────────────────
         
Console error: "Socket connection error: Not authenticated"
Socket NOT connected
```

---

## Middleware Execution Order

### API Request Middleware Chain

```
Request arrives
     │
     ├─→ Express parser middleware
     │   (parse JSON body)
     │
     ├─→ ✅ Auth Middleware (verifyToken)
     │   └─ Check Authorization header
     │   └─ Extract and verify token
     │   └─ Set req.user
     │   └─ Call next() → request continues
     │          │
     │          ├─→ ✅ Admin Middleware (if needed)
     │          │   └─ Check req.user.role === 'admin'
     │          │
     │          ├─→ ✅ Request Handler
     │          │   └─ Do the actual work
     │          │   └─ Send response
     │
     ├─ If auth fails: Return 401
     │  (middleware doesn't call next())
     │
     └─ Response sent to client
```

### Socket Connection Handshake

```
Socket connection attempt
     │
     ├─→ ✅ Socket Auth Middleware (io.use)
     │   └─ Check socket.handshake.auth.token
     │   └─ Verify JWT token  
     │   └─ Set socket.user
     │   └─ Call next() → connection continues
     │      │
     │      ├─→ Connection accepted
     │      │   emit 'connect' event
     │      │
     │      └─→ Socket ready for events
     │
     ├─ If auth fails: Connection rejected
     │  emit 'connect_error' event
     │
     └─ Socket connection complete/terminated
```

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ LOGIN                                               │
│ ──────────────────────────────────────────────────  │
│ GET /api/auth/login                                 │
│ Password verified ✅                                │
│ Token generated: JWT.sign(payload, secret)          │
│ Sent to frontend                                    │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│ STORED & READY                                      │
│ ──────────────────────────────────────────────────  │
│ Frontend: localStorage.setItem('token', token)      │
│ Token ready for API calls                           │
│ Valid for: 24 hours (or configured exp time)        │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│ API CALLS (Multiple)                                │
│ ──────────────────────────────────────────────────  │
│ Authorization: Bearer [token]                       │
│ Backend verifies with JWT.verify()                  │
│ If valid ✅ → Request proceeds                      │
│ If invalid ❌ → Return 401                          │
└─────────────────────────────────────────────────────┘
                         │
                         ↓ (Repeated)
                         
┌─────────────────────────────────────────────────────┐
│ REFRESH (Optional)                                  │
│ ──────────────────────────────────────────────────  │
│ GET /api/auth/refresh                               │
│ New token generated with fresh exp time             │
│ Frontend updates localStorage                       │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│ LOGOUT                                              │
│ ──────────────────────────────────────────────────  │
│ Frontend: localStorage.removeItem('token')          │
│ Socket: socket.disconnect()                         │
│ Old token now worthless (even if not expired)       │
│ Must login again to get new token                   │
└─────────────────────────────────────────────────────┘
```

---

## Timing Diagram

```
User Login                T=0
    ↓
POST /api/auth/login     T=50ms
    ↓
Backend returns token    T=100ms
    ↓
Frontend stores token    T=101ms
    ↓
Create socket with token T=102ms
    ↓
Socket handshake        T=150ms
    ↓
Socket middleware verifies token  T=151ms
    ↓
Socket connected        T=152ms ✅
    ↓
Dashboard loads         T=200ms
    ↓
GET /api/profile        T=210ms
    ↓
Auth middleware checks header  T=211ms
    ↓
Profile data returned   T=250ms ✅
    ↓
POST /api/applications  T=300ms
    ↓
Auth middleware checks header  T=301ms
    ↓
Application submitted   T=350ms ✅
```

---

## Key Points

### ✅ What Backend Does
- Checks Authorization header on every request
- Verifies token with JWT.verify() + JWT_SECRET
- Returns 401 if any check fails
- Sets req.user so handlers can access user info
- Socket middleware does same verification

### ✅ What Frontend Must Do
- Store token in localStorage after login
- Add "Authorization: Bearer [token]" to EVERY request
- Pass raw token to socket.io: `auth: { token }`
- Handle 401 → redirect to login
- Handle socket connection errors

### ⚠️ Common Mistakes
- ❌ Not adding Authorization header
- ❌ Wrong header format (Basic instead of Bearer)
- ❌ Socket connecting before token exists
- ❌ Storing token but not using it
- ❌ Token expired but not refreshed

---

## Verification Command

```bash
# Check auth middleware exists
grep -n "Authorization header\|verifyToken" backend/middleware/auth.js

# Check socket middleware exists  
grep -n "socket.handshake.auth.token" backend/server.js

# Check routes are protected
grep -c "verifyToken\|authMiddleware" backend/routes/*.js

# Should have ~30+ protected routes
```
