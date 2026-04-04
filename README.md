# Airswift Backend

A centralized job portal backend where admins manage jobs and users apply for Canada-based positions.

## 🚀 Deployment

**Frontend:** `https://airswift-frontend.vercel.app/`  
**Backend API:** `https://airswift-backend-fjt3.onrender.com`

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

## Environment Variables

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (e.g. `supersecretkey123`)
- `JWT_EXPIRES` (e.g. `7d`)
- `EMAIL_USER`, `EMAIL_PASS`
- `BREVO_API_KEY` (e.g. `xkeysib-...`)
- `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (e.g. `https://airswift-frontend.vercel.app/auth/google/callback`)
- `FRONTEND_URL` (e.g. `https://airswift-frontend.vercel.app`)
- `PORT`

## Default Admin Credentials

A default admin user is created on startup if it does not already exist:

- Email: `emanuelkirui1@gmail.com`
- Password: `Ee0795565529@`

## API Endpoints

### Auth
- `POST https://airswift-backend-fjt3.onrender.com/api/auth/register` - Register new user (sends OTP)
- `POST https://airswift-backend-fjt3.onrender.com/api/auth/verify-otp` - Verify email with OTP
- `POST https://airswift-backend-fjt3.onrender.com/api/auth/login` - Login user (returns JWT token)
- `POST https://airswift-backend-fjt3.onrender.com/api/auth/resend-otp` - Resend OTP
- `GET https://airswift-backend-fjt3.onrender.com/api/auth/dashboard` - Protected route example (requires JWT token)

### Google OAuth (new)
- `GET https://airswift-backend-fjt3.onrender.com/api/auth/google/url` - Get Google authorization URL
- `GET https://airswift-backend-fjt3.onrender.com/api/auth/google/callback` - Redirect URI for Google OAuth code flow
- `POST https://airswift-backend-fjt3.onrender.com/api/auth/google/verify-id-token` - Verify Google ID token and issue JWT

**Authentication**: Include JWT token in Authorization header: `Bearer <token>`

### Profile
- `GET https://airswift-backend-fjt3.onrender.com/api/profile`
- `PUT https://airswift-backend-fjt3.onrender.com/api/profile`
- `POST https://airswift-backend-fjt3.onrender.com/api/profile/upload-cv`

### Jobs
- `GET https://airswift-backend-fjt3.onrender.com/api/jobs`
- `GET https://airswift-backend-fjt3.onrender.com/api/jobs/:id`
- `POST https://airswift-backend-fjt3.onrender.com/api/admin/jobs` (admin)
- `PUT https://airswift-backend-fjt3.onrender.com/api/admin/jobs/:id` (admin)
- `DELETE https://airswift-backend-fjt3.onrender.com/api/admin/jobs/:id` (admin)

### Applications
- `POST https://airswift-backend-fjt3.onrender.com/api/applications/apply`
- `GET https://airswift-backend-fjt3.onrender.com/api/applications/my`
- `GET https://airswift-backend-fjt3.onrender.com/api/admin/applications` (admin)
- `PUT https://airswift-backend-fjt3.onrender.com/api/admin/applications/:id/status` (admin)

### Interviews
- `POST https://airswift-backend-fjt3.onrender.com/api/admin/interviews/schedule` (admin)
- `GET https://airswift-backend-fjt3.onrender.com/api/interviews/my`

### Payments
- `POST https://airswift-backend-fjt3.onrender.com/api/payment/initiate`
- `POST https://airswift-backend-fjt3.onrender.com/api/payment/verify`

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