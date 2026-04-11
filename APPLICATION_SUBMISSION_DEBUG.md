# 🔧 Application Submission Error - Debug & Fix Guide

## Problem
Users get "Error submitting application" when trying to submit an application form.

## Root Causes Identified

### 1. ⚠️ **Cloudinary Not Configured** (CRITICAL)
The `/api/applications/apply` route uses Cloudinary for file storage but requires environment variables:

```env
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Status**: If these are missing, the multer upload middleware will fail silently.

**Fix**: Add these to your `.env` file or configure the upload middleware fallback.

---

### 2. ⚠️ **Missing "uploads" Directory**
The local multer storage (in `POST /`) expects an `uploads/` directory that may not exist.

**Error**: `ENOENT: no such file or directory, open 'uploads/'`

**Fix**: Create the directory:
```bash
mkdir -p /workspaces/Airswift-Backend/backend/uploads
chmod 755 /workspaces/Airswift-Backend/backend/uploads
```

---

### 3. ⚠️ **File Field Name Mismatch** (HIGH PRIORITY)
The form sends files with field names:
- `cv`
- `nationalId`  
- `passport`

But the controller expects them to match exactly to these names in `req.files`.

**Issue**: Browser console shows: `Error: "nationalId" field not found` or similar

**Fix**: Ensure frontend form uses exact field names:
```html
<input type="file" name="cv" accept=".pdf" required />
<input type="file" name="nationalId" accept=".pdf" required />
<input type="file" name="passport" accept=".pdf" required />
```

---

### 4. ⚠️ **Missing Authentication Token**
The backend requires Bearer token in `Authorization` header.

**Error Response**: `401 Unauthorized`

**Fix**: Ensure axios is configured with interceptor ([see FRONTEND_FIXES_README.md](FRONTEND_FIXES_README.md)):

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### 5. ⚠️ **File Size Limit Exceeded**
Maximum file size is 5MB per file in multer configuration.

**Error**: `413 Payload Too Large` or form silently fails

**Fix**: Check file sizes:
- CV ≤ 5MB
- National ID ≤ 5MB
- Passport ≤ 5MB

---

### 6. ⚠️ **CV Encryption Failure**
The controller tries to encrypt files using AES-256 encryption.

**Error**: `500 File encryption failed`

**Fix**: Verify `cvEncryption` utility exists and is properly configured:
```bash
ls -la backend/utils/cvEncryption.js
```

---

## Step-by-Step Debugging

### Step 1: Check Frontend Network Requests
1. Open browser DevTools → Network tab
2. Attempt to submit the application form
3. Look for the failed request to `/api/applications/apply`
4. Check the response status code:
   - **400**: Validation error (missing fields/files)
   - **401**: Missing/invalid authentication token
   - **413**: File too large
   - **500**: Server error

### Step 2: Check Server Logs
```bash
# In the backend directory
npm start
# Look for error messages in console output
```

### Step 3: Test Endpoint Manually
```bash
# Test if endpoint is accessible
curl -X POST http://localhost:5000/api/applications/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cv=@/path/to/cv.pdf" \
  -F "nationalId=@/path/to/id.pdf" \
  -F "passport=@/path/to/passport.pdf" \
  -F "job_id=1" \
  -F "phone=1234567890" \
  -F "national_id=ID123"
```

---

## Implementation Fixes

### Fix 1: Update Multer Configuration

**File**: [backend/middleware/upload.js](backend/middleware/upload.js)

Add error handling:
```javascript
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  onError: (err, next) => {
    console.error('Multer error:', err);
    return next(err);
  }
});

module.exports = { upload };
```

### Fix 2: Add Error Handling to Route

**File**: [backend/routes/applications.js](backend/routes/applications.js)

Add error handling middleware after upload:
```javascript
router.post('/apply', verifyToken, cloudUpload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
]), (err, req, res, next) => {
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum size is 5MB per file' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'Too many files uploaded' 
      });
    }
    return res.status(400).json({ 
      message: 'File upload error: ' + err.message 
    });
  } else if (err) {
    return res.status(400).json({ 
      message: err.message || 'File upload failed' 
    });
  }
  next();
}, applyForJob);
```

### Fix 3: Update Controller Error Handling

**File**: [backend/controllers/applicationController.js](backend/controllers/applicationController.js)

Improve error messages:
```javascript
const applyForJob = async (req, res) => {
  try {
    // Validate files exist
    if (!req.files) {
      return res.status(400).json({ 
        message: 'No files uploaded. Please provide CV, National ID, and Passport documents.' 
      });
    }

    if (!req.files?.cv?.[0]) {
      return res.status(400).json({ 
        message: 'CV file is required (PDF format, max 5MB)' 
      });
    }
    
    if (!req.files?.nationalId?.[0]) {
      return res.status(400).json({ 
        message: 'National ID file is required (PDF format, max 5MB)' 
      });
    }
    
    if (!req.files?.passport?.[0]) {
      return res.status(400).json({ 
        message: 'Passport file is required (PDF format, max 5MB)' 
      });
    }

    // Continue with existing logic...
  } catch (error) {
    console.error('Application submission error:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.id,
      timestamp: new Date()
    });
    
    res.status(500).json({ 
      message: 'Failed to submit application. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
```

### Fix 4: Add Frontend Error Display

**Example React Component**:
```javascript
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);
  setSuccess(false);

  try {
    const formData = new FormData();
    formData.append('cv', document.getElementById('cv').files[0]);
    formData.append('nationalId', document.getElementById('nationalId').files[0]);
    formData.append('passport', document.getElementById('passport').files[0]);
    formData.append('job_id', jobId);
    formData.append('phone', phone);
    formData.append('national_id', nationalId);

    const response = await api.post('/applications/apply', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    setSuccess(true);
    setTimeout(() => navigate('/dashboard'), 2000);
  } catch (err) {
    setError(
      err.response?.data?.message || 
      'Error submitting application. Please try again.'
    );
    console.error('Submission error:', err);
  } finally {
    setSubmitting(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    {error && <div className="error-message">{error}</div>}
    {success && <div className="success-message">Application submitted!</div>}
    
    <input 
      type="file" 
      id="cv" 
      name="cv" 
      accept=".pdf" 
      required 
    />
    <input 
      type="file" 
      id="nationalId" 
      name="nationalId" 
      accept=".pdf" 
      required 
    />
    <input 
      type="file" 
      id="passport" 
      name="passport" 
      accept=".pdf" 
      required 
    />
    
    <button type="submit" disabled={submitting}>
      {submitting ? 'Submitting...' : 'Submit Application'}
    </button>
  </form>
);
```

---

## Quick Fix Checklist

- [ ] Create `backend/uploads` directory: `mkdir -p backend/uploads`
- [ ] Add Cloudinary environment variables to `.env`
- [ ] Verify frontend sends Auth header: `Authorization: Bearer TOKEN`
- [ ] Check file sizes are ≤ 5MB
- [ ] Ensure files are PDF format
- [ ] Verify form field names match: `cv`, `nationalId`, `passport`
- [ ] Check backend console for detailed error messages
- [ ] Test with FormData API in frontend
- [ ] Verify no CORS issues in browser console
- [ ] Run `npm start` in backend and check logs

---

## Testing the Fix

### Test with curl:
```bash
cd backend
touch /tmp/test.pdf
curl -X POST http://localhost:5000/api/applications/apply \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -F "cv=@/tmp/test.pdf" \
  -F "nationalId=@/tmp/test.pdf" \
  -F "passport=@/tmp/test.pdf" \
  -F "job_id=1" \
  -F "phone=1234567890" \
  -F "national_id=12345"
```

### Monitor logs:
```bash
npm start 2>&1 | grep -i "error\|application\|upload"
```

---

## Support Resources

- **Frontend Fixes**: See [FRONTEND_FIXES_README.md](FRONTEND_FIXES_README.md)
- **Example Components**: 
  - [frontend-example-api.js](frontend-example-api.js) - Axios config with auth
  - [frontend-safe-dashboard.jsx](frontend-safe-dashboard.jsx) - Error handling example
- **Crash Prevention**: See [CRASH_PREVENTION_GUIDE.md](CRASH_PREVENTION_GUIDE.md)
