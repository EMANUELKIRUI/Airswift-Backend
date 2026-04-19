# Google OAuth & Authentication Backend Setup

## ✅ Implemented Endpoints

### 1. POST /api/auth/google
**Purpose:** Verify Google token and return JWT + user info

**Request:**
```json
{
  "token": "google_id_token_from_frontend"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "profilePicture": "image_url",
    "permissions": ["apply_jobs", "view_profile", ...]
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing token
- `401 Unauthorized` - Invalid Google token
- `501 Not Implemented` - Google OAuth not configured

### 2. POST /api/auth/login (Existing)
**Purpose:** Email/password authentication

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same format as Google OAuth endpoint

---

## 🎯 Frontend Implementation Guide

### 1. Auth Helpers (lib/auth.js)

```javascript
// Clear auth on logout
import { clearAuth } from "@/lib/auth";

const handleLogout = () => {
  clearAuth(); // Removes token and user from localStorage
  router.push("/login");
};
```

### 2. Google OAuth Verification

```javascript
import { verifyGoogleToken, redirectAfterLogin } from "@/lib/auth";

async function handleGoogleSuccess(response) {
  try {
    const result = await verifyGoogleToken(response.credential);
    
    // Token and user are auto-saved to localStorage
    // Now redirect based on role
    redirectAfterLogin(result.user, router);
  } catch (error) {
    console.error("Google OAuth failed:", error);
  }
}
```

### 3. Role-Based Redirect

```javascript
import { redirectAfterLogin } from "@/lib/auth";

// After any successful login
redirectAfterLogin(user, router);
// If user.role === "admin" → /admin/dashboard
// Otherwise → /dashboard
```

### 4. Complete Login Component Example

```jsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import { clearAuth, verifyGoogleToken, redirectAfterLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) throw new Error("Login failed");
      const data = await response.json();
      
      // Store token and user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Redirect based on role
      redirectAfterLogin(data.user, router);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Google OAuth
  const handleGoogleSuccess = async (response) => {
    try {
      const result = await verifyGoogleToken(response.credential);
      redirectAfterLogin(result.user, router);
    } catch (error) {
      console.error("Google OAuth failed:", error);
    }
  };

  // Logout
  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div>
      <form onSubmit={handleEmailLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Login</button>
      </form>

      {/* Add Google Sign-In button */}
      <GoogleLogin onSuccess={handleGoogleSuccess} />
    </div>
  );
}
```

---

## 🔧 Backend Requirements

To fully enable Google OAuth, set these environment variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback (if using redirect flow)
FRONTEND_URL=http://localhost:3000 (or your frontend URL)
```

**Without these variables:**
- POST /api/auth/google returns 501 (Not Implemented)
- Email/password login works normally
- Regular auth flow is not affected

---

## 📊 User Role & Permissions

### Admin User Permissions:
- manage_users
- delete_user
- view_dashboard
- view_all_applications
- manage_applications
- update_applications
- edit_templates
- manage_jobs
- manage_interviews
- view_analytics
- view_audit_logs
- manage_settings
- view_profile
- apply_jobs

### Regular User Permissions:
- view_profile
- apply_jobs

---

## ✅ Testing

Run the test script:
```bash
node test-google-oauth.js
```

Expected output:
```
✅ Correctly rejected missing token
✅ Correctly rejected invalid token
✅ POST /api/auth/google endpoint is accessible
✅ Regular login works
✅ Redirect logic for admin user works
```

---

## 🔐 Security Features

- ✅ JWT token-based authentication
- ✅ RBAC (Role-Based Access Control)
- ✅ Secure password hashing (bcrypt)
- ✅ Email verification
- ✅ Audit logging for all auth events
- ✅ Google token verification via google-auth-library
- ✅ localStorage for token/user storage
