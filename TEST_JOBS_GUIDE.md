# 🧪 Testing Guide - Seeding Test Jobs in Airswift

This guide explains how to add test jobs to the Airswift backend for system testing.

## Overview

The backend includes **16 comprehensive test jobs** across multiple categories and locations:
- 🇨🇦 **Canada**: Toronto, Vancouver, Montreal, Calgary, Waterloo (5 jobs)
- 🇺🇸 **USA**: New York, San Francisco, Austin, Boston, Los Angeles, Seattle, Chicago, Denver, Miami (9 jobs)
- 🌍 **Other**: Singapore, London, Sydney (2 jobs)

### Job Categories
- Technology (React, Node.js, DevOps, Python, etc.)
- Data Science & Analytics
- Design (UX/UI)
- Product Management
- Business Analysis

---

## Method 1: Via API Endpoint (Recommended)

### Step 1: Start the Backend Server

```bash
cd /workspaces/Airswift-Backend/backend
npm install  # if dependencies not installed
npm start    # or npm run dev for development mode
```

### Step 2: Get Admin Token

First, create or login as an admin user. Use a tool like Postman, REST Client, or curl.

**Example using curl:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@airswift.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "role": "admin"
  }
}
```

### Step 3: Seed Test Jobs

Use the returned token in the Authorization header:

```bash
curl -X POST http://localhost:5000/admin/seed-jobs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Step 4: Verify Success

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully seeded 16 test jobs",
  "jobs": {
    "total": 16,
    "count": 16,
    "data": [
      {
        "_id": "objectid",
        "title": "Senior Full Stack Developer",
        "location": "Toronto, Ontario",
        "salaryMin": 120000,
        "salaryMax": 160000,
        ...
      }
    ]
  },
  "summary": {
    "categories": ["Technology", "Data & Analytics", "Design", "Product", "Business"],
    "locations": 15,
    "remotePositions": 7,
    "salaryRange": {
      "min": 60000,
      "max": 200000
    }
  }
}
```

### Optional: Clear Existing Jobs First

To clear all existing jobs before seeding, add `?clear=true`:

```bash
curl -X POST "http://localhost:5000/admin/seed-jobs?clear=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Method 2: Via Node Script (via Terminal)

If you have MongoDB running locally or via Docker:

```bash
cd /workspaces/Airswift-Backend/backend
node scripts/seedJobs.js
```

**Output:**
```
🔌 Connecting to MongoDB...
URI: mongodb+srv://***:***@...
✅ MongoDB connected for seeding
🗑️  Cleared 0 existing jobs
✨ Successfully seeded 16 test jobs!

📊 Job Summary:
   • Total Jobs: 16
   • Categories: Technology, Data & Analytics, Design, Product, Business
   • Remote Positions: 7
   • Locations: 15 cities across 🇨🇦 🇺🇸 and 🌍
   • Salary Range: $60,000 - $200,000

✅ Database seeding completed successfully!
```

---

## Test Job Sample Data

### 1. Senior Full Stack Developer (Toronto)
- **Location:** Toronto, Ontario (Canada)
- **Experience Required:** 6+ years
- **Salary:** $120,000 - $160,000
- **Type:** Full-time
- **Remote:** No
- **Skills:** React, Node.js, TypeScript, PostgreSQL, Docker, AWS

### 2. React Developer (Vancouver)
- **Location:** Vancouver, BC (Canada)
- **Experience Required:** 3+ years
- **Salary:** $90,000 - $130,000
- **Type:** Full-time
- **Remote:** Yes ✅
- **Skills:** React, JavaScript, HTML, CSS, Git, Webpack

### 3. DevOps Engineer (Montreal)
- **Location:** Montreal, Quebec (Canada)
- **Experience Required:** 4+ years
- **Salary:** $100,000 - $140,000
- **Type:** Full-time
- **Remote:** Yes ✅
- **Skills:** AWS, Docker, Kubernetes, Jenkins, Terraform, Linux

### 4. Data Analyst (Calgary)
- **Location:** Calgary, Alberta (Canada)
- **Experience Required:** 2+ years
- **Salary:** $75,000 - $110,000
- **Type:** Full-time
- **Remote:** No
- **Skills:** Python, SQL, Tableau, Excel, Statistics, Data Visualization

### 5. UI/UX Designer (Waterloo)
- **Location:** Waterloo, Ontario (Canada)
- **Experience Required:** 3+ years
- **Salary:** $80,000 - $115,000
- **Type:** Full-time
- **Remote:** Yes ✅
- **Skills:** Figma, Design Thinking, User Research, Prototyping, Adobe XD

**... and 11 more jobs across USA and International locations**

---

## Testing Workflows

### Test 1: Job Search & Discovery
1. Seed test jobs via API
2. As a regular user, call GET `/jobs-search/search?keyword=Developer`
3. Verify 3-4 developer positions are returned
4. Test filters: `?location=Toronto&type=Full-time`

### Test 2: Job Matching
1. Create a user profile with skills: ["React", "JavaScript", "Node.js"]
2. Call GET `/jobs/recommendations` or `/jobs-search/search?keyword=React`
3. Verify Senior React Developer and React Developer jobs appear

### Test 3: Apply to Job
1. Log in as a regular user
2. POST `/applications/apply` with:
   ```json
   {
     "jobId": "OBJECTID_OF_A_JOB",
     "coverLetter": "I'm interested in this role...",
     "cv": "file_upload"
   }
   ```
3. Verify application is created with status "pending"

### Test 4: Admin Dashboard
1. Log in as admin
2. GET `/admin/applications` - view all applications
3. GET `/dashboard/summary` - view hiring analytics
4. Verify jobs appear in dashboard

### Test 5: Job Statistics
1. GET `/admin/stats` to see application distribution
2. Verify multiple jobs with applications are shown

---

## Database Verification

If you have MongoDB access, verify jobs are stored:

```bash
# MongoDB CLI
db.jobs.find().pretty()

# Expected output:
{
  "_id": ObjectId("..."),
  "title": "Senior Full Stack Developer",
  "location": "Toronto, Ontario",
  "category": "Technology",
  "salaryMin": 120000,
  "salaryMax": 160000,
  "skills": ["React", "Node.js", "TypeScript", ...],
  "requiredExperience": 6,
  "isRemote": false,
  "createdAt": ISODate("2024-01-15T..."),
  ...
}
```

---

## Troubleshooting

### ❌ Error: "Admin middleware failed"
- **Solution:** Ensure your token is valid and user has `role: "admin"`
- Use `/auth/login` to get a fresh token

### ❌ Error: "MongoDB connection failed"
- **Solution (API Method):** Make sure MONGODB_URI environment variable is set
- **Solution (Script Method):** Start MongoDB or use MongoDB Atlas connection string

### ❌ No jobs appear after seeding
- **Solution:** Check MongoDB logs for errors
- **Solution:** Verify JWT token includes admin role
- **Solution:** Restart the backend server

### ❌ Duplicate jobs after multiple seed calls
- **Solution:** Use `?clear=true` parameter to clear existing jobs first
- **Solution:** Or use duplicate checking in your frontend

---

## Job Search Testing Examples

After seeding, test various search queries:

```bash
# Search by keyword
GET /jobs-search/search?keyword=Developer

# Filter by location
GET /jobs-search/search?location=Toronto

# Filter by remote positions
GET /jobs-search/search?remote=true

# Salary range filter
GET /jobs-search/search?minSalary=100000&maxSalary=150000

# Category filter
GET /jobs-search/search?category=Technology

# Combined filters
GET /jobs-search/search?keyword=React&location=Remote&minSalary=80000

# Pagination
GET /jobs-search/search?page=1&limit=10
```

---

## API Endpoints for Testing

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|--------------|---------|
| `/admin/seed-jobs` | POST | Admin | Seed 16 test jobs |
| `/admin/seed-jobs?clear=true` | POST | Admin | Clear + seed jobs |
| `/jobs-search/search` | GET | None | Search test jobs |
| `/jobs/` | GET | None | Browse all jobs |
| `/jobs/:id` | GET | None | Get job details |
| `/applications/apply` | POST | User | Apply to job |
| `/admin/applications` | GET | Admin | View all applications |
| `/admin/jobs` | GET | Admin | Admin job management |

---

## Next Steps

After seeding jobs:
1. ✅ Create test users with different profiles
2. ✅ Test applications for multiple jobs
3. ✅ Create interviews and test AI scoring
4. ✅ Test admin dashboard analytics
5. ✅ Test real-time notifications via Socket.io
6. ✅ Run full end-to-end hiring workflow

---

## Support

For issues or questions:
- Check backend logs: `npm start` output
- Review error responses from API calls
- Verify MongoDB connection status
- Confirm admin token is valid and has correct role
