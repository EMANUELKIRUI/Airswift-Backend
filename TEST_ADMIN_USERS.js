/**
 * Test Script: Admin Users Fetch Integration
 * 
 * This script demonstrates and tests the admin users fetch functionality.
 * It includes examples for:
 * 1. Testing the API endpoint directly
 * 2. Using the AdminUsers React component
 * 3. Common error handling scenarios
 */

// ============================================================
// OPTION 1: Test with Fetch API (Browser Console)
// ============================================================

/**
 * Simple fetch test - Run this in your browser console
 */
async function testFetchUsers() {
  const token = localStorage.getItem('token'); // Get token from localStorage
  
  if (!token) {
    console.error('❌ No token found in localStorage');
    return;
  }

  try {
    console.log('📥 Fetching users...');
    
    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Users fetched successfully!');
    console.log('Total users:', data.users?.length);
    console.log('Users:', data.users);

    return data.users;
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

// Run it: testFetchUsers();

// ============================================================
// OPTION 2: Test with cURL (Terminal)
// ============================================================

/**
 * cURL test - Run this in your terminal
 * 
 * Step 1: Get a token by logging in
 * curl -X POST http://localhost:5000/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"admin@test.com","password":"password123"}'
 * 
 * Step 2: Use the token to fetch users
 * Replace TOKEN_HERE with the token from step 1
 */

// Example command:
// curl -X GET http://localhost:5000/api/admin/users \
//   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
//   -H "Content-Type: application/json"

// ============================================================
// OPTION 3: Test with Axios in React
// ============================================================

/**
 * React Hook: useAdminUsers
 * 
 * Usage:
 * const { users, loading, error } = useAdminUsers();
 */

// React example:
/*
import { useEffect, useState } from 'react';
import api from './api'; // Your axios instance

function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
      setError(null);
      console.log('✅ Users:', response.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refetch: fetchUsers };
}

export default useAdminUsers;
*/

// ============================================================
// OPTION 4: Test with Node.js Script
// ============================================================

/**
 * Node.js test script
 * 
 * Requirements: npm install axios
 * 
 * Run: node test-admin-users.js
 */

/*
const axios = require('axios');

const testAdminUsers = async () => {
  try {
    // Step 1: Login to get token
    console.log('📝 Step 1: Logging in...');
    
    const loginResponse = await axios.post(
      'http://localhost:5000/api/auth/login',
      {
        email: 'admin@test.com',
        password: 'admin123'
      }
    );

    const token = loginResponse.data.token;
    console.log('✅ Login successful! Token:', token.substring(0, 20) + '...');

    // Step 2: Fetch users with token
    console.log('\n📥 Step 2: Fetching users...');
    
    const usersResponse = await axios.get(
      'http://localhost:5000/api/admin/users',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Users fetched successfully!');
    console.log('Total users:', usersResponse.data.users?.length);
    console.log('\nFirst 3 users:');
    usersResponse.data.users?.slice(0, 3).forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

testAdminUsers();
*/

// ============================================================
// OPTION 5: Test with Postman
// ============================================================

/**
 * Postman Test Steps:
 * 
 * 1. Create a new REQUEST:
 *    - Method: GET
 *    - URL: http://localhost:5000/api/admin/users
 * 
 * 2. Go to HEADERS tab:
 *    - Add: Authorization | Bearer YOUR_TOKEN_HERE
 *    - Add: Content-Type | application/json
 * 
 * 3. Click SEND
 * 
 * Expected Response (200):
 * {
 *   "users": [
 *     {
 *       "_id": "abc123",
 *       "name": "Admin User",
 *       "email": "admin@test.com",
 *       "role": "admin",
 *       "isVerified": true,
 *       "createdAt": "2024-01-15T10:30:00Z",
 *       "updatedAt": "2024-01-20T14:45:00Z"
 *     },
 *     ...
 *   ]
 * }
 */

// ============================================================
// COMMON ERRORS & SOLUTIONS
// ============================================================

/**
 * ERROR 1: 401 Unauthorized
 * {
 *   "message": "Not authenticated"
 * }
 * 
 * SOLUTION:
 * - Check that you have a valid JWT token
 * - Verify token is in localStorage (browser) or headers (API call)
 * - Try logging in again to get a fresh token
 * - Check that token isn't expired
 */

/**
 * ERROR 2: 403 Forbidden (Not Admin)
 * {
 *   "message": "Forbidden - Admin only"
 * }
 * 
 * SOLUTION:
 * - Verify the logged-in user has 'admin' role
 * - Check user permissions in database
 * - You need to login as an admin user
 */

/**
 * ERROR 3: 403 Forbidden (Missing Permission)
 * {
 *   "message": "Forbidden"
 * }
 * 
 * SOLUTION:
 * - Admin user doesn't have 'manage_users' permission
 * - This is unusual as admin role includes all permissions
 * - Check roles.js configuration
 * - Restart the application
 */

/**
 * ERROR 4: 500 Server Error
 * {
 *   "error": "error message"
 * }
 * 
 * SOLUTION:
 * - Check backend console for error details
 * - Verify MongoDB connection is working
 * - Check User model is properly configured
 * - Try refreshing the page
 */

/**
 * ERROR 5: Network Error
 * "Network request failed"
 * 
 * SOLUTION:
 * - Check backend server is running
 * - Verify API URL is correct in your client
 * - Check CORS settings allow your frontend origin
 * - Check firewall/network settings
 */

// ============================================================
// DEBUGGING CHECKLIST
// ============================================================

/**
 * ✓ Backend Running?
 *   - Check terminal: Is your backend server running?
 *   - Try: curl http://localhost:5000/api/health
 * 
 * ✓ Token Valid?
 *   - Check localStorage: localStorage.getItem('token')
 *   - Decode token: Use jwt.io to check expiry
 *   - Login: Get fresh token from /api/auth/login
 * 
 * ✓ User is Admin?
 *   - Check user object in localStorage
 *   - Verify role === 'admin'
 *   - Check database for user role
 * 
 * ✓ API Endpoint Correct?
 *   - Should be: /api/admin/users
 *   - Not: /admin/users or /users
 *   - Full URL: http://localhost:5000/api/admin/users
 * 
 * ✓ CORS Enabled?
 *   - Check server.js CORS settings
 *   - Verify frontend URL is in allowed origins
 *   - Should allow both 'http://localhost:3000' and production URL
 * 
 * ✓ Database Connected?
 *   - Check MongoDB connection in logs
 *   - Verify connection string in .env file
 *   - Try connecting with MongoDB Compass
 */

// ============================================================
// EXAMPLE: Complete Admin Users Update Flow
// ============================================================

/**
 * Full implementation example for React components
 */

/*
import React, { useState, useEffect } from 'react';
import api from './api';

// Hook for fetching users
function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
}

// Component that uses the hook
function AdminUsersPage() {
  const { users, loading, error, refetch } = useAdminUsers();

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Admin Users ({users.length})</h1>
      <button onClick={refetch}>Refresh</button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.isVerified ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminUsersPage;
*/

// ============================================================
// SUCCESS INDICATORS
// ============================================================

/**
 * You'll know it's working when you see:
 * 
 * ✅ Browser console shows users array
 * ✅ Database returns user records
 * ✅ Admin users table displays with data
 * ✅ Can filter by role/verification status
 * ✅ Export CSV works
 * ✅ Pagination works
 * ✅ No 401/403 errors in network tab
 */

console.log('👉 Copy one of the test functions above and run it in your browser console or terminal');
console.log('Example: testFetchUsers() - Run in browser console after logging in as admin');
