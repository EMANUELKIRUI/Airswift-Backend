# Airswift Platform - Complete User & Admin Flow Documentation

## Overview

Airswift is a comprehensive job portal platform designed for Canada-based immigration jobs. The platform features role-based access control with separate flows for regular users (job seekers) and administrators (recruiters/HR personnel).

## Architecture Overview

- **Frontend**: React.js application deployed on Vercel
- **Backend**: Node.js/Express API with Socket.io for real-time features
- **Database**: MongoDB for user data, PostgreSQL for structured data
- **Authentication**: JWT-based with OTP verification
- **File Storage**: Cloudinary for document uploads
- **Email Service**: Gmail SMTP for notifications
- **Real-time Features**: WebRTC video interviews, AI voice interviews

---

## 🔐 AUTHENTICATION & REGISTRATION FLOW

### User Registration Process

#### Step 1: User Registration
```
POST /api/auth/register
Body: { name, email, password }
```
- Validates required fields (name, email, password)
- Checks for existing user
- Generates 6-digit OTP
- Hashes password with bcrypt
- Stores user with `otp` and `otpExpires` (10 minutes)
- Attempts to send OTP email (safe failure - user still created)
- Returns: `{ message: "OTP sent" }` or `{ message: "User registered, but OTP email could not be delivered" }`

#### Step 2: OTP Verification
```
POST /api/auth/verify-otp
Body: { email, otp }
```
- Validates email and OTP presence
- Finds user by email
- Checks OTP validity and expiry (`user.otpExpires < Date.now()`)
- Sets `isVerified: true`
- Clears `otp` and `otpExpires` fields
- Returns: `{ message: "Account verified successfully", user: { id, email, name } }`

#### Step 3: Login Process
```
POST /api/auth/send-login-otp
Body: { email }
```
- Validates email
- Finds verified user
- Generates login OTP
- Stores in `resetToken` and `resetTokenExpiry`
- Sends OTP email (safe failure)
- Returns: `{ message: "Login OTP sent" }`

```
POST /api/auth/verify-login-otp
Body: { email, otp }
```
- Validates credentials
- Checks OTP and expiry
- Generates JWT tokens (access + refresh)
- Sets HTTP-only cookies
- Returns: `{ user: { id, name, email, role, isVerified }, accessToken }`

### Password Recovery

#### Forgot Password
```
POST /api/auth/forgot-password
Body: { email }
```
- Finds user by email
- Generates reset token
- Stores in `resetToken` and `resetTokenExpiry`
- Sends OTP email (safe failure)
- Returns: `{ message: "Reset OTP sent" }`

#### Reset Password
```
POST /api/auth/reset-password
Body: { email, otp, newPassword }
```
- Validates all fields
- Verifies OTP and expiry
- Hashes new password
- Updates password
- Clears reset token fields
- Returns: `{ message: "Password reset successful" }`

---

## 👤 USER FLOW (Job Seeker)

### Profile Management

#### Get Profile
```
GET /api/profile
Headers: Authorization Bearer token
```
- Returns user profile data

#### Update Profile
```
PUT /api/profile
Headers: Authorization Bearer token
Body: { name, email, phone, address, etc. }
```
- Updates user profile information

#### Upload CV
```
POST /api/profile/upload-cv
Headers: Authorization Bearer token
Content-Type: multipart/form-data
Body: cv (PDF file)
```
- Uploads CV to Cloudinary
- Updates user profile with CV URL

### Job Search & Application

#### Browse Jobs
```
GET /api/jobs
Query params: ?category=tech&location=toronto&page=1
```
- Returns paginated list of active jobs
- Filters by category, location, etc.

#### View Job Details
```
GET /api/jobs/:id
```
- Returns detailed job information
- Includes company details, requirements, salary

#### Apply for Job
```
POST /api/applications/apply
Headers: Authorization Bearer token
Content-Type: multipart/form-data
Body:
- cv: PDF file
- nationalId: Image file
- passport: Image file
- coverLetter: Text
- jobId: String
```
- Validates user authentication
- Checks for duplicate applications
- Uploads documents to Cloudinary
- Creates application record
- Sends notification email
- Returns: `{ message: "Application submitted successfully" }`

#### View My Applications
```
GET /api/applications/my
Headers: Authorization Bearer token
```
- Returns user's applications with status
- Includes job details, application date, status

### Interview Process

#### View My Interviews
```
GET /api/interviews/my
Headers: Authorization Bearer token
```
- Returns scheduled interviews
- Includes date, time, type, status

#### Join Video Interview (WebRTC)
```
WebSocket Events:
- join-room: { roomId, userType: 'candidate' }
- offer/answer/ice-candidate: WebRTC signaling
- screen-share-start/end: Screen sharing
```
- Real-time video/audio communication
- Screen sharing capabilities
- Interview recording (planned)

#### AI Voice Interview
```
WebSocket Events:
- start-voice-interview: { jobRole, candidateName }
- voice-response: { sessionId, transcript, audioData }
- end-voice-interview: { sessionId }
```
- Conversational AI interviewer
- Real-time speech analysis
- Automatic scoring and feedback
- Interview summary generation

#### AI CV Scoring
```
POST /api/ai/cv/score
Headers: Authorization Bearer token
Body: { cvText, jobDescription }
```
- Analyzes CV against job requirements
- Returns skill match percentage
- Provides improvement suggestions

### Payment Processing

#### Initiate Payment
```
POST /api/payment/initiate
Headers: Authorization Bearer token
Body: { amount, purpose, applicationId }
```
- Creates payment record
- Integrates with payment gateway
- Returns payment URL

#### Verify Payment
```
POST /api/payment/verify
Headers: Authorization Bearer token
Body: { transactionId, reference }
```
- Verifies payment status
- Updates application/interview status
- Sends confirmation email

### Reporting

#### Create Report
```
POST /api/reports
Headers: Authorization Bearer token
Body: { type, description, applicationId }
```
- Allows users to report issues
- Tracks user feedback

#### View My Reports
```
GET /api/reports/my-reports
Headers: Authorization Bearer token
```
- Returns user's submitted reports
- Shows status and responses

---

## 👑 ADMIN FLOW (Recruiter/HR)

### Authentication
Admins use the same authentication flow as users but have `role: "admin"` in their JWT token.

### Dashboard & Analytics

#### Admin Dashboard
```
GET /api/admin/dashboard
Headers: Authorization Bearer token (admin only)
```
- Returns system statistics
- User counts, application metrics
- Recent activities

#### System Statistics
```
GET /api/admin/stats
Headers: Authorization Bearer token (admin only)
```
- Comprehensive platform metrics
- Application conversion rates
- Interview completion rates
- Revenue analytics

### Job Management

#### Create Job Posting
```
POST /api/jobs
Headers: Authorization Bearer token (admin only)
Body: {
  title,
  description,
  requirements,
  salary,
  location,
  category,
  employmentType,
  applicationDeadline
}
```
- Creates new job posting
- Sets status to active

#### Update Job
```
PUT /api/jobs/:id
Headers: Authorization Bearer token (admin only)
Body: { ...job fields }
```
- Modifies existing job details

#### Delete Job
```
DELETE /api/jobs/:id
Headers: Authorization Bearer token (admin only)
```
- Soft deletes job posting

#### Job Categories Management
```
GET /api/jobs/categories
POST /api/jobs/categories
PUT /api/jobs/categories/:id
DELETE /api/jobs/categories/:id
```
- CRUD operations for job categories

#### Dashboard Analytics
```
GET /api/jobs/dashboard/categories
GET /api/jobs/dashboard/interview-pipeline
```
- Category-wise job distribution
- Interview pipeline metrics

### Application Management

#### View All Applications
```
GET /api/admin/applications
Headers: Authorization Bearer token (admin only)
Query params: ?status=pending&page=1&jobId=123
```
- Returns all applications with filtering
- Includes user details, documents, status

#### Update Application Status
```
PUT /api/admin/application/:id
Headers: Authorization Bearer token (admin only)
Body: { status: "shortlisted|rejected|interviewed|hired" }
```
- Updates application status
- Triggers email notifications
- Updates audit logs

#### Download CV/Documents
```
GET /api/applications/download/:applicationId/:docType
Headers: Authorization Bearer token
```
- Secure document download
- Access logging

### Interview Management

#### Schedule Interview
```
POST /api/admin/send-interview/:applicationId
Headers: Authorization Bearer token (admin only)
Body: {
  date,
  time,
  type: "video|voice|in-person",
  interviewer,
  notes
}
```
- Creates interview record
- Sends email notification to candidate
- Updates application status

#### View All Interviews
```
GET /api/interviews/admin
Headers: Authorization Bearer token (admin only)
```
- Returns all scheduled interviews
- Filter by status, date, interviewer

#### Update Interview
```
PUT /api/interviews/:id
Headers: Authorization Bearer token (admin only)
Body: { status, feedback, score }
```
- Updates interview details
- Records interviewer feedback

#### Generate Offer Letter
```
POST /api/admin/generate-offer/:applicationId
Headers: Authorization Bearer token (admin only)
Body: { salary, startDate, conditions }
```
- Creates offer letter
- Sends to candidate
- Updates application status

### AI-Powered Features

#### Autonomous Recruiter
```
POST /api/ai/recruiter-agent
Headers: Authorization Bearer token (admin only)
Body: { jobId, criteria, batchSize }
```
- AI-powered bulk application processing
- Automated shortlisting
- Intelligent candidate ranking

#### CV Analysis
```
POST /api/interviews/cv/score
Headers: Authorization Bearer token
Body: { cvContent, jobRequirements }
```
- AI-powered CV scoring
- Skill extraction and matching
- Automated candidate evaluation

### Settings Management

#### System Settings
```
GET /api/admin/settings
POST /api/admin/settings
PUT /api/admin/settings/:key
DELETE /api/admin/settings/:key
```
- Platform configuration
- Email templates
- Payment settings
- Feature toggles

### Audit & Compliance

#### Audit Logs
```
GET /api/audit
Headers: Authorization Bearer token (admin only)
Query params: ?userId=123&action=login&date=2024-01-01
```
- Comprehensive activity logging
- User actions, admin changes
- Security event tracking

#### Audit Statistics
```
GET /api/audit/stats
Headers: Authorization Bearer token (admin only)
```
- Audit log analytics
- Security metrics
- Compliance reporting

### Report Management

#### View All Reports
```
GET /api/reports
Headers: Authorization Bearer token (admin only)
```
- User-submitted reports/issues
- Customer support tracking

#### Update Report Status
```
PUT /api/reports/:id/status
Headers: Authorization Bearer token (admin only)
Body: { status: "open|in-progress|resolved|closed" }
```
- Manages user report lifecycle

---

## 🔒 SECURITY & MIDDLEWARE

### Authentication Middleware
- `verifyToken`: Validates JWT tokens
- `authorizeRoles`: Role-based access control
- `adminMiddleware`: Admin-only access

### File Upload Security
- File type validation (PDF, JPEG, PNG)
- Cloudinary secure storage
- File size limits
- Encrypted CV storage (AES-256)

### Rate Limiting
- Login attempt limits (5 per 15 minutes)
- General API rate limiting (100 requests per 15 minutes)

### Data Protection
- Password hashing (bcrypt, salt rounds: 10)
- JWT token expiration (15 minutes access, 7 days refresh)
- Secure cookie settings (HTTP-only, SameSite)
- Audit logging for sensitive operations

---

## 📧 EMAIL NOTIFICATIONS

### User Notifications
- OTP verification emails
- Application status updates
- Interview scheduling
- Offer letters
- Payment confirmations

### Admin Notifications
- New applications
- Interview completions
- Payment processing
- System alerts

### Email Templates
- OTP verification template
- Application status updates
- Interview invitations
- Offer letters

---

## 🔌 REAL-TIME FEATURES

### WebRTC Video Interviews
- Room-based architecture
- Peer-to-peer video/audio
- Screen sharing
- Interview recording
- Real-time chat

### AI Voice Interviews
- Socket.io based communication
- OpenAI integration for conversation
- Real-time speech analysis
- Session management
- Automatic summary generation

### Live Updates
- Application status changes
- Interview scheduling
- Real-time notifications

---

## 💳 PAYMENT INTEGRATION

### Supported Payment Methods
- Credit/Debit cards
- Bank transfers
- Mobile money (planned)

### Payment Flow
1. Initiate payment with amount and purpose
2. Redirect to payment gateway
3. Payment processing
4. Callback verification
5. Status update and notification

### Payment Purposes
- Interview fees
- Visa processing
- Application fees
- Premium services

---

## 📊 ANALYTICS & REPORTING

### User Analytics
- Application conversion rates
- Interview completion rates
- User engagement metrics

### Admin Analytics
- Job performance metrics
- Application volume trends
- Interview success rates
- Revenue analytics

### Audit Reports
- Security event logs
- User activity reports
- Compliance documentation

---

## 🚀 DEPLOYMENT & INFRASTRUCTURE

### Production Environment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas + PostgreSQL
- File Storage: Cloudinary
- Email: Gmail SMTP

### Environment Configuration
- JWT secrets
- Database URLs
- API keys (Cloudinary, OpenAI, etc.)
- Email credentials
- Payment gateway keys

### Monitoring
- Error logging
- Performance monitoring
- Security alerts
- Backup systems

---

## 🔧 DEVELOPMENT WORKFLOW

### Local Development Setup
1. Clone repository
2. Install dependencies (`npm install`)
3. Configure environment variables
4. Start PostgreSQL and MongoDB
5. Run database migrations
6. Start development server (`npm run dev`)

### Testing
- Unit tests for controllers
- Integration tests for API endpoints
- E2E tests for critical flows

### Deployment Process
1. Code review and testing
2. Build optimization
3. Environment configuration
4. Database migrations
5. Zero-downtime deployment
6. Post-deployment verification

---

## 📝 API REFERENCE SUMMARY

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/send-login-otp` - Send login OTP
- `POST /api/auth/verify-login-otp` - Verify login OTP
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### User Endpoints
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/upload-cv` - Upload CV
- `GET /api/jobs` - Browse jobs
- `GET /api/jobs/:id` - Job details
- `POST /api/applications/apply` - Apply for job
- `GET /api/applications/my` - My applications
- `GET /api/interviews/my` - My interviews
- `POST /api/payment/initiate` - Initiate payment
- `POST /api/reports` - Create report
- `GET /api/reports/my-reports` - My reports

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/applications` - All applications
- `PUT /api/admin/application/:id` - Update application status
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `GET /api/interviews/admin` - All interviews
- `POST /api/admin/send-interview/:id` - Schedule interview
- `GET /api/audit` - Audit logs
- `GET /api/reports` - All reports

### AI Endpoints
- `POST /api/ai/interview/ask` - AI interview questions
- `POST /api/ai/cv/score` - CV scoring
- `POST /api/ai/recruiter-agent` - Autonomous recruiter

### Real-time Events (Socket.io)
- `join-room` - Join interview room
- `start-voice-interview` - Start AI voice interview
- `voice-response` - Send voice response
- `end-voice-interview` - End voice interview
- `offer/answer/ice-candidate` - WebRTC signaling
- `screen-share-start/end` - Screen sharing

---

## 🎯 CONCLUSION

Airswift provides a comprehensive, AI-powered job portal solution with distinct user and admin workflows. The platform emphasizes security, real-time collaboration, and intelligent automation to streamline the recruitment process for Canada-based immigration jobs.

Key differentiators include:
- AI-powered CV analysis and voice interviews
- Real-time video interviewing with WebRTC
- Comprehensive audit logging and compliance
- Secure document handling with encryption
- Multi-channel payment processing
- Role-based access control with granular permissions

The platform serves both job seekers looking for immigration opportunities and recruiters managing the hiring process efficiently.