# Application API Endpoints - Quick Reference

## Base URL
```
http://localhost:5000/api/applications
```

---

## 📨 USER ENDPOINTS - Submit Application

### 1. Submit New Application (POST /)
**Endpoint**: `POST /api/applications`  
**Auth**: Required (Bearer Token), Permission: `apply_jobs`  
**Content-Type**: `multipart/form-data`

**Request Body**:
```json
{
  "jobId": "ObjectId or UUID of job",
  "phone": "1234567890"
}
```

**Files Required**:
- `cv` - PDF/DOC file
- `passport` - PDF/Image file
- `nationalId` - PDF/Image file

**cURL Example**:
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cv=@path/to/cv.pdf" \
  -F "passport=@path/to/passport.pdf" \
  -F "nationalId=@path/to/id.pdf" \
  -F "jobId=65abc123" \
  -F "phone=1234567890"
```

**Success Response** (201):
```json
{
  "message": "Application submitted successfully",
  "application": {
    "_id": "65def456",
    "userId": "65user123",
    "jobId": "65abc123",
    "phone": "1234567890",
    "cv": "filename.pdf",
    "passport": "filename.pdf",
    "nationalId": "filename.pdf",
    "applicationStatus": "pending",
    "createdAt": "2026-04-20T10:30:00Z",
    "updatedAt": "2026-04-20T10:30:00Z"
  }
}
```

---

### 2. Alternative Submit Route (POST /create)
**Endpoint**: `POST /api/applications/create`  
**Auth**: Required (Bearer Token), Permission: `apply_jobs`  
**Content-Type**: `multipart/form-data`  
*Same as POST / endpoint*

---

### 3. Another Alternative Route (POST /apply)
**Endpoint**: `POST /api/applications/apply`  
**Auth**: Required (Bearer Token), Permission: `apply_jobs`  
**Content-Type**: `multipart/form-data`  
*Same as POST / endpoint*

---

### 4. Get User's Own Applications (GET /my)
**Endpoint**: `GET /api/applications/my`  
**Auth**: Required (Bearer Token)

**Success Response** (200):
```json
[
  {
    "_id": "65def456",
    "userId": "65user123",
    "jobId": {
      "_id": "65abc123",
      "title": "Software Engineer"
    },
    "applicationStatus": "pending",
    "createdAt": "2026-04-20T10:30:00Z"
  }
]
```

---

### 5. Get Available Jobs for Application (GET /job-options)
**Endpoint**: `GET /api/applications/job-options`  
**Auth**: Not required  

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "total": 15,
    "jobs": {
      "Engineering": [
        {"id": "65abc123", "title": "Software Engineer"},
        {"id": "65abc124", "title": "Backend Developer"}
      ],
      "Finance": [
        {"id": "65abc125", "title": "Accountant"}
      ]
    }
  }
}
```

---

## 👨‍💼 ADMIN ENDPOINTS - Manage Applications

### 1. Get All Applications (GET /admin)
**Endpoint**: `GET /api/applications/admin`  
**Auth**: Required (Bearer Token), Permission: `view_all_applications`

**Success Response** (200):
```json
{
  "success": true,
  "count": 5,
  "applications": [
    {
      "_id": "65def456",
      "userId": {
        "_id": "65user123",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "location": "New York"
      },
      "jobId": {
        "_id": "65abc123",
        "title": "Software Engineer",
        "description": "Looking for experienced SE"
      },
      "applicationStatus": "pending",
      "cv": "cv-john-doe.pdf",
      "passport": "passport-john-doe.pdf",
      "nationalId": "id-john-doe.pdf",
      "createdAt": "2026-04-20T10:30:00Z",
      "updatedAt": "2026-04-20T10:30:00Z"
    }
  ]
}
```

---

### 2. Alternative Get All Applications (GET /admin/all)
**Endpoint**: `GET /api/applications/admin/all`  
**Auth**: Required (Bearer Token), Permission: `view_all_applications`  
*Same response as GET /admin*

---

### 3. Update Application Status (PUT /:id/status)
**Endpoint**: `PUT /api/applications/:id/status`  
**Auth**: Required (Bearer Token), Permission: `manage_applications`  
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "status": "reviewed",
  "interviewDate": "2026-05-01T10:00:00Z"
}
```

**Valid Status Values**:
- `pending` - Initial state
- `reviewed` - Admin reviewed
- `shortlisted` - Moved to shortlist
- `accepted` - Hired
- `rejected` - Rejected
- `interview` - Interview scheduled

---

### 4. Download Application Documents
**Endpoint**: `GET /api/applications/:id/download?fileType=cv`  
**Auth**: Required (Bearer Token), Permission: `view_applications`

**Query Parameters**:
- `fileType` - `cv`, `passport`, or `nationalId`

**Success Response**: Binary file download

---

### 5. Update Application Notes (PUT /admin/application/:id/notes)
**Endpoint**: `PUT /api/applications/admin/application/:id/notes`  
**Auth**: Required (Bearer Token), Permission: `manage_applications`

**Request Body**:
```json
{
  "notes": "Excellent candidate, technical skills verified"
}
```

---

### 6. Shortlist Application (PATCH /admin/:id/shortlist)
**Endpoint**: `PATCH /api/applications/admin/:id/shortlist`  
**Auth**: Required (Bearer Token), Permission: `manage_applications`

**Request Body**:
```json
{
  "status": "shortlisted"
}
```

---

## 🔍 ERROR RESPONSES

### 400 - Bad Request
```json
{
  "message": "CV is required",
  "error": "CV file is required"
}
```

### 401 - Unauthorized
```json
{
  "message": "Unauthorized",
  "error": "No token provided"
}
```

### 403 - Forbidden
```json
{
  "message": "Forbidden",
  "error": "Insufficient permissions"
}
```

### 404 - Not Found
```json
{
  "message": "Application not found"
}
```

### 500 - Server Error
```json
{
  "message": "Database error",
  "error": "Error details here"
}
```

---

## 📝 FLOW DIAGRAM

```
USER SIDE:
┌──────────────────────────────────────────┐
│ 1. User fills application form           │
│    - Job selection                       │
│    - Phone number                        │
│    - Upload CV, Passport, National ID    │
└──────────────────────────────────────────┘
                    ↓
         POST /api/applications
                    ↓
┌──────────────────────────────────────────┐
│ 2. Backend validates                     │
│    - Authentication                      │
│    - Permissions                         │
│    - Files                               │
│    - Required fields                     │
└──────────────────────────────────────────┘
                    ↓
         Create Application Record
              Save to MongoDB
                    ↓
┌──────────────────────────────────────────┐
│ 3. Return success to user                │
└──────────────────────────────────────────┘

ADMIN SIDE:
┌──────────────────────────────────────────┐
│ 1. Admin accesses application panel      │
└──────────────────────────────────────────┘
                    ↓
      GET /api/applications/admin
                    ↓
┌──────────────────────────────────────────┐
│ 2. Backend queries MongoDB               │
│    - Find all applications               │
│    - Populate user details               │
│    - Populate job details                │
│    - Sort by date (newest first)         │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ 3. Display applications in admin panel   │
│    - Applicant name, email               │
│    - Job title                           │
│    - Status                              │
│    - Submission date                     │
└──────────────────────────────────────────┘
```

---

## 🔐 REQUIRED PERMISSIONS

- `apply_jobs` - Required to submit applications
- `view_all_applications` - Required to view all applications (admin only)
- `manage_applications` - Required to update application status, notes, etc.
- `view_applications` - Required to download application documents

---

## 📦 REQUIRED MIDDLEWARE

All endpoints require:
- `protect` - JWT authentication
- `permit()` - Role-Based Access Control (RBAC)

---

## 🔗 Related Documentation

- [APPLICATION_FLOW_FIX_SUMMARY.md](./APPLICATION_FLOW_FIX_SUMMARY.md) - Detailed fix information
- [backend/models/ApplicationMongoose.js](./backend/models/ApplicationMongoose.js) - Schema definition
- [backend/config/roles.js](./backend/config/roles.js) - Permission definitions
