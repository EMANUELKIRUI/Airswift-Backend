# Admin - Fetch All Users: Quick Setup Guide

## ✅ What's Been Set Up

Your backend already has a complete API to fetch all users. Here's what you have:

### Backend Components
- ✅ **API Endpoint**: `GET /api/admin/users` (protected with auth middleware)
- ✅ **Route**: Configured in `/backend/routes/admin.js`
- ✅ **Controller**: `getAllUsers` in `/backend/controllers/adminController.js`
- ✅ **Permissions**: Admin role has `manage_users` permission
- ✅ **Database**: MongoDB User model with all necessary fields
- ✅ **Response Format**: Returns array of user objects without passwords

### Frontend Components (Created for You)
- ✅ **React Component**: `/components/AdminUsers.jsx` - Complete admin users table
- ✅ **Styling**: `/styles/AdminUsers.css` - Professional styling
- ✅ **Documentation**: `/ADMIN_FETCH_USERS_GUIDE.md` - Complete API documentation
- ✅ **Test Examples**: `/TEST_ADMIN_USERS.js` - Various testing methods

## 🚀 Quick Start (3 Steps)

### Step 1: Import the Component
In your admin page/layout file:

```jsx
import AdminUsers from '../components/AdminUsers';

export default function AdminDashboard() {
  return (
    <div>
      <AdminUsers />
    </div>
  );
}
```

### Step 2: Ensure User is Authenticated
The `AdminUsers` component automatically:
- Gets JWT token from `localStorage`
- Adds it to API requests
- Handles 401/403 errors

### Step 3: Test It
1. Log in as an admin user
2. Navigate to admin dashboard
3. You should see the users table

## 📋 API Endpoint Details

**URL**: `/api/admin/users`

**Required Headers**:
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response**:
```json
{
  "users": [
    {
      "_id": "63f...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ]
}
```

## 🧪 Testing the Connection

### Quick Browser Test
1. Open browser console (F12)
2. Login to your admin account
3. Run this in console:

```javascript
const token = localStorage.getItem('token');
fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Users:', data.users))
.catch(e => console.error('Error:', e));
```

### Check Backend Logs
When you fetch users, you should see in backend terminal:
```
📥 Fetching all users from /api/admin/users
✅ Users fetched successfully
```

## ❌ Troubleshooting

### Issue: "Unauthorized" (401)
**Problem**: No valid JWT token
**Solution**:
1. Make sure user is logged in
2. Check `localStorage.getItem('token')` returns a value
3. Try logging in again

### Issue: "Forbidden" (403)  
**Problem**: User is not an admin
**Solution**:
1. Only admin accounts can fetch users
2. Log in with admin credentials
3. Check user role in database: `user.role === 'admin'`

### Issue: No data showing / Empty table
**Problem**: Database has no users or connection issue
**Solution**:
1. Check MongoDB is running
2. Verify database connection string in `.env`
3. Seed some test users if needed
4. Check backend logs for database errors

### Issue: CORS Error
**Problem**: Frontend origin not allowed
**Solution**:
1. Check `/backend/server.js` CORS configuration
2. Add your frontend URL to allowed origins:
```javascript
cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
})
```

## 📁 File Structure

```
/workspaces/Airswift-Backend/
├── components/
│   └── AdminUsers.jsx          ← Use this component
├── styles/
│   └── AdminUsers.css          ← Styling included
├── ADMIN_FETCH_USERS_GUIDE.md  ← Full API documentation
├── TEST_ADMIN_USERS.js         ← Testing examples
├── backend/
│   ├── routes/
│   │   └── admin.js            ← API route defined
│   ├── controllers/
│   │   └── adminController.js  ← Controller logic
│   ├── config/
│   │   ├── roles.js            ← Permissions config
│   │   └── db.js               ← Database config
│   └── server.js               ← Route mounted here
```

## 🔐 Security Notes

✅ **Password Protection**: Passwords never sent to frontend  
✅ **Auth Required**: All requests require valid JWT token  
✅ **Role-Based**: Only admins can access this endpoint  
✅ **Permission-Based**: Requires `manage_users` permission  
✅ **No SQL Injection**: Using MongoDB Mongoose ORM  

## 🎯 Features of AdminUsers Component

The `AdminUsers.jsx` component includes:

- **Search**: Filter by name or email
- **Filtering**: By role (admin/user/recruiter) and verification status
- **Sorting**: Chronological by creation date
- **Pagination**: Show 10 users per page
- **Export**: Download users as CSV
- **Refresh**: Reload data from server
- **Error Handling**: User-friendly error messages
- **Loading State**: Visual feedback while fetching
- **Responsive**: Works on mobile/tablet/desktop
- **Statistics**: Total users, admins, verified count

## ⚙️ Configuration

### If you need to customize:

**Change Items Per Page** (in `AdminUsers.jsx`):
```jsx
const [usersPerPage] = useState(10); // Change 10 to desired number
```

**Add More Filters** (in `AdminUsers.jsx`):
```jsx
const [customFilter, setCustomFilter] = useState('all');
// Then add to filterUsers() function
```

**Change API URL** (if different):
```jsx
const response = await api.get('/admin/users'); // Change path here
```

## 📞 Support

If you encounter issues:

1. **Check Backend Logs**: `npm run run` and watch terminal
2. **Check Network Tab**: (F12 → Network) - see actual API response
3. **Check Console**: (F12 → Console) - JavaScript errors
4. **Verify Token**: Run `localStorage.getItem('token')` in console
5. **Check Database**: Connect with MongoDB Compass to verify users exist

## 🎉 You're All Set!

The connection between Admin and fetching all users is complete:

```
Admin User → Login → JWT Token → API Request → /api/admin/users
                                              ↓
                                        User.find()
                                              ↓
                                     Return {users: [...]}
                                              ↓
                              AdminUsers Component displays them
```

## Next Steps

1. ✅ Import `AdminUsers` component into your admin page
2. ✅ Test with browser console (see Testing section)
3. ✅ Verify users display in the table
4. ✅ Test filtering, search, export features
5. ✅ Deploy when working!

---

Happy managing! 🎊
