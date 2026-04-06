# 🧪 Airswift Job Seeding - cURL Commands Reference

## Quick Copy-Paste Commands for Testing

### 1️⃣ Admin Login & Get Token

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@airswift.com",
    "password": "admin123"
  }'
```

**Save the token from response, then use it below:**

---

### 2️⃣ Seed 16 Test Jobs

Replace `YOUR_TOKEN_HERE` with the token from step 1:

```bash
curl -X POST http://localhost:5000/admin/seed-jobs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 16 test jobs",
  "jobs": {
    "total": 16,
    "count": 16,
    "data": [...]
  },
  "summary": {
    "categories": [...],
    "locations": 15,
    "remotePositions": 7,
    "salaryRange": {"min": 60000, "max": 200000}
  }
}
```

---

### 3️⃣ Clear Existing Jobs & Reseed

```bash
curl -X POST "http://localhost:5000/admin/seed-jobs?clear=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Search & Browse Test Jobs

### 4️⃣ Get All Jobs (Browse Homepage)

```bash
curl -X GET "http://localhost:5000/jobs/" \
  -H "Content-Type: application/json"
```

---

### 5️⃣ Search Jobs by Keyword

Search for "Developer" jobs:
```bash
curl -X GET "http://localhost:5000/jobs-search/search?keyword=Developer" \
  -H "Content-Type: application/json"
```

**Other keyword examples:**
- `?keyword=React` - React positions
- `?keyword=Python` - Python positions
- `?keyword=DevOps` - DevOps roles
- `?keyword=Designer` - Design roles

---

### 6️⃣ Filter by Location

Search for jobs in Toronto:
```bash
curl -X GET "http://localhost:5000/jobs-search/search?location=Toronto" \
  -H "Content-Type: application/json"
```

**Location examples:**
- `?location=Toronto` - Toronto jobs
- `?location=Vancouver` - Vancouver jobs
- `?location=New%20York` - New York jobs
- `?location=San%20Francisco` - San Francisco jobs

---

### 7️⃣ Filter by Remote Jobs Only

```bash
curl -X GET "http://localhost:5000/jobs-search/search?remote=true" \
  -H "Content-Type: application/json"
```

---

### 8️⃣ Filter by Salary Range

Jobs paying $90,000 - $150,000:
```bash
curl -X GET "http://localhost:5000/jobs-search/search?minSalary=90000&maxSalary=150000" \
  -H "Content-Type: application/json"
```

---

### 9️⃣ Filter by Category

Technology jobs only:
```bash
curl -X GET "http://localhost:5000/jobs-search/search?category=Technology" \
  -H "Content-Type: application/json"
```

**Categories:**
- `?category=Technology`
- `?category=Design`
- `?category=Data%20Science`
- `?category=Product`
- `?category=Business`

---

### 🔟 Complex Filters - Combine Multiple Parameters

React Developer jobs in Vancouver OR New York, remote, $100k+ salary:

```bash
curl -X GET "http://localhost:5000/jobs-search/search?keyword=React&location=Vancouver&minSalary=100000&remote=true" \
  -H "Content-Type: application/json"
```

---

### 1️⃣1️⃣ Get Specific Job Details

Get details of a specific job (replace `JOB_ID`):

```bash
curl -X GET "http://localhost:5000/jobs/JOB_ID" \
  -H "Content-Type: application/json"
```

To get a JOB_ID, first search for jobs and grab an `_id` from results.

---

## Application Testing

### 1️⃣2️⃣ Apply for a Job

As a logged-in user:

```bash
curl -X POST "http://localhost:5000/applications/apply" \
  -H "Authorization: Bearer USER_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "PASTE_JOB_ID_HERE",
    "coverLetter": "I am very interested in this position...",
    "location": "Toronto, ON"
  }'
```

---

### 1️⃣3️⃣ View My Applications

As a logged-in user:

```bash
curl -X GET "http://localhost:5000/applications/my" \
  -H "Authorization: Bearer USER_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 1️⃣4️⃣ View All Applications (Admin)

```bash
curl -X GET "http://localhost:5000/admin/applications" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Admin Dashboard Testing

### 1️⃣5️⃣ Get Dashboard Summary

```bash
curl -X GET "http://localhost:5000/dashboard/summary" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 1️⃣6️⃣ Get Application Statistics

```bash
curl -X GET "http://localhost:5000/dashboard/applications/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 1️⃣7️⃣ Get Admin Stats

```bash
curl -X GET "http://localhost:5000/admin/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Testing Checklist

After seeding jobs, verify:

- [ ] Seeds 16 test jobs successfully
- [ ] Jobs appear in job browse (GET /jobs/)
- [ ] Keyword search works (Technology, React, etc.)
- [ ] Location filter works (Toronto, Vancouver, etc.)
- [ ] Remote filter works (?remote=true)
- [ ] Salary range filters work
- [ ] Admin can view all applications
- [ ] Users can apply for jobs
- [ ] Admin dashboard shows job statistics
- [ ] Real-time updates work (Socket.io)

---

## Test User Accounts

Create these for comprehensive testing:

### Admin Account
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@test.com",
    "password": "Admin123!",
    "role": "admin"
  }'
```

### Job Seeker Accounts
```bash
# Candidate 1 - React Developer
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Developer",
    "email": "sarah@test.com",
    "password": "Sarah123!"
  }'

# Candidate 2 - Data Analyst
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Analyst",
    "email": "john@test.com",
    "password": "John123!"
  }'
```

---

## Environment Variables

Make sure these are set in `.env`:

```bash
MONGODB_URI=mongodb://localhost:27017/airswift_dev
# or
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/airswift

JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
```

---

## Troubleshooting Commands

### Check if backend is running:
```bash
curl -X GET http://localhost:5000/
```

### Check if MongoDB is accessible:
```bash
mongosh --uri "mongodb://localhost:27017/airswift_dev"
```

### View all jobs in database:
```bash
# MongoDB CLI
use airswift_dev
db.jobs.find().pretty()
db.jobs.count()
```

### Clear all jobs (dangerous - use with caution):
```bash
# MongoDB CLI
use airswift_dev
db.jobs.deleteMany({})
```

---

## Notes

- Replace `http://localhost:5000` with your actual backend URL if deployed
- Replace `YOUR_TOKEN_HERE` with actual JWT token from login
- `JOB_ID` and `USER_TOKEN_HERE` need real values from your system
- Job data persists in MongoDB after seeding
- To reseed, use `?clear=true` parameter first
