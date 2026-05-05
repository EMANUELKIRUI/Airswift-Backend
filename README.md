# AIRSWIFT Backend

A centralized job portal backend where admins manage jobs and users apply for Canada-based positions.

## 🚀 Deployment

**Frontend:** `https://airswift-frontend.vercel.app/`  
**Backend API:** `https://airswift-backend.onrender.com`

## Features

- **Admin-controlled job postings** for Canada immigration jobs
- **User registration and profiles** with CV upload
- **Application tracking** with status updates
- **Interview scheduling** and notifications
- **Payment integration** for interview fees and visa processing
- **Email notifications** for status updates
- **AI-Powered CV Analysis** with automated skill extraction and job matching
- **Real-time Video Interviews** with WebRTC and Socket.io
- **AI Voice Interviewer** with conversational AI and speech analysis
- **Role-Based Access Control** with admin/user isolation
- **Audit Logging System** for compliance and security
- **CV Encryption** with AES-256 for data protection
- **Autonomous Recruiter AI** for bulk application processing

## 🧠 AI Voice Interview System

A real-time conversational AI interviewer that conducts voice-based job interviews with intelligent analysis.

### Architecture
```
Frontend (Mic + Speaker)
   ↓ WebSocket / Socket.io
Backend (Node.js)
   ↓
OpenAI (text reasoning)
   ↓
AI Voice (Speech Synthesis / ElevenLabs optional)
   ↓
Stream back audio/text
```

### Socket.io Events

#### Start Interview
```javascript
socket.emit('start-voice-interview', {
  jobRole: 'Software Engineer',
  candidateName: 'John Doe'
});
```

#### Voice Response
```javascript
socket.emit('voice-response', {
  sessionId: 'voice_xxx_123',
  transcript: 'I have 5 years experience...',
  audioData: audioBlob // Optional
});
```

#### End Interview
```javascript
socket.emit('end-voice-interview', {
  sessionId: 'voice_xxx_123'
});
```

### Features
- **Conversational AI**: Natural interview flow with context awareness
- **Real-time Analysis**: Content, communication, and technical skill scoring
- **Voice Synthesis Ready**: Framework for ElevenLabs integration
- **Session Management**: Persistent interview sessions with cleanup
- **Fallback Handling**: Graceful degradation when AI services unavailable

### Demo
Run the demo: `open voice-interview-demo.html` (requires server running on port 4000)

## Tech Stack

- **Node.js** with Express
- **PostgreSQL** with Sequelize ORM
- **JWT** for authentication
- **Multer** for file uploads
- **Brevo** for emails
- **Redis** for background jobs (planned)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Configure environment variables in `.env`
5. Run database sync: `npm start` (syncs on startup)
6. Start server: `npm start`

## Secure Secrets

- Use a local `.env` file only in development.
- Do not commit `.env` to source control; it is ignored by `.gitignore`.
- In production, set environment variables through your host or secret manager.
- The app only loads `.env` automatically when `NODE_ENV !== production`.

## Environment Variables

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (e.g. `supersecretkey123`)
- `JWT_EXPIRES` (e.g. `7d`)
- `EMAIL_USER`, `EMAIL_PASS` (Gmail App Password - see setup below)
- `BREVO_API_KEY` (e.g. `xkeysib-...`)
- `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (e.g. `https://airswift-frontend.vercel.app/auth/google/callback`)
- `FRONTEND_URL` (e.g. `https://airswift-frontend.vercel.app`)
- `PORT`

## Email Configuration

### Gmail SMTP Setup

The application uses Gmail SMTP for sending emails. Follow these steps:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this 16-character password as `EMAIL_PASS`

3. **Environment Variables**:
   ```env
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

### SMTP Configuration

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // IMPORTANT: Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password, not regular password
  },
});
```

### Troubleshooting Email Issues

#### ❌ Error: "Invalid login: 535-5.7.8 Username and Password not accepted"
**Fix**: Use Gmail App Password instead of regular password

#### ❌ Error: "Connection timeout (ETIMEDOUT)"
**Fix**: Use port 465 with `secure: true`

#### ❌ Error: "connect ECONNREFUSED 127.0.0.1:587"
**Fix**: Remove any localhost SMTP config, use Gmail settings above

#### ✅ Success Indicators
- Log shows: `✅ SMTP READY`
- Log shows: `✅ Email sent to user@gmail.com`

## Default Admin Credentials

A default admin user is created on startup if it does not already exist.

The account is seeded from `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` in your backend environment.

- Email: `emanuelkirui1@gmail.com`
- Password: `Ee0795565529@`

## API Endpoints

### Auth
- `POST https://airswift-backend.onrender.com/api/auth/register` - Register new user (sends OTP)
- `POST https://airswift-backend.onrender.com/api/auth/verify-otp` - Verify email with OTP
- `POST https://airswift-backend.onrender.com/api/auth/resend-otp` - Resend OTP for registration
- `POST https://airswift-backend.onrender.com/api/auth/login` - Login user (returns JWT token)
- `POST https://airswift-backend.onrender.com/api/auth/admin-login` - Alias route for admin login (same auth flow)
- `GET https://airswift-backend.onrender.com/api/auth/me` - Get current user profile (requires JWT)
- `POST https://airswift-backend.onrender.com/api/auth/send-login-otp` - Send login OTP
- `POST https://airswift-backend.onrender.com/api/auth/verify-login-otp` - Verify login OTP
- `POST https://airswift-backend.onrender.com/api/auth/forgot-password` - Send password reset OTP
- `POST https://airswift-backend.onrender.com/api/auth/reset-password` - Reset password with OTP
- `POST https://airswift-backend.onrender.com/api/auth/refresh` - Refresh JWT token
- `POST https://airswift-backend.onrender.com/api/auth/logout` - Logout user

### Google OAuth (new)
- `GET https://airswift-backend.onrender.com/api/auth/google/url` - Get Google authorization URL
- `GET https://airswift-backend.onrender.com/api/auth/google/callback` - Redirect URI for Google OAuth code flow
- `POST https://airswift-backend.onrender.com/api/auth/google/verify-id-token` - Verify Google ID token and issue JWT

**Authentication**: Include JWT token in Authorization header: `Bearer <token>`

### Frontend Integration Notes

#### Token Management
```javascript
// After login, save token
localStorage.setItem("token", data.token);

// For API calls, include in headers
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`
};
```

#### Use full backend URL from env
```env
NEXT_PUBLIC_API_URL=https://airswift-backend.onrender.com
```

```javascript
const url = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch (err) {
  console.error("Not JSON response:", text);
  throw err;
}

// 🔥 CRITICAL: Store token after successful login
if (data.token) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

console.log(data);
```

#### User Profile
```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { user } = await response.json();
```

#### Professional UI Layout
```
Sidebar Navigation    | Main Content
- Dashboard           | Welcome message
- Profile             | User stats/cards
- Jobs                | Recent activity
- Applications        | Quick actions
- Settings            | Notifications
```

### Profile
- `GET https://airswift-backend.onrender.com/api/profile`
- `PUT https://airswift-backend.onrender.com/api/profile`
- `POST https://airswift-backend.onrender.com/api/profile/upload-cv`

### Jobs
- `GET https://airswift-backend.onrender.com/api/jobs`
- `GET https://airswift-backend.onrender.com/api/jobs/:id`
- `POST https://airswift-backend.onrender.com/api/admin/jobs` (admin)
- `PUT https://airswift-backend.onrender.com/api/admin/jobs/:id` (admin)
- `DELETE https://airswift-backend.onrender.com/api/admin/jobs/:id` (admin)

### Applications
- `POST https://airswift-backend.onrender.com/api/applications/apply`
- `GET https://airswift-backend.onrender.com/api/applications/my`
- `GET https://airswift-backend.onrender.com/api/admin/applications` (admin)
- `PUT https://airswift-backend.onrender.com/api/admin/applications/:id/status` (admin)

### Interviews
- `POST https://airswift-backend.onrender.com/api/admin/interviews/schedule` (admin)
- `GET https://airswift-backend.onrender.com/api/interviews/my`

### Payments
- `POST https://airswift-backend.onrender.com/api/payment/initiate`
- `POST https://airswift-backend.onrender.com/api/payment/verify`

## Frontend Components

### OTP Input Component

A reusable React component for OTP input with auto-focus, paste support, and keyboard navigation.

```jsx
import { useRef, useState } from "react";

export default function OTPInput({ onChange }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }

    onChange(newOtp.join(""));
  };

  const handleKeyDown = (e, index) => {
    // Move back on delete
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(paste)) return;

    const newOtp = paste.split("");
    setOtp(newOtp);

    newOtp.forEach((digit, i) => {
      if (inputs.current[i]) {
        inputs.current[i].value = digit;
      }
    });

    onChange(paste);
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          maxLength="1"
          ref={(el) => (inputs.current[index] = el)}
          className="w-12 h-12 text-center text-xl border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={digit}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </div>
  );
}
```

#### Usage in Your Page

Replace your old input with:

```jsx
const [otp, setOtp] = useState("");

<OTPInput onChange={setOtp} />
```

#### Extra UX Improvements

1. **Auto-focus first box**:
   ```jsx
   useEffect(() => {
     inputs.current[0]?.focus();
   }, []);
   ```

2. **Disable verify button until OTP complete**:
   ```jsx
   <button disabled={otp.length !== 6}>
     Verify OTP
   </button>
   ```

3. **Add loading + success feedback**:
   ```jsx
   {loading && <p>Verifying...</p>}
   {message && <p>{message}</p>}
   ```

## Workflows

### Job Seeker
1. Register and complete profile with CV
2. Browse active jobs
3. Apply for jobs
4. Get shortlisted and pay interview fee (3)
5. Attend interview
6. Get hired and pay visa fee (30,000 KSH)

### Admin
1. Create job postings with expiry dates
2. Review applications
3. Schedule interviews (triggers notifications)
4. Update application statuses

## Background Jobs (Planned)

- Auto-close expired jobs
- Send interview reminders
- Asynchronous email sending

## Deployment

- Backend: AWS EC2 / Render
- Database: AWS RDS PostgreSQL
- Storage: AWS S3 for files

## Security

- JWT authentication
- Password hashing
- Rate limiting
- Input validation
- File type restrictions (PDF only)