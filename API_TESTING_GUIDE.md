# API Testing Guide: Profile Persistence

## Prerequisites
- Backend server running on `http://localhost:5000`
- User must be registered and verified

---

## Step-by-Step Testing Guide

### 1. Login & Get Auth Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Save the token for next steps:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Current Profile

**Request:**
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "phone": null,
  "location": null,
  "skills": [],
  "education": null,
  "experience": null,
  "profilePicture": null,
  "cv": null
}
```

---

### 3. Update Profile (Data Now Persists!)

**Request:**
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "phone": "+1234567890",
    "location": "New York, NY",
    "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
    "education": "Bachelor of Science in Computer Science",
    "experience": "5 years as Full Stack Developer"
  }'
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "name": "John Doe Updated",
    "email": "user@example.com",
    "phone": "+1234567890",
    "location": "New York, NY",
    "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
    "education": "Bachelor of Science in Computer Science",
    "experience": "5 years as Full Stack Developer",
    "profilePicture": null,
    "cv": null
  }
}
```

---

### 4. Verify Profile Was Saved

**Request:**
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (same as step 3):**
```json
{
  "name": "John Doe Updated",
  "email": "user@example.com",
  "phone": "+1234567890",
  "location": "New York, NY",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "education": "Bachelor of Science in Computer Science",
  "experience": "5 years as Full Stack Developer",
  "profilePicture": null,
  "cv": null
}
```

---

### 5. Logout

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011"
  }'
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### 6. Login Again (New Token)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Update Token:**
```bash
TOKEN="new_token_here"
```

---

### 7. Get Profile Again (✅ Data Persisted!)

**Request:**
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (DATA PERSISTED!):**
```json
{
  "name": "John Doe Updated",
  "email": "user@example.com",
  "phone": "+1234567890",
  "location": "New York, NY",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "education": "Bachelor of Science in Computer Science",
  "experience": "5 years as Full Stack Developer",
  "profilePicture": null,
  "cv": null
}
```

✅ **SUCCESS! Profile data persisted after logout/login!**

---

## Partial Profile Updates

You can update individual fields without affecting others:

### Update Only Phone
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9876543210"
  }'
```

**Result:** Only phone changed, other fields preserved ✅

### Update Only Skills
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["Python", "Django", "PostgreSQL", "React"]
  }'
```

**Result:** Skills updated, phone preserved ✅

---

## Upload CV

### Upload CV File
```bash
curl -X POST http://localhost:5000/api/profile/upload-cv \
  -H "Authorization: Bearer $TOKEN" \
  -F "cv=@/path/to/resume.pdf"
```

**Response:**
```json
{
  "message": "CV uploaded successfully",
  "cv_url": "https://res.cloudinary.com/...",
  "profile": {
    "name": "John Doe Updated",
    "email": "user@example.com",
    "phone": "+1234567890",
    "location": "New York, NY",
    "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
    "education": "Bachelor of Science in Computer Science",
    "experience": "5 years as Full Stack Developer",
    "cv": "https://res.cloudinary.com/..."
  }
}
```

---

## Admin: Update User Profile

### Get All Users
```bash
curl -X GET http://localhost:5000/api/admin/users?page=1&limit=10 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get Specific User
```bash
curl -X GET http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin Update User Profile
```bash
curl -X PUT http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "+1111111111",
    "location": "Los Angeles, CA",
    "skills": ["Python", "Java", "AWS"]
  }'
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Jane Doe",
    "email": "user@example.com",
    "phone": "+1111111111",
    "location": "Los Angeles, CA",
    "skills": ["Python", "Java", "AWS"]
  }
}
```

---

## Admin: Deactivate/Activate User

### Deactivate User Account
```bash
curl -X PATCH http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Requested by user"
  }'
```

### Activate User Account
```bash
curl -X PATCH http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Admin: Change User Role

### Change User to Admin
```bash
curl -X PATCH http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

### Change User to Recruiter
```bash
curl -X PATCH http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "recruiter"
  }'
```

---

## Error Responses

### Missing Authorization Header
```bash
curl -X GET http://localhost:5000/api/profile
```

**Response:**
```json
{
  "message": "Not authenticated"
}
```

### Invalid Token
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer invalid_token"
```

**Response:**
```json
{
  "message": "Invalid token"
}
```

### User Not Found
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Response (if user deleted):**
```json
{
  "message": "User not found"
}
```

---

## Validation Errors

### Invalid Skills Format
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": "JavaScript, React"  # Should be array!
  }'
```

**Response:**
```json
{
  "message": "\"skills\" must be an array"
}
```

---

## Testing in Postman

1. **Import Collection:** Copy any curl command above
2. **Set Variables:** 
   - `base_url`: http://localhost:5000
   - `token`: Your JWT token
3. **Run Tests:** Execute requests in sequence

---

## Performance Testing

### Load Test: Multiple Profile Updates
```bash
for i in {1..100}; do
  curl -X PUT http://localhost:5000/api/profile \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"phone\": \"+123456789$i\"}" &
done
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token is valid and not expired |
| 404 Not Found | User doesn't exist or wrong ID |
| 500 Server Error | Check server logs, database connection |
| Data not persisted | Verify database is connected |
| Partial update broken | Ensure you're sending only fields to update |

---

## Database Verification

### MongoDB Query
```javascript
db.users.findOne({ email: "user@example.com" })
```

### SQL Query
```sql
SELECT * FROM Users WHERE email = 'user@example.com';
```

**Both should return updated profile data!**

---

## Complete Test Script

```bash
#!/bin/bash

TOKEN=""
USER_EMAIL="testuser@example.com"
USER_PASSWORD="test123"
BASE_URL="http://localhost:5000"

# 1. Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

# 2. Get initial profile
echo -e "\n2. Getting current profile..."
curl -s -X GET $BASE_URL/api/profile \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Update profile
echo -e "\n3. Updating profile..."
curl -s -X PUT $BASE_URL/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "location": "NYC",
    "skills": ["JavaScript", "React"]
  }' | jq .

# 4. Logout
echo -e "\n4. Logging out..."
curl -s -X POST $BASE_URL/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"any_id\"}" | jq .

# 5. Login again
echo -e "\n5. Logging in again..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "New Token: $TOKEN"

# 6. Get profile (should be persisted!)
echo -e "\n6. Verifying data persisted..."
curl -s -X GET $BASE_URL/api/profile \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ TEST COMPLETE - Data should show phone, location, and skills!"
```

Save as `test_profile_persistence.sh` and run:
```bash
chmod +x test_profile_persistence.sh
./test_profile_persistence.sh
```

