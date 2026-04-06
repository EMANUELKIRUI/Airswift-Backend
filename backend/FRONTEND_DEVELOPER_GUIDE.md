# Frontend Developer Integration Guide

## Airswift Backend API Integration Guide

This guide provides comprehensive documentation for frontend developers to integrate with the Airswift backend API, a complete Applicant Tracking System (ATS) with real-time features.

---

## 🚀 Quick Start

### Environment Setup

1. **Backend URL**: `http://localhost:5000` (development) or your deployed URL
2. **WebSocket URL**: Same as backend URL for real-time features
3. **CORS**: Configured to allow `https://airswift-frontend.vercel.app` in production

### Required Dependencies

```bash
npm install socket.io-client axios jwt-decode
# or
yarn add socket.io-client axios jwt-decode
```

---

## 🔐 Authentication

### Registration Flow

```javascript
// 1. Register user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe'
  })
});

// 2. Verify OTP
const otpResponse = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '123456'
  })
});
```

### Login Flow

```javascript
// Traditional login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// OTP Login
const otpLoginResponse = await fetch('/api/auth/send-login-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// Verify OTP
const verifyResponse = await fetch('/api/auth/verify-login-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '123456'
  })
});
```

### Token Management

```javascript
// Store tokens after login
const { accessToken, refreshToken } = await loginResponse.json();
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Include in requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
};

// Refresh token
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
});
```

---

## 🌐 API Base Configuration

### Base URL
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

### Common Headers
```javascript
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
});
```

### Axios Instance Setup
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('/api/auth/refresh', {
            refreshToken
          });
          const { accessToken } = refreshResponse.data;
          localStorage.setItem('accessToken', accessToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return axios(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 📋 Core API Endpoints

### Jobs

```javascript
// Get all jobs (public)
const jobs = await api.get('/api/jobs');

// Get job details
const job = await api.get(`/api/jobs/${jobId}`);

// Apply for job (authenticated)
const formData = new FormData();
formData.append('cv', cvFile);
formData.append('coverLetter', coverLetter);
formData.append('jobId', jobId);

const application = await api.post('/api/applications/apply', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Applications

```javascript
// Get user's applications
const applications = await api.get('/api/applications/my');

// Upload additional documents
const docFormData = new FormData();
docFormData.append('passport', passportFile);
docFormData.append('nationalId', nationalIdFile);
docFormData.append('certificates', certificatesFile);

await api.post('/api/applications/upload-documents', docFormData);
```

### Interviews

```javascript
// Get user's interviews
const interviews = await api.get('/api/interviews/my');

// AI Interview interaction
const aiResponse = await api.post('/api/interviews/ask', {
  question: 'Tell me about your experience',
  sessionId: interviewSessionId
});

// Score interview response
await api.post('/api/interviews/score', {
  interviewId,
  questionId,
  response,
  score: 8
});
```

### Profile Management

```javascript
// Get profile
const profile = await api.get('/api/profile');

// Update profile
await api.put('/api/profile', {
  firstName: 'Updated Name',
  skills: ['JavaScript', 'React'],
  experience: '5 years'
});

// Upload CV
const cvFormData = new FormData();
cvFormData.append('cv', cvFile);
await api.post('/api/profile/upload-cv', cvFormData);
```

---

## 📁 File Upload Handling

### CV and Document Uploads

```javascript
const handleFileUpload = async (file, endpoint) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Usage
const cvUpload = await handleFileUpload(cvFile, '/api/profile/upload-cv');
const applicationUpload = await handleFileUpload(cvFile, '/api/applications/apply');
```

---

## 🔴 Real-Time WebSocket Integration

### Socket.io Setup

```javascript
import io from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io(API_BASE, {
      auth: {
        token: localStorage.getItem('accessToken')
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Application events
    this.socket.on('newApplication', (data) => {
      console.log('New application:', data);
      // Update UI with new application
    });

    this.socket.on('applicationUpdate', (data) => {
      console.log('Application status update:', data);
      // Update application status in UI
    });

    // CV Scoring events
    this.socket.on('cvScoringComplete', (data) => {
      console.log('CV scoring complete:', data);
      // Update CV score display
    });

    // Interview events
    this.socket.on('interviewScheduled', (data) => {
      console.log('Interview scheduled:', data);
      // Show interview notification
    });

    // Email events
    this.socket.on('emailSent', (data) => {
      console.log('Email sent:', data);
      // Show email sent confirmation
    });

    // Dashboard updates (admin)
    this.socket.on('dashboardUpdate', (data) => {
      console.log('Dashboard update:', data);
      // Refresh dashboard stats
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const socketManager = new SocketManager();
```

### Admin-Specific Events

```javascript
// For admin dashboard
socket.on('admin:newApplication', (data) => {
  // Update admin dashboard
});

socket.on('admin:applicationUpdate', (data) => {
  // Update application pipeline
});

socket.on('admin:cvScoringComplete', (data) => {
  // Update CV analytics
});
```

---

## 💰 Payment Integration

```javascript
// Initiate payment
const paymentInit = await api.post('/api/payment/initiate', {
  amount: 50000, // in cents
  currency: 'USD',
  description: 'Job application fee'
});

// Verify payment
const paymentVerify = await api.post('/api/payment/verify', {
  paymentId: paymentInit.data.paymentId,
  transactionId: 'txn_123456'
});
```

---

## 📊 Dashboard & Analytics

### Admin Dashboard

```javascript
// Get dashboard summary
const dashboard = await api.get('/api/dashboard/summary');

// Get application statistics
const appStats = await api.get('/api/dashboard/applications/stats');

// Get CV analytics
const cvStats = await api.get('/api/dashboard/cv/score-distribution');
```

### Real-time Dashboard Updates

```javascript
socket.on('dashboardUpdate', (data) => {
  // Update dashboard with real-time stats
  updateDashboardStats(data.stats);
});
```

---

## 🚨 Error Handling

### Common Error Responses

```javascript
const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        // Bad request - validation error
        showError(data.message || 'Invalid request data');
        break;
      case 401:
        // Unauthorized - token expired
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        break;
      case 403:
        // Forbidden - insufficient permissions
        showError('You do not have permission to perform this action');
        break;
      case 404:
        // Not found
        showError('Resource not found');
        break;
      case 429:
        // Rate limited
        showError('Too many requests. Please try again later');
        break;
      case 500:
        // Server error
        showError('Server error. Please try again later');
        break;
      default:
        showError('An unexpected error occurred');
    }
  } else if (error.request) {
    // Network error
    showError('Network error. Please check your connection');
  } else {
    // Other error
    showError('An unexpected error occurred');
  }
};
```

### Rate Limiting

The API implements rate limiting. Handle 429 responses appropriately:

```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  setTimeout(() => {
    // Retry the request
  }, retryAfter * 1000);
}
```

---

## 🧪 Testing API Endpoints

### Using the Test Files

The backend includes test files for API endpoints:

```bash
# Run all tests
npm test

# Test authentication
node test-auth.js

# Test AI endpoints
node test-ai-endpoints.js

# Test voice interviews
node test-voice-interview.js
```

### Manual Testing with cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get jobs
curl -X GET http://localhost:5000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Development Best Practices

### State Management

```javascript
// Redux slice example for applications
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchApplications = createAsyncThunk(
  'applications/fetchApplications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/applications/my');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState: {
    applications: [],
    loading: false,
    error: null
  },
  reducers: {
    // Socket updates
    updateApplicationStatus: (state, action) => {
      const { applicationId, status } = action.payload;
      const application = state.applications.find(app => app.id === applicationId);
      if (application) {
        application.status = status;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchApplications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});
```

### Environment Variables

```javascript
// .env.local
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## 🎯 Complete Frontend Features List

Based on the backend capabilities, here's a comprehensive list of all features the Airswift frontend website should implement:

### 🔐 **Authentication & User Management**
- **User Registration**: Email/password registration with OTP verification
- **Login Options**: Traditional login + OTP login for enhanced security
- **Password Management**: Forgot password, reset password, change password
- **Profile Management**: View/edit profile, upload CV, update personal information
- **Session Management**: JWT token handling, auto-refresh, logout
- **Role-Based UI**: Different interfaces for regular users vs admins

### 💼 **Job Portal Features**
- **Job Browsing**: Public job listings with search, filter, and pagination
- **Job Details**: Detailed job view with requirements, salary, location
- **Job Categories**: Browse jobs by categories (IT, Healthcare, etc.)
- **Job Search**: Advanced search with filters (location, salary, experience)
- **Saved Jobs**: Bookmark favorite jobs for later application
- **Job Alerts**: Email notifications for new matching jobs

### 📝 **Application Management**
- **Job Application**: Apply with CV upload, cover letter, and additional documents
- **Application Tracking**: View all submitted applications with status updates
- **Document Upload**: Upload passport, national ID, certificates, additional CVs
- **Application History**: Complete application timeline and communications
- **Withdraw Application**: Allow users to withdraw pending applications

### 🎯 **AI-Powered Features**
- **CV Analysis**: AI-powered CV scoring and skill extraction
- **AI Interview Bot**: Interactive conversational interviews
- **Job Matching**: AI recommendations based on CV and preferences
- **Skill Assessment**: Automated skill evaluation and gap analysis
- **Resume Optimization**: AI suggestions for improving CV effectiveness

### 📹 **Interview Management**
- **Interview Scheduling**: View scheduled interviews with date/time details
- **Video Interviews**: WebRTC-based video calling for remote interviews
- **Voice Interviews**: AI-powered voice interviews with speech analysis
- **Interview Feedback**: View interview scores and feedback
- **Interview History**: Access past interview recordings and transcripts
- **Reschedule Requests**: Request interview rescheduling when needed

### 👨‍💼 **Admin Dashboard**
- **Application Pipeline**: Kanban-style application tracking (Applied → Shortlisted → Interview → Offer)
- **Bulk Actions**: Select multiple applications for bulk status updates
- **CV Scoring Interface**: Manual CV review with AI assistance
- **Interview Management**: Schedule, reschedule, and manage interviews
- **Email Campaigns**: Send bulk emails to applicants
- **Offer Generation**: Create and send job offers with salary details

### 📊 **Analytics & Reporting**
- **Dashboard Overview**: Key metrics (applications, interviews, hires)
- **Application Analytics**: Applications over time, by job, by status
- **CV Analytics**: Score distribution, top skills, skill gaps
- **Interview Analytics**: Interview completion rates, average scores
- **Hiring Funnel**: Conversion rates at each stage
- **Time-to-Hire**: Average time from application to offer
- **Custom Reports**: Generate reports for specific time periods

### 💳 **Payment Integration**
- **Application Fees**: Pay for premium job applications
- **Interview Fees**: Payment for scheduled interviews
- **Visa Processing**: Payment for immigration services
- **Payment History**: View all transactions and receipts
- **Refund Management**: Request refunds for cancelled services

### 📧 **Communication & Notifications**
- **Email Notifications**: Status updates, interview invites, offers
- **In-App Notifications**: Real-time notifications for important events
- **Bulk Messaging**: Admin ability to message groups of applicants
- **Interview Reminders**: Automated reminders before interviews
- **Feedback Collection**: Post-interview feedback forms

### 🔴 **Real-Time Features**
- **Live Application Updates**: Real-time status changes in admin dashboard
- **Live Chat**: Real-time messaging between recruiters and candidates
- **Live Interview Status**: Real-time updates during interviews
- **Live Dashboard**: Real-time metrics updates
- **Live Notifications**: Instant notifications for all users
- **Live Applicant Tracking**: Real-time pipeline updates

### 📱 **Responsive Design**
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Responsive design for tablets
- **Desktop Experience**: Full-featured desktop interface
- **Progressive Web App**: Installable PWA with offline capabilities
- **Cross-Browser**: Compatible with all modern browsers

### 🔒 **Security & Compliance**
- **Data Encryption**: Secure handling of sensitive documents
- **GDPR Compliance**: Data protection and privacy controls
- **Audit Logging**: Track all user actions for compliance
- **Secure File Upload**: Virus scanning and file validation
- **Two-Factor Authentication**: Enhanced security options

### ⚙️ **Settings & Configuration**
- **System Settings**: Admin configuration of email templates, scoring criteria
- **User Preferences**: Notification preferences, language settings
- **Email Templates**: Customizable email templates for different scenarios
- **Scoring Rules**: Configure AI scoring parameters
- **Integration Settings**: API keys for third-party services

### 📈 **Advanced Features**
- **Advanced Search**: Full-text search across applications and CVs
- **Tagging System**: Tag applications for easy categorization
- **Custom Fields**: Add custom fields to applications and jobs
- **Workflow Automation**: Automated status changes based on rules
- **Integration APIs**: Connect with external HR systems
- **Export Functionality**: Export data to CSV, PDF, Excel

### 🎨 **User Experience**
- **Intuitive Navigation**: Easy-to-use navigation and search
- **Loading States**: Proper loading indicators and skeleton screens
- **Error Handling**: User-friendly error messages and recovery options
- **Accessibility**: WCAG compliant for users with disabilities
- **Multilingual**: Support for multiple languages
- **Dark Mode**: Optional dark theme for better UX

### 📊 **Performance & Scalability**
- **Lazy Loading**: Load content on demand for better performance
- **Caching**: Intelligent caching of frequently accessed data
- **Image Optimization**: Compressed images and progressive loading
- **CDN Integration**: Fast content delivery worldwide
- **Monitoring**: Real-time performance monitoring and alerts

---

## 📞 Support

For API issues or questions:
- Check the [API Reference](API_REFERENCE.md) for detailed endpoint documentation
- Review server logs for error details
- Test endpoints using the provided test files
- Ensure proper authentication headers are included

---

## 🔄 API Versioning

The current API version is v1. All endpoints are prefixed with `/api/`. Future versions will use `/api/v2/`, etc.

---

This guide covers the essential integration points for the Airswift frontend. The API provides a complete ATS solution with real-time updates, AI-powered features, and comprehensive job management capabilities.