# Admin Applications API Documentation

Complete API reference for fetching and managing applications through admin endpoints.

## Overview

The admin applications API provides endpoints to retrieve all job applications in the system with comprehensive filtering, search, and export capabilities.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints require JWT authentication via `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### 1. Get All Applications (Mongoose)

**Endpoint**: `GET /applications/mongo/admin`

**Authorization Required**: Yes (admin role)

**Description**: Retrieves all job applications with user and job details populated (Mongoose-based).

**Request**:
```http
GET /api/applications/mongo/admin
Authorization: Bearer eyJhbGc...
```

**Response** (200 OK):
```json
{
  "applications": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "jobId": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Software Engineer",
        "description": "Looking for experienced software engineer"
      },
      "applicantName": "John Doe",
      "applicantEmail": "john@example.com",
      "applicantPhone": "+1234567890",
      "resumeUrl": "https://storage.example.com/resumes/john_doe.pdf",
      "coverLetterUrl": "https://storage.example.com/letters/john_doe.pdf",
      "status": "pending",
      "appliedAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "userId": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "jobId": {
        "_id": "507f1f77bcf86cd799439016",
        "title": "Product Manager"
      },
      "applicantName": "Jane Smith",
      "applicantEmail": "jane@example.com",
      "applicantPhone": "+1987654321",
      "status": "shortlisted",
      "appliedAt": "2024-01-14T15:45:00Z",
      "updatedAt": "2024-01-14T16:30:00Z"
    }
  ]
}
```

**Status Codes**:
- `200 OK` - Applications retrieved successfully
- `401 Unauthorized` - Not authenticated or token invalid
- `403 Forbidden` - Authenticated but not admin role
- `500 Internal Server Error` - Server error

**Error Response** (401):
```json
{
  "message": "Unauthorized - Please login",
  "status": 401
}
```

**Error Response** (403):
```json
{
  "message": "Access denied - Admin role required",
  "status": 403
}
```

---

### 2. Get All Applications (Fallback)

**Endpoint**: `GET /applications`

**Authorization Required**: Yes (admin role)

**Description**: Alternative endpoint for retrieving applications. Used as fallback if `/applications/mongo/admin` returns 404.

**Request**:
```http
GET /api/applications
Authorization: Bearer eyJhbGc...
```

**Response** (200 OK):
```json
{
  "applications": [
    {
      "id": 1,
      "user_id": 5,
      "job_id": 10,
      "applicant_name": "John Doe",
      "applicant_email": "john@example.com",
      "applicant_phone": "+1234567890",
      "resume_url": "https://storage.example.com/resumes/john_doe.pdf",
      "status": "pending",
      "applied_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Application Status Values

Valid status values for applications:

| Status | Description |
|--------|-------------|
| `pending` | Application received, awaiting review |
| `shortlisted` | Applicant selected for next round |
| `interview` | Applicant scheduled for interview |
| `hired` | Applicant hired for the position |
| `rejected` | Application rejected |

---

## Application Object Structure

### Mongoose Application (Full Structure)

```json
{
  "_id": "ObjectId",           // MongoDB auto-generated ID
  "userId": {
    "_id": "ObjectId",         // User ID reference
    "name": "string",          // Full name
    "email": "string"          // Email address
  },
  "jobId": {
    "_id": "ObjectId",         // Job ID reference
    "title": "string",         // Job title
    "description": "string"    // Job description
  },
  "applicantName": "string",   // Applicant full name
  "applicantEmail": "string",  // Applicant email
  "applicantPhone": "string",  // Applicant phone number
  "resumeUrl": "string",       // URL to resume PDF/document
  "coverLetterUrl": "string",  // URL to cover letter (optional)
  "status": "string",          // pending|shortlisted|interview|hired|rejected
  "appliedAt": "ISO8601",      // Application submission timestamp
  "updatedAt": "ISO8601"       // Last status update timestamp
}
```

---

## Usage Examples

### JavaScript/Axios

```javascript
import api from '../api';

// Fetch all applications
async function fetchAllApplications() {
  try {
    const response = await api.get('/applications/mongo/admin');
    if (response.data && response.data.applications) {
      console.log('Applications:', response.data.applications);
      return response.data.applications;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      // Try fallback endpoint
      const fallbackResponse = await api.get('/applications');
      return fallbackResponse.data.applications;
    }
    console.error('Error fetching applications:', error);
    throw error;
  }
}

// With error handling
async function fetchApplicationsSafely() {
  try {
    const response = await api.get('/applications/mongo/admin');
    return {
      success: true,
      applications: response.data.applications || [],
      total: response.data.applications?.length || 0
    };
  } catch (error) {
    if (error.response?.status === 401) {
      // User not authenticated
      return { success: false, error: 'Please log in' };
    } else if (error.response?.status === 403) {
      // User not admin
      return { success: false, error: 'Admin access required' };
    } else {
      return { success: false, error: 'Failed to load applications' };
    }
  }
}
```

### Filtering Applications Locally

```javascript
// Filter by status
function getApplicationsByStatus(applications, status) {
  return applications.filter(app => app.status === status);
}

// Filter by job title
function getApplicationsByJob(applications, jobTitle) {
  return applications.filter(app => 
    app.jobId.title.toLowerCase().includes(jobTitle.toLowerCase())
  );
}

// Search by applicant name or email
function searchApplications(applications, searchTerm) {
  const term = searchTerm.toLowerCase();
  return applications.filter(app =>
    app.applicantName.toLowerCase().includes(term) ||
    app.applicantEmail.toLowerCase().includes(term)
  );
}

// Get status statistics
function getStatistics(applications) {
  return {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    interview: applications.filter(a => a.status === 'interview').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };
}

// Usage
async function showApplicationStats() {
  const applications = await fetchAllApplications();
  const stats = getStatistics(applications);
  console.log('Application Statistics:', stats);
}
```

### cURL Examples

```bash
# Get all applications
curl -X GET http://localhost:5000/api/applications/mongo/admin \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"

# Pretty print response
curl -X GET http://localhost:5000/api/applications/mongo/admin \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" | jq .
```

---

## Performance Considerations

### Response Times

Typical response times under normal conditions:

| Scenario | Time |
|----------|------|
| 0-100 applications | < 500ms |
| 100-500 applications | 500ms - 1s |
| 500-1000 applications | 1s - 2s |
| 1000+ applications | 2s+ |

### Optimization Tips

1. **Implement Pagination**: Only load 10-50 applications at a time
2. **Cache Results**: Cache data for 30-60 seconds to reduce API calls
3. **Lazy Load Details**: Load full details only when user expands a row
4. **Index Database**: Ensure `status`, `appliedAt`, and `jobId` are indexed

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "message": "Unauthorized - Please login",
  "status": 401,
  "code": "UNAUTHORIZED"
}
```
Solution: User must log in or token is expired. Refresh authentication.

**403 Forbidden**
```json
{
  "message": "Access denied - Admin role required",
  "status": 403,
  "code": "FORBIDDEN"
}
```
Solution: User must have admin role. Contact system administrator.

**404 Not Found**
```json
{
  "message": "Resource not found",
  "status": 404,
  "code": "NOT_FOUND"
}
```
Solution: Backend endpoint doesn't exist. Check server setup.

**500 Internal Server Error**
```json
{
  "message": "Internal server error",
  "status": 500,
  "code": "INTERNAL_ERROR"
}
```
Solution: Check server logs. Contact system administrator.

---

## Integration with AdminApplications Component

The AdminApplications React component automatically:

1. **Handles Endpoint Fallback**: Tries `/applications/mongo/admin` first, then `/applications`
2. **Manages Loading State**: Shows spinner while fetching
3. **Filters Data**: Provides search and status filtering UI
4. **Calculates Statistics**: Computes counts for each status
5. **Exports Data**: Supports CSV export of filtered applications
6. **Handles Errors**: Shows user-friendly error messages

Example integration:

```jsx
import AdminApplications from '../components/AdminApplications';

export default function AdminDashboard() {
  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      <AdminApplications />
    </div>
  );
}
```

---

## Database Queries (Reference)

### MongoDB Mongoose Query (Backend)

```javascript
// Backend controller
const applications = await Application.find()
  .populate("userId", "name email")
  .populate("jobId", "title")
  .sort({ appliedAt: -1 });

res.json({ applications });
```

### SQL Query (Legacy)

```sql
SELECT 
  a.id,
  a.applicant_name,
  a.applicant_email,
  a.applicant_phone,
  a.status,
  a.applied_at,
  u.name,
  u.email,
  j.title
FROM applications a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN jobs j ON a.job_id = j.id
ORDER BY a.applied_at DESC;
```

---

## Testing

### Manual Testing Checklist

- [ ] Endpoint accessible with valid admin token
- [ ] Returns 401 when token missing/invalid
- [ ] Returns 403 when user not admin
- [ ] All application fields populated correctly
- [ ] Job and User details are fully populated
- [ ] Handles large datasets (1000+ applications)
- [ ] Response time acceptable (< 2 seconds)
- [ ] Fallback endpoint works if primary fails

### Automated Testing

```javascript
describe('Admin Applications API', () => {
  it('should return all applications for admin', async () => {
    const response = await api.get('/applications/mongo/admin');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('applications');
    expect(Array.isArray(response.data.applications)).toBe(true);
  });

  it('should return 403 for non-admin users', async () => {
    api.defaults.headers.common['Authorization'] = 'Bearer non-admin-token';
    try {
      await api.get('/applications/mongo/admin');
    } catch (error) {
      expect(error.response.status).toBe(403);
    }
  });

  it('should return 401 without auth token', async () => {
    delete api.defaults.headers.common['Authorization'];
    try {
      await api.get('/applications/mongo/admin');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});
```

---

## Changelog

### Version 1.0 (Current)
- Initial API documentation
- Support for Mongoose-based applications endpoint
- Fallback to legacy applications endpoint
- Error handling and status codes documented
- Integration with AdminApplications component

---

## Related Resources

- [AdminApplications Component Setup](./ADMIN_FETCH_APPLICATIONS_SETUP.md)
- [Backend Routes - Applications](./backend/routes/applications.js)
- [Backend Routes - Applications Mongoose](./backend/routes/applicationMongoose.js)
- [API Client Configuration](./api.js)
- [Authentication Documentation](./IMPLEMENTATION_SUMMARY.md)

---

**Last Updated**: 2024
**API Version**: 1.0
**Component Version**: 1.0
