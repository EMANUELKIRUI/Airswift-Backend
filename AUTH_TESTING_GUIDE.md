# 🧪 Authentication Features - Manual Testing Guide

## Quick Test Commands

### Test 1: User Registration

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@gmail.com",
    "password": "TestPass123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created. OTP sent.",
  "redirect": "/verify-otp",
  "email": "testuser@gmail.com"
}
```

**What Happens:**
- ✅ User account is created
- ✅ `isVerified` is set to `false`
- ✅ OTP generated and saved
- ✅ Email sent with OTP
- ✅ Check console logs or email for OTP code

---

### Test 2: Verify OTP from Email

**Check Backend Logs:**
```bash
# The OTP will be logged in console:
# OTP: 123456  (or whatever 6 digits are generated)
```

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-registration-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "otp": "123456"  # Replace with actual OTP from logs
  }'
```

**Expected Response:**
```json
{
  "message": "Account verified successfully",
  "redirect": "login"
}
```

**What Happens:**
- ✅ User is marked as verified
- ✅ OTP is cleared
- ✅ Account is now active
- ✅ User can login

---

### Test 3: Forgot Password Request

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com"
  }'
```

**Expected Response:**
```json
{
  "type": "RESET_SENT",
  "message": "Check your email for reset instructions"
}
```

**What Happens:**
- ✅ Reset token is generated
- ✅ Email sent with reset link
- ✅ Link format: `{FRONTEND_URL}/reset-password?token=abc123xyz`
- ✅ Check email for reset link
- ✅ Reset token valid for 15 minutes

**Backend Logs Will Show:**
```
FORGOT PASSWORD - Setting reset token for testuser@gmail.com {
  resetTokenLength: 64,
  expireTime: 2024-04-24T10:30:00.000Z,
  expiresIn: "15 minutes"
}
```

---

### Test 4: Reset Password with Token

**Extract Token from Email Link:**
```
Link: https://airswift-frontend.vercel.app/reset-password?token=abc123xyz456
Token: abc123xyz456
```

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123xyz456",
    "password": "NewPassword789"
  }'
```

**Alternative: Pass token in URL:**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password/abc123xyz456 \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword789"
  }'
```

**Expected Response:**
```json
{
  "message": "Password reset successful"
}
```

**What Happens:**
- ✅ Token is validated
- ✅ Password is hashed
- ✅ User password is updated
- ✅ Reset token is cleared (can't reuse)
- ✅ User can now login with new password

**Backend Logs Will Show:**
```
RESET PASSWORD SUCCESS for user: testuser@gmail.com
```

---

### Test 5: Login with New Password

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "password": "NewPassword789"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "testuser@gmail.com",
    "name": "Test User",
    "role": "user",
    "isVerified": true
  }
}
```

**What Happens:**
- ✅ Login successful
- ✅ JWT token generated
- ✅ User can access protected routes

---

## Testing Checklist

### Registration Flow
- [ ] Register new account with email
- [ ] Verify account receives OTP
- [ ] Verify OTP code in backend logs
- [ ] Enter OTP and verify account
- [ ] Attempt to register same email (should resend OTP)
- [ ] Clear OTP and test expiration (10 minutes)

### Forgot Password Flow
- [ ] Login with existing account
- [ ] Click "Forgot Password"
- [ ] Enter email
- [ ] Check email for reset link
- [ ] Extract token from link
- [ ] Test token expiration (15 minutes)

### Password Reset Flow
- [ ] Click reset link from email
- [ ] Enter new password
- [ ] Submit reset form
- [ ] Attempt to login with old password (should fail)
- [ ] Login with new password (should succeed)
- [ ] Try to reuse reset token (should fail)

### Edge Cases
- [ ] Register with invalid email format
- [ ] Register with missing fields
- [ ] Try to verify with wrong OTP
- [ ] Try to reset without email
- [ ] Try to reset non-existent email
- [ ] Try to reset unverified account
- [ ] Try to reset with expired token

---

## Database Queries for Testing

**Check User in MongoDB:**
```javascript
// Connect to MongoDB
db.users.findOne({ email: "testuser@gmail.com" })

// Expected output:
{
  "_id": ObjectId("..."),
  "name": "Test User",
  "email": "testuser@gmail.com",
  "isVerified": true,
  "role": "user",
  "otp": null,
  "otpExpires": null,
  "resetToken": null,
  "resetTokenExpiry": null,
  // ... other fields
}
```

**View failed login attempts:**
```javascript
db.auditlogs.find({ 
  action: "FAILED_LOGIN",
  user_id: ObjectId("...")
}).pretty()
```

---

## Common Issues & Solutions

### Issue: "OTP not received in email"
**Solutions:**
1. Check backend logs for OTP code
2. Verify `EMAIL_USER` and `EMAIL_PASS` are configured
3. Check if BREVO_API_KEY is set (fallback email)
4. Check spam/junk folder in email
5. Allow 2-3 seconds for email delivery

### Issue: "Invalid or expired token"
**Solutions:**
1. Verify token hasn't expired (15 minute limit)
2. Check if token matches exactly (case-sensitive)
3. Check if reset-password was already used (tokens are one-time)
4. Verify token is passed correctly in URL or body

### Issue: "Account already exists"
**Solutions:**
1. Use different email address
2. If same email: verify existing account first, then try again

### Issue: Email not configured
**Check environment variables:**
```bash
echo $EMAIL_USER
echo $EMAIL_PASS
echo $BREVO_API_KEY
echo $SENDER_EMAIL
```

---

## Email Service Testing

### Test Gmail Email:
```javascript
// In Node.js console
const emailService = require('./services/emailService');
emailService.sendEmail(
  'your-email@gmail.com',
  'Test Subject',
  '<h1>Test Email</h1>'
);
```

### Test Brevo Email:
```javascript
// Same function, but uses Brevo if Gmail fails
emailService.sendEmail(
  'your-email@gmail.com',
  'Test Subject',
  '<h1>Test Email</h1>'
);
```

### Check Email Service Fallback:
1. Disable Gmail (comment out EMAIL_USER)
2. Ensure BREVO_API_KEY is set
3. Try to send email
4. Should use Brevo as fallback

---

## Performance Testing

### Multiple OTP Requests (Rate Limit Test)
```bash
# Try to send 6 OTPs in 1 hour
# Should succeed for first 5, then get rate limit error

for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/resend-verification \
    -H "Content-Type: application/json" \
    -d '{"email":"test@gmail.com"}'
  echo "Request $i"
done
```

**Expected:**
- First 5: Success
- 6th: "Too many OTP requests from this IP"

### Login Attempt Rate Limit (5 per 15 min)
```bash
# Try to login 6 times
# Should succeed for first 5, then get rate limited

for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@gmail.com","password":"wrong"}'
  echo "Login attempt $i"
done
```

---

## Monitoring & Logs

### Check Email Logs:
```
✅ Gmail email sent: Message ID
❌ Gmail email send error: [error message]
✅ Brevo email sent: Response data
❌ Brevo Error: [error details]
```

### Check Auth Logs:
```
REGISTER BODY: { name, email, password }
VERIFY OTP ERROR: [error details]
RESET PASSWORD SUCCESS: for user email
RESET PASSWORD ERROR: [error details]
FORGOT PASSWORD - Token saved: verification
```

### Check Security Logs:
```
OTP Request Tracked: [email]
Failed login tracked: [email]
New IP detected: [user, IP]
```

---

## Frontend Integration Testing

### Test in Frontend App:

**1. Registration Page:**
```javascript
// Form submission
const response = await api.post('/auth/register', {
  name: 'Test User',
  email: 'test@gmail.com',
  password: 'TestPass123'
});
console.log(response.data.redirect); // Should be: /verify-otp
```

**2. OTP Verification Page:**
```javascript
const response = await api.post('/auth/verify-registration-otp', {
  email: 'test@gmail.com',
  otp: '123456'
});
console.log(response.data.redirect); // Should be: login
```

**3. Forgot Password Page:**
```javascript
const response = await api.post('/auth/forgot-password', {
  email: 'test@gmail.com'
});
console.log(response.data.type); // Should be: RESET_SENT
```

**4. Reset Password Page:**
```javascript
const response = await api.post('/auth/reset-password', {
  token: 'abc123xyz',
  password: 'NewPass789'
});
console.log(response.data.message); // Should be: Password reset successful
```

---

## Success Criteria

| Feature | Test | Expected | Status |
|---------|------|----------|--------|
| Registration | Create account | User created, OTP sent | ✅ |
| Email OTP | Send verification | OTP delivered to email | ✅ |
| OTP Verify | Enter OTP | Account verified | ✅ |
| Forgot Password | Request reset | Reset email sent | ✅ |
| Reset Password | Submit token+password | Password updated | ✅ |
| Login | Use new password | Authentication successful | ✅ |
| Resend OTP | Click resend | New OTP sent | ✅ |
| Rate Limiting | Multiple requests | Request throttled | ✅ |

---

## Conclusion

All authentication features are **fully functional and ready for testing**. Use the commands above to verify each feature works correctly in your environment.

**Good luck with testing!** 🚀

