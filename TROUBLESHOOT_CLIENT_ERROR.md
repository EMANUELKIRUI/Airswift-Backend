# 📍 Troubleshooting Guide: Client-Side Exception Error

## The Error You're Seeing
```
"Application error: a client-side exception has occurred 
(see the browser console for more information)"
```

**What this means**: Your React/Next.js frontend caught an unhandled JavaScript error.

---

## 🚀 Quick Diagnostic Steps (2 minutes)

### Step 1: Open Browser Developer Tools
- **PC**: `F12` or `Ctrl+Shift+J`  
- **Mac**: `Cmd+Option+J`

### Step 2: Go to Console Tab
- Look for **red ❌ errors**
- Look for **yellow ⚠️ warnings**  
- **Copy the full error message**

### Step 3: Check Network Tab
- Go to **Network** tab
- Try to submit the application again
- Look for failed requests (red text)
- Click on `/api/applications/apply` request
- Check the **Response** tab

---

## 🔍 Most Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'map' of undefined` | jobs not an array | Use safe array check: `(Array.isArray(jobs) ? jobs : [])` |
| `Cannot read property 'files' of undefined` | Files object missing | Check files exist before submit |
| `FormData is not defined` | Using FormData wrong | Must use for file uploads: `new FormData()` |
| `Unexpected token < in JSON` | API returned HTML | Backend down or wrong endpoint |
| `401 Unauthorized` | No/expired auth token | Check localStorage has token |
| `413 Payload Too Large` | Files too big | Reduce to ≤5MB each |
| `CORS policy error` | Frontend/backend mismatch | Configure CORS in backend `.env` |

---

## 🧪 Use the Interactive Tester

We've created an **interactive HTML tester** that debugs everything:

### How to Use:
1. **Download**: [application-submission-tester.html](application-submission-tester.html)
2. **Open in browser**: Double-click the file
3. **Fill in API URL**: `http://localhost:5000/api`
4. **Paste auth token**: From your login
5. **Run checks**:
   - ✅ Check Backend Connection
   - ✅ Validate Auth Token
   - ✅ Check Jobs Endpoint
6. **Fill form** and click Submit
7. **Watch the debug logs** - they show exactly what's happening

**This shows you:**
- ✅ Which step is failing
- ✅ The exact error message
- ✅ The API response
- ✅ Upload progress

---

## 🛠️ Frontend Component Fix

We've created a **safe, production-ready** application form component:

### Copy This Component:
[frontend-safe-application-form.jsx](frontend-safe-application-form.jsx)

### Key Features:
- ✅ Safe file handling (validates type & size)
- ✅ Proper FormData usage
- ✅ Comprehensive error messages
- ✅ Upload progress tracking
- ✅ Debug info display
- ✅ Error boundaries
- ✅ Retry logic

### Use in Your Frontend:
```javascript
import SafeApplicationForm from './components/SafeApplicationForm.jsx';

export default function ApplicationPage() {
  return <SafeApplicationForm />;
}
```

---

## 📋 Common Issues Checklist

### Frontend Issues:
- [ ] No files selected when submitting?
  - Add: `if (!files.cv || !files.nationalId || !files.passport) return;`

- [ ] Wrong field names being sent?
  - Must be: `cv`, `nationalId`, `passport`
  - NOT: `cv_file`, `national_id_file`, etc.

- [ ] Not using FormData for files?
  - Must use: `new FormData()` for file uploads
  - Cannot use: `JSON.stringify()` for files

- [ ] Token not being sent?
  - Add interceptor: `config.headers.Authorization = 'Bearer ' + token;`

- [ ] Console shows errors?
  - Copy full error and wrap in try-catch

### Backend Issues:
- [ ] Backend not running?
  - Run: `cd backend && npm start`
  
- [ ] `CLOUDINARY_*` not set?
  - Add to `.env`: 
    ```env
    CLOUDINARY_NAME=your_name
    CLOUDINARY_API_KEY=your_key
    CLOUDINARY_API_SECRET=your_secret
    ```
  - Restart: `npm start`

- [ ] Files too large?
  - Max 5MB per file
  - Check file sizes in form

---

## 🎯 Step-by-Step Debugging

### If You See "Cannot read property 'map' of undefined":
```javascript
// ❌ WRONG
{jobs.map(job => <option>{job.title}</option>)}

// ✅ RIGHT
{(Array.isArray(jobs) ? jobs : []).map(job => <option>{job.title}</option>)}
```

### If You See "Failed to fetch":
```bash
# Check backend is running
cd backend && npm start
# Should show: ✅ Server running on port 5000
```

### If You See "401 Unauthorized":
```javascript
// Check token exists
console.log('Token:', localStorage.getItem('token'));
// Should return: token_string_here (not null/undefined)

// Check it's being sent
console.log('Headers:', config.headers);
// Should include: Authorization: Bearer token_string_here
```

### If You See "413 Payload Too Large":
```javascript
// Check file size BEFORE uploading
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  console.error('File too large:', file.size);
}
```

---

## 🧠 Debugging Strategies

### 1. Add Console Logging
```javascript
const handleSubmit = async (e) => {
  try {
    console.log('1. Form submitted');
    console.log('2. Files:', { files });
    console.log('3. Sending to API...');
    
    const response = await api.post('/applications/apply', formData);
    
    console.log('4. Success:', response);
  } catch (error) {
    console.error('5. Error:', error);
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message);
  }
};
```

### 2. Use Network Tab
- Click **Network tab** in DevTools
- Perform action
- Look for `/api/applications/apply` request
- **Request tab**: See what you're sending
- **Response tab**: See what server returned
- **Status**: See HTTP status code

### 3. Use React DevTools
- Install "[React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)" extension
- Inspect components
- Check props/state
- Set breakpoints

### 4. Use the Tester HTML File
- Open [application-submission-tester.html](application-submission-tester.html)
- It shows every step with logging
- Upload a test PDF
- Watch the debug logs

---

## 🆘 Still Having Issues?

### Gather This Information:

1. **The exact error message from console**
   - Right-click error → Copy message

2. **Network tab response**
   - Go to Network tab
   - Filter for `/api/applications/apply`
   - Show Response tab

3. **Backend logs**
   - Run: `cd backend && npm start`
   - Copy the error output

4. **Configuration check**
   - Run: `node check-configuration.js`
   - Share the output

### Then Share:
- Screenshot of console error
- Screenshot of network response  
- Output from `check-configuration.js`
- Copy of backend logs

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [FRONTEND_FIXES_README.md](FRONTEND_FIXES_README.md) | Frontend setup & API config |
| [APPLICATION_SUBMISSION_DEBUG.md](APPLICATION_SUBMISSION_DEBUG.md) | Backend debugging |
| [CLIENT_SIDE_ERROR_DEBUG.md](CLIENT_SIDE_ERROR_DEBUG.md) | Detailed client errors |
| [QUICK_FIX.md](QUICK_FIX.md) | Quick setup guide |
| [CRASH_PREVENTION_GUIDE.md](CRASH_PREVENTION_GUIDE.md) | Prevent crashes |

---

## 🚀 Next Steps

1. **Open the tester**: [application-submission-tester.html](application-submission-tester.html)
2. **Note any errors** shown in debug logs
3. **Share errors with context**
4. **Use the safe form component**: [frontend-safe-application-form.jsx](frontend-safe-application-form.jsx)
5. **Verify backend running**: `cd backend && npm start`
6. **Check configuration**: `node check-configuration.js`

The tester will show you **exactly where** the problem is! 🎯
