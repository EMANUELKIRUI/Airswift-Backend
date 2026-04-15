# 🔐 Frontend Authentication Setup Guide

## 1️⃣ LOGIN REQUEST (CORRECT FORMAT)

**Do this in your login component:**

```javascript
import axios from 'axios';

const handleLogin = async (email, password) => {
  try {
    // ✅ CORRECT: Send JSON with proper headers
    const response = await axios.post("/api/auth/login", {
      email,
      password
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log("Login successful:", response.data);

    // 🔑 Extract token from response
    const { token, user } = response.data;

    // ✅ Store token in localStorage for persistence
    localStorage.setItem("token", token);
    
    // ✅ Optional: Store user info
    localStorage.setItem("user", JSON.stringify(user));

    // ✅ Redirect to dashboard
    router.push("/dashboard");

  } catch (error) {
    console.error("Login failed:", error.response?.data);
    alert(error.response?.data?.message || "Login failed");
  }
};
```

**Backend Response Format:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

---

## 2️⃣ CONFIGURE AXIOS INTERCEPTOR

**Create this in your API utility file (e.g., `utils/api.js`):**

```javascript
import axios from 'axios';

// Create axios instance
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

// ✅ REQUEST INTERCEPTOR: Add Bearer token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // ✅ Add token with "Bearer " prefix
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ RESPONSE INTERCEPTOR: Handle 401 errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
```

**Usage:**
```javascript
// ✅ Token is automatically added to all requests
const response = await API.get('/api/users/status');
```

---

## 3️⃣ PROTECT ROUTES (IMPORTANT UX FIX)

**Add this to every protected page (e.g., dashboard, apply form, profile):**

```javascript
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Check if token exists
    const token = localStorage.getItem('token');

    if (!token) {
      // No token → redirect to login
      router.push('/login');
      return;
    }

    // 🔐 Optional: Verify token is still valid
    verifyTokenValidity(token);
  }, []);

  return (
    <div>
      {/* Your component content */}
    </div>
  );
}

// Optional helper function
const verifyTokenValidity = async (token) => {
  try {
    const response = await API.get('/api/users/status');
    // Token is valid, user is authenticated
    console.log('User authenticated:', response.data.user);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token invalid or expired
      localStorage.removeItem('token');
      router.push('/login');
    }
  }
};
```

---

## 4️⃣ LOGIN PAGE WITH PROTECTION

**Complete login page example:**

```javascript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 🔐 If already logged in, redirect to dashboard
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ Send login request
      const response = await axios.post('/api/auth/login', {
        email,
        password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      // ✅ Store token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // ✅ Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## 5️⃣ LOGOUT FUNCTIONALITY

**Add logout to your navbar/header:**

```javascript
const handleLogout = () => {
  // Remove token and user data
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Redirect to login
  router.push('/login');
};

export default function Navbar() {
  return (
    <nav>
      {/* Other nav items */}
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
}
```

---

## 6️⃣ BACKEND TOKEN MIDDLEWARE CHECK ✅

**Your backend is correctly configured:**

```javascript
// ✅ CORRECT - Checks Authorization header
const token = req.headers.authorization?.split(" ")[1];

// Expected format: "Bearer <token>"
// Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**NOT like this:**
```javascript
// ❌ WRONG - Checks incorrect header
const token = req.headers.token; // This won't work!
```

---

## 7️⃣ COMPLETE API REQUEST FLOW

### Login Flow:
```
1. User submits email/password
   ↓
2. Frontend: POST /api/auth/login with JSON body
   ↓
3. Backend: Verify credentials
   ↓
4. Backend: Return { token, user }
   ↓
5. Frontend: Store token in localStorage
   ↓
6. Frontend: Redirect to dashboard
```

### Protected Request Flow:
```
1. Frontend: Get token from localStorage
   ↓
2. Frontend: Add "Authorization: Bearer <token>" header
   ↓
3. Backend: Extract token from Authorization header
   ↓
4. Backend: Verify token with JWT
   ↓
5. Backend: Set req.user from decoded token
   ↓
6. Backend: Execute route handler
```

---

## 8️⃣ PROTECTED ROUTES PATTERN

**All protected routes should follow this pattern:**

```javascript
// routes/protected-route.js

const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// ✅ Add verifyToken middleware
router.get('/user-data', verifyToken, async (req, res) => {
  // req.user is now available and verified
  const userId = req.user.id;
  
  // Your route logic here
  res.json({ userId, message: 'Protected data' });
});

module.exports = router;
```

---

## 9️⃣ TESTING CHECKLIST

- [ ] Login form sends correct JSON to `/api/auth/login`
- [ ] Token is stored in `localStorage` after login
- [ ] Axios automatically includes token in all requests
- [ ] Token is sent as `Authorization: Bearer <token>`
- [ ] Protected pages check for token before rendering
- [ ] Unauthenticated users redirect to `/login`
- [ ] Logout clears token from localStorage
- [ ] Expired/invalid tokens redirect to login
- [ ] All API calls return 401 if no token/invalid token

---

## 🔟 ENVIRONMENT VARIABLES

**Set these in your `.env.local`:**

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Or for production:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

---

## 1️⃣1️⃣ QUICK REFERENCE

| Action | Code |
|--------|------|
| **Get stored token** | `localStorage.getItem('token')` |
| **Store token** | `localStorage.setItem('token', token)` |
| **Remove token** | `localStorage.removeItem('token')` |
| **Add token to request** | `headers: { Authorization: \`Bearer ${token}\` }` |
| **Check if logged in** | `const token = localStorage.getItem('token'); if (!token) router.push('/login');` |
| **API request with token** | `API.get('/api/endpoint')` (token auto-added) |

---

## 🚀 Common Issues & Fixes

### Issue: "No token provided" error
**Fix:** Ensure you're adding `Authorization: Bearer <token>` header
```javascript
// ❌ WRONG
headers: { Authorization: token }

// ✅ CORRECT
headers: { Authorization: `Bearer ${token}` }
```

### Issue: 401 Unauthorized on protected routes
**Fix:** Check if token exists and is valid
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token);
```

### Issue: Token not kept after page refresh
**Fix:** Store in localStorage, not just state
```javascript
// ❌ WRONG - Lost on refresh
const [token, setToken] = useState(null);

// ✅ CORRECT - Persists on refresh
localStorage.setItem('token', token);
const storedToken = localStorage.getItem('token');
```

### Issue: Axios doesn't add token automatically
**Fix:** Use interceptor setup from Section 2️⃣

---

Happy coding! 🎉
