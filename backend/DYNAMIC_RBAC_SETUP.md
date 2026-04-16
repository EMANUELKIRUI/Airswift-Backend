## Dynamic RBAC System - Core Implementation Complete ✅

This document outlines the **database-driven Permission and Role models** that have been implemented for dynamic RBAC.

### Files Created ✅

✅ **`backend/models/Permission.js`** - Permission model with:
- `name` - Permission identifier (e.g. "manage_users", lowercase, unique)
- `description` - Human readable description
- `category` - Classification (user, admin, recruiter, system)

✅ **`backend/models/Role.js`** - Role model with:
- `name` - Role identifier (admin, user, recruiter; unique, lowercase)
- `description` - Role description
- `permissions` - Array of Permission ObjectIds (references)
- `isActive` - Boolean for enabling/disabling roles

✅ **`backend/models/User.js`** - Updated with:
- `role` field now references Role model (ObjectId) instead of string

✅ **`backend/middleware/auth.js`** - Updated `protect` middleware:
- Fetches user with role and permissions populated from database
- Extracts permission names from Role.permissions array
- Falls back to config-based permissions as backup
- Returns `req.user` with: id, email, name, role, roleId, permissions, status

✅ **`backend/models/index.js`** - Added exports:
- Permission and Role models exported for use throughout app

---

## System Architecture

### Data Structure
```
User
  └─ role → Role
           ├─ name: "admin" | "user" | "recruiter"
           └─ permissions[]: Permission[]
                            ├─ name: "manage_users"
                            ├─ description: "..."
                            └─ category: "admin"
```

### Middleware Flow
```
Request → authMiddleware
  ├─ Verify JWT token
  ├─ Fetch User with populated Role and Permissions
  ├─ Extract permission names
  ├─ Attach to req.user:
  │  ├─ id
  │  ├─ role (name: "admin", "user", etc)
  │  ├─ permissions (["manage_users", "edit_templates", ...])
  │  └─ status
  └─ next()
```

### Usage in Routes

**Protect route (authentication required):**
```javascript
router.get('/profile', protect, getProfile);
```

**Authorize by role:**
```javascript
router.get('/admin/users', protect, authorize('admin'), getUsers);
```

**Permit by permission:**
```javascript
router.put(
  '/email-templates/:id',
  protect,
  permit('edit_templates'),
  updateTemplate
);
```

---

## Next Steps (Setup Required)

### 1. Seed Permissions to Database

Create `backend/scripts/seed-permissions-roles.js`:

```javascript
const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
require('dotenv').config();

async function seedPermissionsRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // ✅ Map permissions from config/roles.js
    const permissionsData = [
      // User permissions
      { name: 'apply_jobs', category: 'user' },
      { name: 'view_profile', category: 'user' },
      { name: 'edit_profile', category: 'user' },
      { name: 'submit_application', category: 'user' },
      { name: 'view_my_applications', category: 'user' },
      { name: 'view_interviews', category: 'user' },
      
      // Admin permissions
      { name: 'manage_users', category: 'admin' },
      { name: 'delete_user', category: 'admin' },
      { name: 'view_dashboard', category: 'admin' },
      { name: 'view_all_applications', category: 'admin' },
      { name: 'manage_applications', category: 'admin' },
      { name: 'edit_templates', category: 'admin' },
      { name: 'manage_jobs', category: 'admin' },
      { name: 'manage_interviews', category: 'admin' },
      { name: 'view_analytics', category: 'admin' },
      { name: 'view_audit_logs', category: 'admin' },
      { name: 'manage_settings', category: 'admin' },
      
      // Recruiter permissions
      { name: 'recruit_users', category: 'recruiter' },
      { name: 'schedule_interviews', category: 'recruiter' },
      { name: 'view_recruiter_dashboard', category: 'recruiter' },
    ];

    // Create permissions
    const permissions = {};
    for (const permData of permissionsData) {
      const perm = await Permission.findOneAndUpdate(
        { name: permData.name },
        permData,
        { upsert: true, new: true }
      );
      permissions[permData.name] = perm._id;
    }
    console.log('✅ Permissions seeded:', Object.keys(permissions).length);

    // ✅ Create roles with permissions
    const rolesData = [
      {
        name: 'admin',
        permissions: [
          'manage_users', 'delete_user', 'view_dashboard',
          'view_all_applications', 'manage_applications', 'edit_templates',
          'manage_jobs', 'manage_interviews', 'view_analytics',
          'view_audit_logs', 'manage_settings', 'view_profile', 'apply_jobs',
        ],
      },
      {
        name: 'user',
        permissions: [
          'apply_jobs', 'view_profile', 'edit_profile',
          'submit_application', 'view_my_applications', 'view_interviews',
        ],
      },
      {
        name: 'recruiter',
        permissions: [
          'recruit_users', 'schedule_interviews', 'view_recruiter_dashboard',
          'view_all_applications', 'manage_applications', 'view_profile',
        ],
      },
    ];

    for (const roleData of rolesData) {
      const permissionIds = roleData.permissions.map(p => permissions[p]);
      await Role.findOneAndUpdate(
        { name: roleData.name },
        { permissions: permissionIds },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Roles seeded: admin, user, recruiter');

    // ✅ Migrate existing users (assign default roles)
    const userRole = await Role.findOne({ name: 'user' });
    const adminRole = await Role.findOne({ name: 'admin' });
    
    // Assign default role if missing
    await User.updateMany(
      { role: null },
      { role: userRole._id }
    );
    console.log('✅ Default roles assigned to users without roles');

    await mongoose.disconnect();
    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedPermissionsRoles();
```

**Run seeding:**
```bash
cd backend
node scripts/seed-permissions-roles.js
```

### 2. Verify Database Structure

```bash
# Check if roles exist
db.roles.find({})

# Check if permissions exist
db.permissions.find({})

# Check user role references
db.users.findOne({ email: 'user@example.com' })
```

### 3. Test Auth Flow

```javascript
// login returns token with user ID
const { token } = await login(user);

// middleware fetches user + role + permissions
const user = await User.findById(id)
  .populate({ path: 'role', populate: { path: 'permissions' } });

// permits are checked
permit('edit_templates'); // ✅ Works
```

---

## Migration Path

If you have existing users with string roles (`role: "admin"`):

**Create migration script:**

```javascript
const User = require('../models/User');
const Role = require('../models/Role');

async function migrateUsers() {
  const roles = await Role.find();
  const roleMap = Object.fromEntries(
    roles.map(r => [r.name, r._id])
  );

  const users = await User.find({});
  for (const user of users) {
    if (typeof user.role === 'string') {
      const roleId = roleMap[user.role] || roleMap['user'];
      user.role = roleId;
      await user.save();
    }
  }
  console.log('✅ Migration complete');
}
```

---

## Fallback Behavior

If a user doesn't have a database Role:
1. System uses role name from token
2. Falls back to `config/roles.js` for permissions
3. Ensures backward compatibility

---

## What's NOT Changed

- `protect` middleware still works the same way
- `authorize(...roles)` works with role names
- `permit(...permissions)` now uses dynamic permissions
- JWT token still includes `id` and `role`
- Session handling unchanged

---

## Next Steps (When Ready for Routes)

Once seeding is complete, you can:
1. Create RBAC admin routes (POST /roles, GET /roles, PUT /users/:id/role)
2. Update seed scripts to use dynamic roles
3. Build admin UI for role management

Would you like me to implement:
- ✅ Next: Seeding script
- ✅ Next: Admin routes for role/permission management
- ✅ Next: Migration utilities
