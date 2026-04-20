# Admin Users Fetch Integration Guide

## Overview
This guide explains how to properly fetch all users in the Admin dashboard.

## Backend API Endpoint

### GET /api/admin/users
Fetches all users for admin management.

**Endpoint:** `GET /api/admin/users`

**Authentication:** Required
- Header: `Authorization: Bearer {token}`
- User must have `admin` role
- User must have `manage_users` permission

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Query Parameters (Optional):**
- `page` - Page number for pagination (default: 1)
- `limit` - Items per page (default: 50)
- `role` - Filter by user role
- `isVerified` - Filter by verification status (true/false)
- `search` - Search by name or email

**Success Response (200):**
```json
{
  "users": [
    {
      "_id": "user_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    },
    {
      "_id": "user_id_2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "admin",
      "isVerified": true,
      "createdAt": "2024-01-10T08:20:00Z",
      "updatedAt": "2024-01-18T11:30:00Z"
    }
  ]
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "message": "Not authenticated"
}
```

403 Forbidden (Not Admin):
```json
{
  "message": "Forbidden - Admin only"
}
```

403 Forbidden (Missing Permission):
```json
{
  "message": "Forbidden"
}
```

500 Server Error:
```json
{
  "error": "error message details"
}
```

## Frontend Implementation

### Using Axios with the API client

```javascript
import api from './api'; // Your axios-configured API client

// Fetch all users
async function fetchAllUsers() {
  try {
    const response = await api.get('/admin/users');
    console.log('Users:', response.data.users);
    return response.data.users;
  } catch (error) {
    console.error('Error fetching users:', error.response?.data);
  }
}

// Fetch users with filters
async function fetchUsersWithFilters(page = 1, role = null, isVerified = null) {
  try {
    const params = { page };
    if (role) params.role = role;
    if (isVerified !== null) params.isVerified = isVerified;

    const response = await api.get('/admin/users', { params });
    return response.data.users;
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function AdminUsers() {
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
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>All Users ({users.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.isVerified ? 'Yes' : 'No'}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminUsers;
```

## Testing the Endpoint

### Using cURL

```bash
# Get your JWT token first by logging in
# Then use it to fetch users

curl -X GET "http://localhost:5000/api/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Using Postman

1. Set request type to **GET**
2. URL: `http://localhost:5000/api/admin/users`
3. Go to **Auth** tab
4. Select **Bearer Token**
5. Paste your JWT token
6. Click **Send**

### Using JavaScript Fetch

```javascript
const token = localStorage.getItem('token'); // Get JWT token from storage

fetch('/api/admin/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(data => console.log('Users:', data.users))
  .catch(error => console.error('Error:', error));
```

## Troubleshooting

### Getting 401 Unauthorized
- Make sure JWT token is included in Authorization header
- Check that token hasn't expired
- Verify token format: `Bearer <token>`

### Getting 403 Forbidden
- Verify user has `admin` role
- Check that user has `manage_users` permission
- Admin role automatically has this permission in the current setup

### Getting 500 Server Error
- Check MongoDB/database connection
- Check server logs for detailed error message
- Verify User model is properly configured

## Architecture

### Route Protection Stack

```
GET /api/admin/users
    ↓
protect middleware (JWT validation)
    ↓
authorize('admin') middleware (check admin role)
    ↓
permit('manage_users') middleware (check permission)
    ↓
Route handler
    ↓
Database query: User.find().select("-password")
    ↓
Response: { users: [...] }
```

### User Model Fields
- `_id` - MongoDB ObjectId
- `name` - User's full name
- `email` - User's email
- `role` - User's role (user, admin, recruiter)
- `isVerified` - Email verification status
- `applicationStatus` - Current application status
- `createdAt` - Account creation date
- `updatedAt` - Last update date
- `password` - (EXCLUDED from response for security)

## Related Endpoints

### Get User by ID
**GET** `/api/admin/users/{id}`
- Fetch details of a specific user
- Returns single user object

### Update User
**PUT** `/api/admin/users/{id}`
- Update user information
- Requires JSON body with fields to update

### Delete User
**DELETE** `/api/admin/users/{id}`
- Delete a user account
- Requires `delete_user` permission

## Security Notes

1. **Password Protection**: Passwords are never returned in API responses (selected with `-password`)
2. **Role-Based Access**: Only admins can access this endpoint
3. **Permission-Based**: Requires `manage_users` permission in admin role
4. **Token Validation**: All requests are validated via JWT middleware
5. **MongoDBInjection Prevention**: Using Mongoose ODM for query safety

## Environment Setup

Required environment variables:
- `JWT_SECRET` - Secret key for JWT signing/verification
- `MONGODB_URI` - MongoDB connection string

## Next Steps

1. Ensure frontend has valid JWT token in localStorage
2. Implement the React component or use the provided example
3. Test endpoint with Postman or cURL first
4. Verify token claims include admin role
5. Check browser console for detailed error messages
