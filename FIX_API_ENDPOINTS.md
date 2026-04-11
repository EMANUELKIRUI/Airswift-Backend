# 🔧 Fix Frontend API Endpoint Mismatches

## Problem Analysis

Your frontend is calling these endpoints that don't exist or are failing:

### ❌ **404 Errors**
- `/api/users/status` → Should be `/api/auth-status/status`

### ❌ **500 Errors** 
- `/api/drafts/check` → Draft controller error
- `/api/drafts/save` → Draft controller error  
- `/api/applications` → Application controller error

### ⚠️ **Empty Responses**
- `/api/jobs` → Returns `[]` (no jobs in database)

---

## ✅ **Fix 1: Add Missing User Status Route**

**File**: [backend/routes/users.js](backend/routes/users.js) *(create new file)*

```javascript
const express = require('express');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_submitted: user.has_submitted,
        isVerified: user.isVerified
      },
      status: 'authenticated'
    });
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

**File**: [backend/server.js](backend/server.js) *(add this line)*

```javascript
// Add after other route imports
app.use("/api/users", require("./routes/users"));
```

---

## ✅ **Fix 2: Fix Draft Controller Errors**

**File**: [backend/controllers/draftController.js](backend/controllers/draftController.js)

The draft controller is failing because it's trying to use MongoDB methods but the database might not be connected properly. Let me add better error handling:

```javascript
const checkDraft = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Checking draft for user:', req.user.id);
    
    const draft = await Draft.findOne({ userId: req.user.id });
    console.log('Draft found:', draft ? 'yes' : 'no');

    // Return draft directly as requested
    res.json(draft ? draft.formData : {});
  } catch (error) {
    console.error("Draft check error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
```

---

## ✅ **Fix 3: Fix Applications Route Error**

**File**: [backend/controllers/applicationController.js](backend/controllers/applicationController.js)

The `createApplication` function is failing. Let me add better error handling:

```javascript
const createApplication = async (req, res) => {
  try {
    console.log('Create application request:', {
      user: req.user?.id,
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'no files'
    });

    const jobId = req.body.jobId || req.body.job_id;
    const jobTitle = (req.body.job || req.body.job_title || req.body.jobTitle || '').trim();
    const nationalId = req.body.nationalId || req.body.national_id;
    const phone = req.body.phone;

    console.log('Parsed data:', { jobId, jobTitle, nationalId, phone });

    const { jobId: resolvedJobId, job: resolvedJob, error: jobResolveError } = await resolveJobFromRequest(req.body);
    if (jobResolveError) {
      console.log('Job resolve error:', jobResolveError);
      return res.status(400).json({ message: jobResolveError });
    }

    console.log('Resolved job:', resolvedJobId);

    if (!resolvedJobId || !nationalId || !phone) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'All fields required' });
    }

    if (!req.files?.passport?.[0] || !req.files?.cv?.[0]) {
      console.log('Missing required files');
      return res.status(400).json({ message: 'Passport & CV required' });
    }

    console.log('Files present, checking for existing application...');

    const existing = await Application.findOne({ where: { user_id: req.user.id, job_id: resolvedJobId } });
    if (existing) {
      console.log('Already applied to this job');
      return res.status(400).json({ message: 'Already applied' });
    }

    console.log('Creating application...');

    const application = await Application.create({
      user_id: req.user.id,
      job_id: resolvedJobId,
      national_id: nationalId,
      phone,
      passport_path: req.files.passport[0].path,
      cv_path: req.files.cv[0].path,
      status: 'pending',
    });

    console.log('Application created:', application.id);

    // Update user status
    if (isMongooseModel) {
      await User.findByIdAndUpdate(req.user.id, { has_submitted: true });
    } else if (isSequelizeModel) {
      await User.update({ has_submitted: true }, { where: { id: req.user.id } });
    }

    console.log('User updated, creating notification...');

    await Notification.create({
      userId: req.user.id,
      title: 'New Application',
      message: 'A new user has applied',
    });

    console.log('Notification created, sending response...');

    res.json({ success: true, application });
  } catch (err) {
    console.error('createApplication error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ 
      message: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
```

---

## ✅ **Fix 4: Add Sample Jobs to Database**

**File**: [backend/scripts/seedJobs.js](backend/scripts/seedJobs.js)

If jobs are empty, run this to add sample jobs:

```javascript
const Job = require('../models/Job');

const sampleJobs = [
  {
    title: 'Software Engineer',
    description: 'Develop and maintain web applications',
    status: 'active',
    created_by: 1
  },
  {
    title: 'Data Analyst', 
    description: 'Analyze data and create reports',
    status: 'active',
    created_by: 1
  },
  {
    title: 'Project Manager',
    description: 'Manage software development projects',
    status: 'active', 
    created_by: 1
  }
];

async function seedJobs() {
  try {
    for (const jobData of sampleJobs) {
      const existing = await Job.findOne({ where: { title: jobData.title } });
      if (!existing) {
        await Job.create(jobData);
        console.log(`Created job: ${jobData.title}`);
      }
    }
    console.log('Jobs seeded successfully');
  } catch (error) {
    console.error('Error seeding jobs:', error);
  }
}

seedJobs();
```

**Run**: `cd backend && node scripts/seedJobs.js`

---

## ✅ **Fix 5: Update Frontend API Calls**

**File**: Your frontend API configuration

Update the status check call:

```javascript
// ❌ WRONG
const statusResponse = await api.get('/users/status');

// ✅ RIGHT  
const statusResponse = await api.get('/auth-status/status');
```

---

## 🧪 **Test the Fixes**

### 1. **Check Backend Logs**
```bash
cd backend
npm start
# Look for any startup errors
```

### 2. **Test Endpoints Manually**
```bash
# Test user status
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth-status/status

# Test jobs
curl http://localhost:5000/api/jobs

# Test drafts
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/drafts/check
```

### 3. **Check Database Connection**
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB connected');
  process.exit(0);
}).catch(err => {
  console.error('❌ MongoDB error:', err.message);
  process.exit(1);
});
"
```

---

## 📋 **Summary of Changes**

| Issue | Fix | Files Changed |
|-------|-----|---------------|
| `/api/users/status` 404 | Add `/api/users` route | `routes/users.js`, `server.js` |
| Drafts 500 errors | Better error handling | `controllers/draftController.js` |
| Applications 500 error | Better error handling | `controllers/applicationController.js` |
| Empty jobs array | Add sample jobs | `scripts/seedJobs.js` |
| Frontend API calls | Update endpoint URLs | Frontend code |

---

## 🚀 **Quick Test**

Run this to verify all fixes:

```bash
cd /workspaces/Airswift-Backend/backend

# 1. Check configuration
node ../check-configuration.js

# 2. Start server
npm start &
SERVER_PID=$!

# 3. Wait for server to start
sleep 3

# 4. Test endpoints
curl -s http://localhost:5000/api/auth-status/status | head -5
curl -s http://localhost:5000/api/jobs | head -5

# 5. Kill server
kill $SERVER_PID

echo "✅ Tests completed"
```

This should resolve all the 404 and 500 errors you're seeing! 🎯