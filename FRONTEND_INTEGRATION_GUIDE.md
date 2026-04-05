# Airswift Frontend Integration Guide

## Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [API Endpoints](#api-endpoints)
3. [Frontend Implementation](#frontend-implementation)
4. [Token Management](#token-management)
5. [Error Handling](#error-handling)
6. [UI Components](#ui-components)
7. [Role-Based Access Control](#role-based-access-control)

---

## Authentication Flow

### Overview
```
User Input → Login Request → Backend Auth → Token Response → Store Token → Dashboard
```

### Detailed Flow Diagram
```
┌─────────────────┐
│  Login Page     │
│  Email/Password │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│  POST /api/auth/login        │
│  (Send credentials)          │
└──────────┬───────────────────┘
           │
           ├─→ Valid Credentials?
           │   ├─→ YES: Generate JWT Token
           │   │        Return user + accessToken
           │   │        HTTP 200
           │   │
           │   └─→ NO: Return error message
           │        HTTP 400/401
           │
           ▼
┌──────────────────────────────┐
│  Store Token                 │
│  localStorage.setItem(       │
│    'token', accessToken      │
│  )                           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Check User Role             │
│  if (user.role === 'admin')  │
│    → Admin Dashboard         │
│  else                        │
│    → User Dashboard          │
└────────────────────────────┘
```

---

## API Endpoints

### 1. User Registration

**Endpoint:** `POST /api/auth/register`

**Request:**
```javascript
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```javascript
{
  "user": {
    "id": 3,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "isVerified": false,
    "authProvider": "local",
    "createdAt": "2026-04-05T10:32:46.104Z"
  }
}
```

**Error Response (400):**
```javascript
{
  "message": "User already exists"
}
```

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```javascript
{
  "email": "admin@airswift.com",
  "password": "Admin123!"
}
```

**Success Response (200):**
```javascript
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@airswift.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```javascript
{
  "error": "Invalid credentials"
}
```

**Error Response (400):**
```javascript
{
  "error": "Please verify your email first"
}
```

---

### 3. Get User Profile (Protected)

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```javascript
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```javascript
{
  "message": "Protected data",
  "user": {
    "id": 1,
    "role": "admin",
    "email": "admin@airswift.com",
    "name": "Admin User"
  }
}
```

**Error Response (401):**
```javascript
{
  "message": "Not authenticated"
}
```

---

### 4. User Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```javascript
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```javascript
{
  "message": "Logged out successfully"
}
```

---

### 5. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```javascript
{
  "refreshToken": "refresh-token-here"
}
```

**Success Response (200):**
```javascript
{
  "accessToken": "new-access-token-here"
}
```

---

## Frontend Implementation

### Phase 1: Setup Authentication Service

**File:** `services/authService.js`

```javascript
// Base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com';

const AuthService = {
  // Registration
  register: async (name, email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store token
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get Profile (Protected)
  getProfile: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No token found');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error(data.message || 'Unauthorized');
      }
      
      return data.user;
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    const token = localStorage.getItem('token');
    
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get token
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default AuthService;
```

---

### Phase 2: Create Login Component

**File:** `pages/Login.jsx`

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await AuthService.login(email, password);
      
      console.log('Login successful:', response.user);
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err) {
      setError(err.message);
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Airswift Login</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="login-btn"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Test Credentials Info */}
        <div className="test-credentials">
          <h4>Test Credentials:</h4>
          <p>
            <strong>Admin:</strong> admin@airswift.com / Admin123!
          </p>
          <p>
            <strong>User:</strong> testuser@example.com / TestPassword123!
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
```

---

### Phase 3: Create Dashboard Components

**File:** `pages/AdminDashboard.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if token exists
        if (!AuthService.isAuthenticated()) {
          navigate('/login');
          return;
        }

        // Get stored user data
        const storedUser = AuthService.getStoredUser();
        
        // Verify with backend
        const profileData = await AuthService.getProfile();
        
        setUser(profileData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user:', error);
        navigate('/login');
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <div className="error">No user data available</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Airswift Admin Portal</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      {/* User Info Card */}
      <div className="user-card">
        <h2>Welcome, {user.name}! 👑</h2>
        <div className="user-info">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role.toUpperCase()}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="admin-actions">
        <h3>Admin Controls</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span>📊</span>
            <p>Manage Users</p>
          </button>
          <button className="action-btn">
            <span>💼</span>
            <p>Create Job</p>
          </button>
          <button className="action-btn">
            <span>📝</span>
            <p>View Applications</p>
          </button>
          <button className="action-btn">
            <span>📈</span>
            <p>Reports</p>
          </button>
          <button className="action-btn">
            <span>⚙️</span>
            <p>Settings</p>
          </button>
          <button className="action-btn">
            <span>👥</span>
            <p>User Management</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
```

**File:** `pages/UserDashboard.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

function UserDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!AuthService.isAuthenticated()) {
          navigate('/login');
          return;
        }

        const storedUser = AuthService.getStoredUser();
        const profileData = await AuthService.getProfile();
        
        setUser(profileData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user:', error);
        navigate('/login');
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <div className="error">No user data available</div>;
  }

  return (
    <div className="user-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Airswift User Portal</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      {/* User Info Card */}
      <div className="user-card">
        <h2>Welcome, {user.name}! 👋</h2>
        <div className="user-info">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role.toUpperCase()}</p>
          <p><strong>Status:</strong> ✅ Active</p>
        </div>
      </div>

      {/* User Actions */}
      <div className="user-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span>💼</span>
            <p>Browse Jobs</p>
          </button>
          <button className="action-btn">
            <span>✍️</span>
            <p>Apply to Job</p>
          </button>
          <button className="action-btn">
            <span>📋</span>
            <p>My Applications</p>
          </button>
          <button className="action-btn">
            <span>⭐</span>
            <p>Saved Jobs</p>
          </button>
          <button className="action-btn">
            <span>👤</span>
            <p>My Profile</p>
          </button>
          <button className="action-btn">
            <span>⚙️</span>
            <p>Settings</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
```

---

### Phase 4: Create Protected Route Wrapper

**File:** `components/ProtectedRoute.jsx`

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthService from '../services/authService';

function ProtectedRoute({ children, requiredRole = null }) {
  const isAuthenticated = AuthService.isAuthenticated();
  const user = AuthService.getStoredUser();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check role if specified
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} />;
  }

  return children;
}

export default ProtectedRoute;
```

---

### Phase 5: Setup Routes

**File:** `App.jsx`

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Protected Routes - Admin */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes - User */}
        <Route 
          path="/user/dashboard" 
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Token Management

### Access Token Lifecycle

```
Login (Get Token)
    ↓
Store in localStorage
    ↓
Send with every API request (Authorization: Bearer)
    ↓
Token expires (15 minutes)
    ↓
Use refresh token to get new access token
    ↓
Update token in localStorage
    ↓
Continue making requests
```

### Token Storage Best Practices

```javascript
// Good: localStorage (simplest for SPAs)
localStorage.setItem('token', accessToken);

// Better: sessionStorage (more secure, clears on tab close)
sessionStorage.setItem('token', accessToken);

// Best: HttpOnly cookies (most secure, automatically sent)
// - Server must set: Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict
```

### Axios Interceptor (Optional)

```javascript
import axios from 'axios';
import AuthService from './authService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com'
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = AuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      AuthService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Error Handling

### Common Error Scenarios

```javascript
const handleErrors = (error) => {
  // Network error
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }

  const status = error.response.status;
  const message = error.response.data?.message || error.response.data?.error;

  switch (status) {
    case 400:
      return message || 'Invalid request. Please check your input.';
    
    case 401:
      return 'Unauthorized. Please login again.';
    
    case 403:
      return 'Access denied. You do not have permission.';
    
    case 404:
      return 'Resource not found.';
    
    case 500:
      return 'Server error. Please try again later.';
    
    default:
      return message || 'An error occurred. Please try again.';
  }
};
```

---

## UI Components

### CSS Styling

```css
/* Login Container */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #667eea;
  outline: none;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
  border-left: 4px solid #c33;
}

/* Dashboard */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 30px;
}

.user-card {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.user-info {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.user-info p {
  color: #666;
  margin: 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.action-btn {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.action-btn:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.action-btn span {
  font-size: 32px;
  display: block;
  margin-bottom: 10px;
}

.action-btn p {
  margin: 0;
  color: #333;
  font-weight: 500;
}

.logout-btn {
  padding: 10px 24px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn:hover {
  background: #c82333;
}
```

---

## Role-Based Access Control

### User Roles

| Role | Permissions | Dashboard |
|------|------------|-----------|
| **admin** | Full access, manage users, create jobs | Admin Portal |
| **user** | Browse jobs, apply, view applications | User Portal |

### Check Role in Component

```javascript
function ComponentName() {
  const user = AuthService.getStoredUser();
  const isAdmin = user?.role === 'admin';

  return (
    <div>
      {isAdmin && (
        <button>Admin-Only Action</button>
      )}
      
      {!isAdmin && (
        <button>User Action</button>
      )}
    </div>
  );
}
```

---

## Environment Variables

### Create `.env` file in frontend root:

```
REACT_APP_API_URL=https://airswift-backend-fjt3.onrender.com
REACT_APP_ENV=production
```

### For Development:

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

---

## Testing Checklist

- [ ] User can register with new email
- [ ] User cannot register with existing email
- [ ] User can login with correct credentials
- [ ] User cannot login with incorrect password
- [ ] User is redirected to correct dashboard based on role
- [ ] Admin dashboard shows admin controls
- [ ] User dashboard shows user actions
- [ ] Token is stored in localStorage after login
- [ ] Token is sent with protected API requests
- [ ] User can logout and token is cleared
- [ ] Redirect to login after logout
- [ ] Protected routes are inaccessible without token

---

## Common Issues & Solutions

### Issue: "Network Error"
**Solution:** Check if backend URL is correct in `.env`

### Issue: "Invalid credentials"
**Solution:** Verify email/password are correct. Check if account is verified.

### Issue: Token not persisting
**Solution:** Ensure localStorage is enabled and not cleared by cache settings

### Issue: CORS error
**Solution:** Backend has CORS configured for `https://airswift-frontend.vercel.app`

### Issue: 401 Unauthorized
**Solution:** Token expired or invalid. User needs to login again.

---

## Support & Questions

For API documentation, see the backend README or contact the backend developer.

**Backend API Base URL:** `https://airswift-backend-fjt3.onrender.com`

**Admin Email:** `admin@airswift.com`
**Admin Password:** `Admin123!`
