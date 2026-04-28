# Backend API Documentation

## Authentication

### Login
**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": "userId",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### Get Current User
**GET** `/api/auth/me`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "_id": "userId",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Dashboard

### Get Full Dashboard Data
**GET** `/api/dashboard`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Dashboard data retrieved successfully",
  "stats": {
    "submitted": 3,
    "pending": 1,
    "approved": 2,
    "rejected": 0,
    "interviews": 2
  },
  "documents": [
    {
      "_id": "docId",
      "userId": "userId",
      "type": "passport",
      "fileUrl": "url/to/file",
      "status": "approved",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "reviewedAt": "2024-01-02T00:00:00Z"
    }
  ],
  "interviews": [
    {
      "id": 1,
      "type": "video",
      "status": "scheduled",
      "scheduled_at": "2024-01-15T10:00:00Z"
    }
  ],
  "notifications": [
    {
      "_id": "notifId",
      "title": "Document Approved",
      "message": "Your passport document has been approved",
      "type": "document",
      "is_read": false,
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ],
  "activities": [
    {
      "_id": "activityId",
      "userId": "userId",
      "action": "document_approved",
      "description": "Approved passport document",
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### Get Dashboard Summary
**GET** `/api/dashboard/summary`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Dashboard summary retrieved successfully",
  "summary": {
    "totalDocuments": 5,
    "approvedDocuments": 2,
    "pendingDocuments": 1,
    "rejectedDocuments": 0,
    "unreadNotifications": 3,
    "recentActivities": 10
  }
}
```

### Get User Profile
**GET** `/api/dashboard/profile`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "User profile retrieved successfully",
  "user": {
    "_id": "userId",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user",
    "profilePicture": "url/to/pic",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Documents

### Upload Document
**POST** `/api/documents/upload`

Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form Data:
```
file: <binary file>
type: "passport" | "cv" | "certificate" | "cover_letter" | "photo"
```

Response:
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "_id": "docId",
    "userId": "userId",
    "type": "passport",
    "fileUrl": "url/to/file",
    "fileName": "passport.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "status": "pending",
    "uploadedAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get User's Documents
**GET** `/api/documents`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Documents retrieved successfully",
  "documents": [
    {
      "_id": "docId",
      "userId": "userId",
      "type": "passport",
      "fileUrl": "url/to/file",
      "status": "approved",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "reviewedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### Get Single Document
**GET** `/api/documents/:id`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Document retrieved successfully",
  "document": {
    "_id": "docId",
    "userId": "userId",
    "type": "passport",
    "fileUrl": "url/to/file",
    "fileSize": 1024000,
    "status": "approved",
    "uploadedAt": "2024-01-01T00:00:00Z",
    "reviewedAt": "2024-01-02T00:00:00Z",
    "reviewedBy": "adminId"
  }
}
```

### Delete Document
**DELETE** `/api/documents/:id`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Document deleted successfully"
}
```

### Review Document (Admin)
**PUT** `/api/documents/:id/review`

Headers:
```
Authorization: Bearer <token>
```

Request:
```json
{
  "status": "approved" | "rejected",
  "rejectionReason": "Blurry image" // Only if rejected
}
```

Response:
```json
{
  "message": "Document approved successfully",
  "document": {
    "_id": "docId",
    "userId": "userId",
    "type": "passport",
    "fileUrl": "url/to/file",
    "status": "approved",
    "reviewedAt": "2024-01-02T00:00:00Z",
    "reviewedBy": "adminId"
  }
}
```

### Get All Documents (Admin)
**GET** `/api/documents/admin/all`

Headers:
```
Authorization: Bearer <token>
```

Query Parameters:
```
?status=pending|approved|rejected
&type=passport|cv|certificate|cover_letter|photo
&userId=userId
```

Response:
```json
{
  "message": "All documents retrieved successfully",
  "total": 25,
  "documents": [
    {
      "_id": "docId",
      "userId": {
        "_id": "userId",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "type": "passport",
      "status": "pending",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Notifications

### Get Notifications
**GET** `/api/notifications`

Headers:
```
Authorization: Bearer <token>
```

Query Parameters:
```
?limit=10&skip=0&type=document|interview|system
```

Response:
```json
{
  "message": "Notifications retrieved successfully",
  "notifications": [
    {
      "_id": "notifId",
      "userId": "userId",
      "title": "Document Approved",
      "message": "Your passport has been approved",
      "type": "document",
      "link": "/documents/docId",
      "is_read": false,
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ],
  "total": 15,
  "unreadCount": 3
}
```

### Mark Notification as Read
**PUT** `/api/notifications/:id`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification": {
    "_id": "notifId",
    "is_read": true
  }
}
```

### Mark All Notifications as Read
**PUT** `/api/notifications/read/all`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "modified": 5
}
```

### Get Unread Count
**GET** `/api/notifications/unread-count`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Unread count retrieved successfully",
  "unreadCount": 3
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid document type"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "message": "Document not found"
}
```

### 500 Server Error
```json
{
  "message": "Error uploading document",
  "error": "Error details"
}
```

---

## Real-Time Features (Socket.io)

### Document Upload Notification
When a user uploads a document, admins receive:
```json
{
  "title": "New Document Upload",
  "message": "John Doe uploaded a new passport document",
  "type": "document"
}
```

### Document Review Notification
When an admin reviews a document, the user receives:
```json
{
  "title": "Document Approved",
  "message": "Your passport document has been approved",
  "type": "document"
}
```

Or if rejected:
```json
{
  "title": "Document Rejected",
  "message": "Your passport document was rejected: Blurry image",
  "type": "document"
}
```

---

## Database Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  role: "user" | "admin" | "recruiter",
  createdAt: Date
}
```

### Document
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: "passport" | "cv" | "certificate" | "cover_letter" | "photo",
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  status: "missing" | "uploaded" | "pending" | "approved" | "rejected",
  rejectionReason: String,
  uploadedAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Interview
```javascript
{
  id: Integer,
  type: "video" | "voice_ai" | "in_person",
  status: "scheduled" | "completed" | "cancelled",
  scheduled_at: Date,
  location: String,
  meeting_link: String
}
```

### Notification
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  message: String,
  type: "document" | "interview" | "system",
  link: String,
  is_read: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### ActivityLog
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  action: "uploaded_document" | "document_approved" | "document_rejected" | "interview_scheduled" | "interview_completed" | "application_submitted" | "application_approved" | "application_rejected",
  description: String,
  metadata: Object,
  createdAt: Date
}
```
