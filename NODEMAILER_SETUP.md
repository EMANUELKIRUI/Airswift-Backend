# Nodemailer Gmail SMTP Setup Guide

## 📧 Step 1: Set Up Gmail App Password

### 1.1 Enable 2-Factor Authentication (Required)
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **"Security"** in the left sidebar
3. Scroll to **"How you sign in to Google"**
4. Click **"2-Step Verification"**
5. Follow the on-screen instructions to set it up

### 1.2 Generate App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select:
   - **App**: Mail
   - **Device**: Windows PC (or your device)
3. Click **"Generate"**
4. **Copy the 16-character password** (you'll use this)
5. Gmail will show: `xxxx xxxx xxxx xxxx` - remove the spaces when using it

---

## 🔧 Step 2: Update .env File

### Location: `/backend/.env`

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://talex_user_db:iNI0bLFkCgBHeRou@talex.1z5lyom.mongodb.net/talex?retryWrites=true&w=majority&appName=Talex

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxxxxxxxxxx
```

**Replace with your credentials:**
- `EMAIL_USER`: Your Gmail address (e.g., `airswift-noreply@gmail.com`)
- `EMAIL_PASS`: The 16-character App Password (without spaces)

### Example:
```env
EMAIL_USER=airswift-noreply@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

---

## ✅ Step 3: Verify Configuration

### Test Email Service
Run this command to verify the email setup:

```bash
node -e "require('./services/emailService').verifyTransporter().then(r => console.log(r ? '✅ Email ready' : '❌ Email failed'))"
```

**Expected Output:**
```
✅ Email service is ready
```

---

## 📤 Step 4: Test Sending Email

### Via API
```bash
curl -X POST http://localhost:5000/api/auth/send-login-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

### Response
```json
{
  "message": "OTP sent",
  "email": "your-test-email@example.com"
}
```

---

## 🔐 Common Issues & Solutions

### Issue 1: "Authentication failed"
**Cause**: Wrong password
- ❌ Don't use your Gmail password
- ✅ Use the App Password (16 characters)
- ✅ Remove any spaces from the password

### Issue 2: "Less secure app access denied"
**Solution**: 
- Your 2FA is not properly set up
- Re-enable 2FA and generate a new App Password

### Issue 3: "Username and password not accepted"
**Solution**:
- Double-check `EMAIL_USER` matches the Gmail account
- Regenerate a new App Password

### Issue 4: Email not sending but no error
**Solution**:
- Check `.env` file exists in `/backend/`
- Restart the server: `npm start`
- Check server logs for email errors

---

## 📧 Current Implementation

### Files Modified:
- ✅ `/backend/services/emailService.js` - Updated to use Gmail SMTP
- ✅ `/backend/utils/email.js` - New email utility
- ✅ `/backend/server.js` - Added email verification on startup
- ✅ `/backend/.env` - Added email configuration

### Features Enabled:
- ✅ OTP sending via email
- ✅ Account registration emails
- ✅ Password reset emails
- ✅ Email notification system

---

## 🚀 Next Steps

1. **Update your `.env` file** with Gmail credentials
2. **Restart the server**: `npm start`
3. **Check server logs** for: `✅ Email service is ready`
4. **Test the authentication** flow with email

---

## 💡 Tips

- **For Production**: Use a dedicated Gmail account (e.g., `noreply@airswift.com`)
- **Security**: Never commit `.env` to git
- **Testing**: Check the spam/junk folder if test emails don't arrive
- **Rate Limits**: Gmail allows ~500 emails per day from standard accounts

---

For more help, check:
- [Nodemailer Docs](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
