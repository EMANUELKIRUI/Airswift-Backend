# 🔍 Client-Side Exception Error - Debugging Guide

## Problem
"Application error: a client-side exception has occurred (see the browser console for more information)"

This is a **Next.js or React error boundary** catching an unhandled exception in your frontend.

---

## 🧭 Step 1: Find the Real Error - Check Browser Console

### How to Open Browser Console:
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari**: Enable in Preferences → Advanced, then press `Cmd+Option+I`

### What to Look For:
1. **Go to Console tab**
2. **Look for red ❌ errors** - These are the real issue
3. **Look for yellow ⚠️ warnings** - These might be related
4. **Copy the full error message**

### Common Client-Side Errors:

#### ❌ Error: "Cannot read property 'map' of undefined"
```javascript
// ❌ WRONG - jobs might not be an array
{jobs.map(job => <option>{job.title}</option>)}

// ✅ FIX - Use safe array check
{(Array.isArray(jobs) ? jobs : []).map(job => <option>{job.title}</option>)}
```

**Solution**: See [frontend-safe-application-form.jsx](frontend-safe-application-form.jsx)

---

#### ❌ Error: "Cannot read property 'files' of undefined"
```javascript
// ❌ WRONG - req.files might not exist
const file = req.files.cv[0];

// ✅ FIX - Check if exists first
const file = req.files?.cv?.[0];
if (!file) {
  setError('CV file is required');
  return;
}
```

**Solution**: Use optional chaining (`?.`)

---

#### ❌ Error: "FormData is not defined"
```javascript
// ❌ WRONG - FormData not imported/available
const formData = new FormData();

// ✅ FIX - For file uploads, use FormData
const formData = new FormData();
formData.append('cv', fileInput.files[0]);
formData.append('nationalId', fileInput.files[0]);
formData.append('passport', fileInput.files[0]);
```

---

#### ❌ Error: "Unexpected token < in JSON at position 0"
**Cause**: API returned HTML instead of JSON (server error page)

**Solution**: 
1. Check if backend server is running
2. Verify API endpoint is correct
3. Check backend logs for errors

```bash
# Check backend
cd backend && npm start
# Should see "✅ Server running on port 5000"
```

---

#### ❌ Error: "CORS policy: ..."
**Cause**: Frontend and backend on different domains, CORS not configured

**Solution**: Verify in `.env`:
```env
FRONTEND_URL=http://localhost:3000  # Your frontend URL
CORS_CREDENTIALS=true
```

---

#### ❌ Error: "401 Unauthorized"
**Cause**: Authentication token missing or expired

**Solution**:
1. Open DevTools → Application tab
2. Check Local Storage for `token` key
3. If empty, user needs to log in
4. If exists, verify it's being sent in requests

```javascript
// ✅ This should be in your API configuration
const token = localStorage.getItem('token');
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

---

#### ❌ Error: "Uncaught Error: Files must be arrays or objects with an async iterator"
**Cause**: FileList or files not handled correctly

**Solution**:
```javascript
// ❌ WRONG
const files = document.getElementById('cv').files;

// ✅ FIX - Get first file from FileList
const file = document.getElementById('cv').files[0];
if (!file) {
  setError('No file selected');
  return;
}
```

---

## Step 2: Common Application Submission Issues

### Issue 1: No Files Selected
```javascript
// ✅ FIX - Check files exist before submitting
if (!files.cv || !files.nationalId || !files.passport) {
  setError('All three documents are required');
  return;
}
```

### Issue 2: Wrong Field Names
**Backend expects**: `cv`, `nationalId`, `passport`
**Frontend sending**: Different names

```javascript
// ✅ FIX - Use exact field names
const formData = new FormData();
formData.append('cv', files.cv);              // ✅ Correct
formData.append('national_id_file', files.nationalId);  // ❌ Wrong!
formData.append('passport', files.passport);   // ✅ Correct
```

### Issue 3: Not Using FormData for Files
```javascript
// ❌ WRONG - Can't send files as JSON
const data = {
  cv: files.cv,
  nationalId: files.nationalId,
};
api.post('/applications/apply', data);

// ✅ FIX - Use FormData for file uploads
const formData = new FormData();
formData.append('cv', files.cv);
formData.append('nationalId', files.nationalId);
api.post('/applications/apply', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Issue 4: Files Too Large
```javascript
// ✅ FIX - Validate file size before uploading
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  setError(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  return;
}
```

### Issue 5: Wrong File Format
```javascript
// ✅ FIX - Only accept PDF files
if (file.type !== 'application/pdf') {
  setError('Only PDF files are accepted');
  return;
}
```

---

## Step 3: Debug with Logging

Copy this to your application form component:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    console.log('🚀 Form submission started');
    console.log('Form data:', {
      jobId: formData.jobId,
      phone: formData.phone,
      file_cv: files.cv?.name,
      file_nationalId: files.nationalId?.name,
      file_passport: files.passport?.name,
    });

    // Validate
    if (!files.cv) throw new Error('CV file missing');
    if (!files.nationalId) throw new Error('National ID file missing');
    if (!files.passport) throw new Error('Passport file missing');

    console.log('✅ Files validated');

    // Prepare FormData
    const formData = new FormData();
    formData.append('cv', files.cv);
    formData.append('nationalId', files.nationalId);
    formData.append('passport', files.passport);
    formData.append('job_id', formData.jobId);
    formData.append('phone', formData.phone);
    formData.append('national_id', formData.nationalId);

    console.log('✅ FormData prepared');
    console.log('📤 Sending to /api/applications/apply');

    const response = await api.post('/applications/apply', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    console.log('✅ Success:', response.data);
    alert('Application submitted!');

  } catch (error) {
    console.error('❌ Error:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Full error:', error);
    
    setError(error.response?.data?.message || error.message);
  }
};
```

---

## Step 4: Network Debugging

### Check API Requests:
1. **Open DevTools → Network tab**
2. **Attempt to submit the form**
3. **Look for request to `/api/applications/apply`**
4. **Check the Response:**

```javascript
// ✅ Success (201 Created)
{
  "id": 1,
  "job_id": 1,
  "user_id": 1,
  "status": "submitted",
  "created_at": "2026-04-11T10:00:00Z"
}

// ❌ Error (400 Bad Request)
{
  "message": "CV, National ID, and Passport files are required"
}

// ❌ Error (401 Unauthorized)
{
  "message": "Invalid or expired token"
}

// ❌ Error (413 Payload Too Large)
{
  "message": "File too large. Maximum file size is 5MB."
}
```

---

## Step 5: Solutions by Error Type

### If you see "Cannot read property 'map'"
→ Use [frontend-safe-application-form.jsx](frontend-safe-application-form.jsx)

### If you see "401 Unauthorized"
→ Check [FRONTEND_FIXES_README.md](FRONTEND_FIXES_README.md) - Axios Interceptor section

### If you see "413 Payload Too Large"
→ Check file sizes ≤ 5MB each

### If you see network error
→ Verify backend is running on correct port

### If you see "CORS policy"
→ Check backend `.env` has correct FRONTEND_URL

---

## 📋 Checklist for Frontend

- [ ] Browser console shows no red ❌ errors
- [ ] Network tab shows successful POST to `/api/applications/apply` (201 status)
- [ ] response has application ID
- [ ] FormData is used for file uploads
- [ ] Authorization header includes Bearer token
- [ ] File validation happens before submit
  - [ ] Files are PDFs
  - [ ] Files are ≤ 5MB each
  - [ ] All three files selected
- [ ] Error handling is in place (try-catch)
- [ ] User sees clear error messages

---

## 🔧 Use This Safe Component

Copy [frontend-safe-application-form.jsx](frontend-safe-application-form.jsx) to your frontend:

```bash
# Copy the safe component
cp frontend-safe-application-form.jsx \
  /path/to/your-frontend/src/components/ApplicationForm.jsx
```

Then use it:
```javascript
import ApplicationForm from './components/ApplicationForm';

export default function ApplicationPage() {
  return <ApplicationForm />;
}
```

---

## 🆘 Still Having Issues?

1. **Check browser console** - What's the exact error message?
2. **Share the error** - Include:
   - The exact error message from console
   - The Network tab response
   - The backend logs output
3. **Verify config**:
   ```bash
   node check-configuration.js
   ```

---

## 📚 Related Guides

- [FRONTEND_FIXES_README.md](FRONTEND_FIXES_README.md) - Frontend fixes
- [APPLICATION_SUBMISSION_DEBUG.md](APPLICATION_SUBMISSION_DEBUG.md) - Backend debugging
- [QUICK_FIX.md](QUICK_FIX.md) - Quick setup guide
- [CRASH_PREVENTION_GUIDE.md](CRASH_PREVENTION_GUIDE.md) - Prevent crashes
