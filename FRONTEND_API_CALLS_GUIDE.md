# Frontend API Calls Guide - AIRSWIFT

Complete guide for making API calls from the frontend to the AIRSWIFT backend. Includes authentication, all endpoints, error handling, and practical examples.

---

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [API Client Instance](#api-client-instance)
4. [Error Handling](#error-handling)
5. [Auth Endpoints](#auth-endpoints)
6. [Jobs Endpoints](#jobs-endpoints)
7. [Applications Endpoints](#applications-endpoints)
8. [Profile Endpoints](#profile-endpoints)
9. [Interviews Endpoints](#interviews-endpoints)
10. [Messages Endpoints](#messages-endpoints)
11. [Notifications Endpoints](#notifications-endpoints)
12. [Admin Endpoints](#admin-endpoints)
13. [Real-time (WebSocket)](#real-time-websocket)
14. [Best Practices](#best-practices)

---

## Setup & Configuration

### Environment Variables

Create `.env.local` in your frontend project:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_TIMEOUT=30000
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://api.airswift.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.airswift.com
```

### Install Dependencies

```bash
npm install axios socket.io-client
```

---

## Authentication

### Token Storage Strategy

```javascript
// Store tokens securely
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Or use httpOnly cookies (more secure for XSS protection)
// Set by backend with Set-Cookie header
```

### Get Stored Tokens

```javascript
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
```

---

## API Client Instance

### Create Axios Instance with Interceptors

```javascript
// lib/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookies
});

// Request Interceptor - Add token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Error Handling

### Standard Error Response Handler

```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return {
          code: 'VALIDATION_ERROR',
          message: data.message || 'Invalid request',
          details: data.details || null
        };
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed. Please login again.'
        };
      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action'
        };
      case 404:
        return {
          code: 'NOT_FOUND',
          message: data.message || 'Resource not found'
        };
      case 409:
        return {
          code: 'CONFLICT',
          message: data.message || 'Resource already exists'
        };
      case 413:
        return {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum limit (10MB)'
        };
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.'
        };
      case 500:
        return {
          code: 'SERVER_ERROR',
          message: 'Server error. Please try again later.'
        };
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: data.message || 'An unexpected error occurred'
        };
    }
  } else if (error.request) {
    // Request made but no response
    return {
      code: 'NO_RESPONSE',
      message: 'No response from server. Check your connection.'
    };
  } else {
    // Error in request setup
    return {
      code: 'REQUEST_ERROR',
      message: error.message || 'An error occurred'
    };
  }
};

// Usage in components
try {
  const response = await apiClient.post('/auth/login', data);
  // Handle success
} catch (error) {
  const errorInfo = handleApiError(error);
  console.error(errorInfo.code, errorInfo.message);
  // Show error to user
}
```

---

## Auth Endpoints

### 1. Register

```javascript
// POST /auth/register
const register = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password
    });

    return {
      success: true,
      message: response.data.message,
      userId: response.data.userId,
      email: response.data.email
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleRegister = async (formData) => {
  try {
    const result = await register(formData);
    console.log('Registration successful:', result);
    // Redirect to OTP verification page
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
};
```

### 2. Verify Registration OTP

```javascript
// POST /auth/verify-registration-otp
const verifyRegistrationOTP = async (email, otp) => {
  try {
    const response = await apiClient.post('/auth/verify-registration-otp', {
      email,
      otp
    });

    const { accessToken, refreshToken, user } = response.data;

    // Store tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, accessToken };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleOTPVerification = async (otp) => {
  try {
    const result = await verifyRegistrationOTP(email, otp);
    // Redirect to profile setup
  } catch (error) {
    setError(error.message);
  }
};
```

### 3. Send Login OTP

```javascript
// POST /auth/send-login-otp
const sendLoginOTP = async (email) => {
  try {
    const response = await apiClient.post('/auth/send-login-otp', { email });
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleSendOTP = async (email) => {
  try {
    await sendLoginOTP(email);
    setMessage('OTP sent to your email');
  } catch (error) {
    setError(error.message);
  }
};
```

### 4. Verify Login OTP

```javascript
// POST /auth/verify-login-otp
const verifyLoginOTP = async (email, otp) => {
  try {
    const response = await apiClient.post('/auth/verify-login-otp', {
      email,
      otp
    });

    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, accessToken };
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 5. Get Current User

```javascript
// GET /auth/me
const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage in useEffect
useEffect(() => {
  const fetchUser = async () => {
    try {
      const user = await getCurrentUser();
      setUser(user);
    } catch (error) {
      // User not authenticated
      redirectToLogin();
    }
  };

  fetchUser();
}, []);
```

### 6. Change Password

```javascript
// PUT /auth/change-password
const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await apiClient.put('/auth/change-password', {
      oldPassword,
      newPassword
    });

    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 7. Forgot Password

```javascript
// POST /auth/forgot-password
const forgotPassword = async (email) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 8. Reset Password

```javascript
// POST /auth/reset-password/:token
const resetPassword = async (token, newPassword) => {
  try {
    const response = await apiClient.post(`/auth/reset-password/${token}`, {
      password: newPassword
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 9. Logout

```javascript
// POST /auth/logout
const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
    localStorage.clear();
    return true;
  } catch (error) {
    // Clear tokens anyway
    localStorage.clear();
    return true;
  }
};

// Usage
const handleLogout = async () => {
  await logout();
  redirectToLogin();
};
```

---

## Jobs Endpoints

### 1. Get All Jobs (Public)

```javascript
// GET /jobs?page=1&limit=10
const getJobs = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get('/jobs', {
      params: { page, limit }
    });

    return {
      jobs: response.data.jobs,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchJobs = async () => {
    const data = await getJobs(page, 10);
    setJobs(data.jobs);
    setTotal(data.total);
  };
  fetchJobs();
}, [page]);
```

### 2. Search Jobs (Advanced)

```javascript
// GET /jobs/search
const searchJobs = async (filters) => {
  try {
    const response = await apiClient.get('/jobs/search', {
      params: {
        keyword: filters.keyword,
        location: filters.location,
        category: filters.category,
        minSalary: filters.minSalary,
        maxSalary: filters.maxSalary,
        remote: filters.remote,
        type: filters.type,
        page: filters.page || 1,
        limit: filters.limit || 10
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleJobSearch = async (searchParams) => {
  try {
    const results = await searchJobs({
      keyword: 'developer',
      location: 'Toronto',
      category: 'Technology',
      minSalary: 50000,
      maxSalary: 100000,
      page: 1
    });

    setJobResults(results.jobs);
  } catch (error) {
    setError(error.message);
  }
};
```

### 3. Get Single Job

```javascript
// GET /jobs/:id
const getJobById = async (jobId) => {
  try {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchJob = async () => {
    const jobData = await getJobById(jobId);
    setJob(jobData);
  };
  fetchJob();
}, [jobId]);
```

### 4. Get Job Categories

```javascript
// GET /jobs/categories
const getJobCategories = async () => {
  try {
    const response = await apiClient.get('/jobs/categories');
    return response.data.categories;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchCategories = async () => {
    const categories = await getJobCategories();
    setCategories(categories);
  };
  fetchCategories();
}, []);
```

---

## Applications Endpoints

### 1. Submit Application

```javascript
// POST /applications (with file upload)
const submitApplication = async (jobId, formData) => {
  try {
    const data = new FormData();
    data.append('jobId', jobId);
    data.append('cv', formData.cv); // File object
    data.append('passport', formData.passport); // File object
    data.append('nationalId', formData.nationalId); // File object
    data.append('coverLetter', formData.coverLetter || '');

    const response = await apiClient.post('/applications', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage in React Component
const handleSubmitApplication = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Get file inputs
    const cvFile = document.getElementById('cv').files[0];
    const passportFile = document.getElementById('passport').files[0];
    const nationalIdFile = document.getElementById('nationalId').files[0];

    const result = await submitApplication(jobId, {
      cv: cvFile,
      passport: passportFile,
      nationalId: nationalIdFile,
      coverLetter: formData.coverLetter
    });

    showSuccessMessage('Application submitted successfully!');
    redirectToDashboard();
  } catch (error) {
    showErrorMessage(error.message);
  } finally {
    setLoading(false);
  }
};
```

### 2. Get My Applications

```javascript
// GET /applications
const getMyApplications = async () => {
  try {
    const response = await apiClient.get('/applications');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchApplications = async () => {
    const data = await getMyApplications();
    setApplications(data.applications);
  };
  fetchApplications();
}, []);
```

### 3. Check if User Applied

```javascript
// GET /applications/check
const checkApplicationStatus = async () => {
  try {
    const response = await apiClient.get('/applications/check');
    return response.data.hasApplied;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 4. Get Application Job Options

```javascript
// GET /applications/job-options
const getApplicationJobOptions = async () => {
  try {
    const response = await apiClient.get('/applications/job-options');
    return response.data.jobs;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage - populate job dropdown
useEffect(() => {
  const fetchJobOptions = async () => {
    const jobs = await getApplicationJobOptions();
    setAvailableJobs(jobs);
  };
  fetchJobOptions();
}, []);
```

---

## Profile Endpoints

### 1. Get Profile

```javascript
// GET /profile
const getProfile = async () => {
  try {
    const response = await apiClient.get('/profile');
    return response.data.profile;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchProfile = async () => {
    const profile = await getProfile();
    setProfile(profile);
  };
  fetchProfile();
}, []);
```

### 2. Update Profile

```javascript
// PUT /profile
const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/profile', {
      name: profileData.name,
      phone: profileData.phone,
      location: profileData.location,
      bio: profileData.bio,
      skills: profileData.skills, // Array or comma-separated string
      experience: profileData.experience,
      education: profileData.education,
      linkedIn: profileData.linkedIn,
      portfolio: profileData.portfolio
    });

    return response.data.profile;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleProfileUpdate = async (formData) => {
  try {
    const updatedProfile = await updateProfile({
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim())
    });

    setProfile(updatedProfile);
    showSuccessMessage('Profile updated successfully!');
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 3. Upload CV

```javascript
// POST /profile/cv-upload
const uploadCV = async (cvFile) => {
  try {
    const data = new FormData();
    data.append('cv', cvFile);

    const response = await apiClient.post('/profile/cv-upload', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage with progress tracking
const handleCVUpload = async (e) => {
  const file = e.target.files[0];

  try {
    const result = await uploadCV(file);
    setProfile({ ...profile, cv: result.cv });
    showSuccessMessage('CV uploaded successfully!');
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 4. Setup Profile (First Time)

```javascript
// POST /profile/setup-profile
const setupProfile = async (profileData, cvFile) => {
  try {
    const data = new FormData();
    data.append('name', profileData.name);
    data.append('phone', profileData.phone);
    data.append('location', profileData.location);
    data.append('bio', profileData.bio);
    data.append('skills', profileData.skills);
    if (cvFile) {
      data.append('cv', cvFile);
    }

    const response = await apiClient.post('/profile/setup-profile', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data.profile;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

---

## Interviews Endpoints

### 1. Get My Interviews

```javascript
// GET /interviews/my
const getMyInterviews = async () => {
  try {
    const response = await apiClient.get('/interviews/my');
    return response.data.interviews;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchInterviews = async () => {
    const interviews = await getMyInterviews();
    setInterviews(interviews);
  };
  fetchInterviews();
}, []);
```

### 2. Get Interview Details

```javascript
// GET /interviews/:id
const getInterviewDetails = async (interviewId) => {
  try {
    const response = await apiClient.get(`/interviews/${interviewId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 3. Submit Interview Responses

```javascript
// POST /interviews/submit
const submitInterviewResponses = async (interviewId, answers) => {
  try {
    const response = await apiClient.post('/interviews/submit', {
      interviewId,
      answers // Array of { questionId, answer }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleInterviewSubmission = async () => {
  try {
    const responses = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || ''
    }));

    const result = await submitInterviewResponses(interviewId, responses);
    showSuccessMessage('Interview submitted successfully!');
    redirectToDashboard();
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 4. Create Voice Interview Session

```javascript
// POST /interviews/session
const createVoiceInterviewSession = async (interviewId) => {
  try {
    const response = await apiClient.post('/interviews/session', {
      interviewId
    });

    return {
      sessionId: response.data.sessionId,
      roomId: response.data.roomId,
      socketToken: response.data.socketToken,
      questions: response.data.questions
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleStartVoiceInterview = async () => {
  try {
    const session = await createVoiceInterviewSession(interviewId);
    // Initialize voice interview UI with session data
    startVoiceSession(session);
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 5. Score Response

```javascript
// POST /interviews/score
const scoreResponse = async (interviewId, questionId, response) => {
  try {
    const data = await apiClient.post('/interviews/score', {
      interviewId,
      questionId,
      response
    });

    return {
      score: data.data.score,
      feedback: data.data.feedback,
      suggestions: data.data.suggestions
    };
  } catch (error) {
    throw handleApiError(error);
  }
};
```

---

## Messages Endpoints

### 1. Send Message

```javascript
// POST /messages
const sendMessage = async (recipientId, content) => {
  try {
    const response = await apiClient.post('/messages', {
      recipientId,
      content,
      attachments: [] // Optional
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage in Chat Component
const handleSendMessage = async (e) => {
  e.preventDefault();

  try {
    const message = await sendMessage(recipientId, messageText);
    setMessages([...messages, message]);
    setMessageText('');
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 2. Get Messages

```javascript
// GET /messages?userId=xxx&page=1&limit=20
const getMessages = async (userId, page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/messages', {
      params: {
        userId,
        page,
        limit
      }
    });

    return {
      messages: response.data.messages,
      total: response.data.total
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchMessages = async () => {
    const data = await getMessages(recipientId, 1);
    setMessages(data.messages);
  };
  fetchMessages();
}, [recipientId]);
```

### 3. Get Recent Messages (Conversations)

```javascript
// GET /messages/recent
const getRecentMessages = async () => {
  try {
    const response = await apiClient.get('/messages/recent');
    return response.data.conversations;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage - for conversation list
useEffect(() => {
  const fetchConversations = async () => {
    const conversations = await getRecentMessages();
    setConversations(conversations);
  };
  fetchConversations();
}, []);
```

### 4. Mark Messages as Read

```javascript
// PUT /messages/mark-as-read
const markMessagesAsRead = async (messageIds) => {
  try {
    const response = await apiClient.put('/messages/mark-as-read', {
      messageIds // Array of message IDs
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

---

## Notifications Endpoints

### 1. Get Notifications

```javascript
// GET /notifications?page=1&limit=20
const getNotifications = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/notifications', {
      params: { page, limit }
    });

    return {
      notifications: response.data.notifications,
      total: response.data.total
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data.notifications);
  };
  fetchNotifications();
}, []);
```

### 2. Get Unread Count

```javascript
// GET /notifications/unread-count
const getUnreadNotificationCount = async () => {
  try {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.unreadCount;
  } catch (error) {
    return 0; // Default to 0 on error
  }
};

// Usage in Notification Bell
useEffect(() => {
  const fetchUnreadCount = async () => {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  };
  fetchUnreadCount();
}, []);
```

### 3. Mark Notification as Read

```javascript
// PUT /notifications/:id
const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await apiClient.put(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 4. Mark All as Read

```javascript
// PUT /notifications/mark-all-read
const markAllNotificationsAsRead = async () => {
  try {
    const response = await apiClient.put('/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 5. Delete Notification

```javascript
// DELETE /notifications/:id
const deleteNotification = async (notificationId) => {
  try {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

---

## Admin Endpoints

### 1. Get Dashboard Stats

```javascript
// GET /admin
const getAdminDashboardStats = async () => {
  try {
    const response = await apiClient.get('/admin');
    return response.data.stats;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchStats = async () => {
    const stats = await getAdminDashboardStats();
    setDashboardStats(stats);
  };
  fetchStats();
}, []);
```

### 2. Get All Users

```javascript
// GET /admin/users
const getAllUsers = async () => {
  try {
    const response = await apiClient.get('/admin/users');
    return response.data.users;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 3. Create User

```javascript
// POST /admin/users
const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/admin/users', {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      location: userData.location,
      bio: userData.bio
    });

    return response.data.user;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 4. Get All Applications

```javascript
// GET /applications/admin
const getAdminApplications = async (filters = {}) => {
  try {
    const response = await apiClient.get('/applications/admin', {
      params: {
        page: filters.page || 1,
        limit: filters.limit || 10,
        status: filters.status,
        jobId: filters.jobId
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
useEffect(() => {
  const fetchApplications = async () => {
    const data = await getAdminApplications({
      page: currentPage,
      status: selectedStatus,
      jobId: selectedJob
    });

    setApplications(data.applications);
    setTotal(data.total);
  };
  fetchApplications();
}, [currentPage, selectedStatus, selectedJob]);
```

### 5. Update Application Status

```javascript
// PUT /applications/admin/application/:id/status
const updateApplicationStatus = async (appId, newStatus, notes = '') => {
  try {
    const response = await apiClient.put(
      `/applications/admin/application/${appId}/status`,
      {
        status: newStatus,
        notes
      }
    );

    return response.data.application;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleStatusChange = async (applicationId, newStatus) => {
  try {
    const updated = await updateApplicationStatus(
      applicationId,
      newStatus,
      'Status updated by admin'
    );

    // Update UI
    setApplications(
      applications.map((app) =>
        app.id === applicationId ? updated : app
      )
    );

    showSuccessMessage('Status updated successfully!');
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### 6. Get All Interviews (Admin)

```javascript
// GET /interviews/admin
const getAdminInterviews = async (filters = {}) => {
  try {
    const response = await apiClient.get('/interviews/admin', {
      params: {
        page: filters.page || 1,
        limit: filters.limit || 10,
        status: filters.status,
        jobId: filters.jobId
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
```

### 7. Create Interview (Admin)

```javascript
// POST /interviews
const createInterview = async (interviewData) => {
  try {
    const response = await apiClient.post('/interviews', {
      applicationId: interviewData.applicationId,
      type: interviewData.type, // ai_voice, video, text
      scheduledAt: interviewData.scheduledAt,
      duration: interviewData.duration,
      questions: interviewData.questions
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Usage
const handleScheduleInterview = async (appId, interviewDetails) => {
  try {
    const interview = await createInterview({
      applicationId: appId,
      type: 'ai_voice',
      scheduledAt: interviewDetails.date,
      duration: 30,
      questions: interviewDetails.questions
    });

    showSuccessMessage('Interview scheduled successfully!');
    // Notify candidate via email
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

---

## Real-time (WebSocket)

### Setup Socket Connection

```javascript
// lib/socket.js
import io from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = (token) => {
  if (socketInstance) return socketInstance;

  socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socketInstance.on('connect', () => {
    console.log('Socket connected:', socketInstance.id);
  });

  socketInstance.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socketInstance.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
```

### Listen for Events

```javascript
// In your component
import { getSocket } from '@/lib/socket';

useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  // Listen for application status updates
  socket.on('statusUpdate', (data) => {
    console.log('Application status updated:', data);
    // Update UI with new status
  });

  // Listen for interview scheduling
  socket.on('interviewScheduled', (data) => {
    console.log('Interview scheduled:', data);
    // Show notification or update interview list
  });

  // Listen for new messages
  socket.on('newMessage', (data) => {
    console.log('New message received:', data);
    // Add message to chat
  });

  // Listen for notifications
  socket.on('notification', (data) => {
    console.log('New notification:', data);
    // Show notification badge/toast
  });

  return () => {
    // Cleanup listeners if needed
    // socket.off('statusUpdate');
    // socket.off('interviewScheduled');
  };
}, []);
```

### Emit Events

```javascript
const socket = getSocket();

// Join user room for personal updates
socket.emit('joinRoom', { userId: currentUserId });

// Send message
socket.emit('sendMessage', {
  recipientId: 'recipient_user_id',
  content: 'Hello!'
});

// Submit interview response
socket.emit('submitResponse', {
  interviewId: 'interview_id',
  questionId: 'q1',
  answer: 'My response...'
});

// Leave room
socket.emit('leaveRoom', { roomId: 'room_id' });
```

---

## Best Practices

### 1. Request/Response Pattern

```javascript
// Always follow this pattern for API calls
const apiFunction = async (params) => {
  try {
    // Validate inputs
    if (!params.requiredField) {
      throw new Error('Required field is missing');
    }

    // Make API call
    const response = await apiClient.method('/endpoint', data);

    // Return properly formatted response
    return {
      success: true,
      data: response.data,
      message: response.data.message
    };
  } catch (error) {
    // Handle error
    const errorInfo = handleApiError(error);
    throw errorInfo;
  }
};
```

### 2. Loading & Error States

```javascript
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* Render data */}</div>;
};
```

### 3. Debounced Search

```javascript
import { debounce } from 'lodash';

const handleSearch = debounce(async (query) => {
  try {
    const results = await searchJobs({ keyword: query });
    setSearchResults(results.jobs);
  } catch (error) {
    console.error('Search error:', error);
  }
}, 300); // Wait 300ms after user stops typing
```

### 4. Cancel Requests

```javascript
const cancelTokenSource = axios.CancelToken.source();

const fetchData = async () => {
  try {
    const response = await apiClient.get('/endpoint', {
      cancelToken: cancelTokenSource.token
    });
    setData(response.data);
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('Request cancelled');
    }
  }
};

// Cancel request
const cancelRequest = () => {
  cancelTokenSource.cancel('Request cancelled by user');
};
```

### 5. Batch Requests

```javascript
const fetchBatchData = async () => {
  try {
    const [jobs, applications, interviews] = await Promise.all([
      getJobs(),
      getMyApplications(),
      getMyInterviews()
    ]);

    setJobs(jobs.data);
    setApplications(applications.data);
    setInterviews(interviews.data);
  } catch (error) {
    handleApiError(error);
  }
};
```

### 6. Retry Logic

```javascript
const apiCallWithRetry = async (apiFunction, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
};

// Usage
const data = await apiCallWithRetry(() => getJobs(), 3);
```

### 7. Caching Responses

```javascript
const cache = new Map();

const getCachedData = async (key, apiFunction, ttl = 5000) => {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await apiFunction();
  cache.set(key, {
    data,
    timestamp: Date.now()
  });

  return data;
};

// Usage
const jobs = await getCachedData('jobs', () => getJobs(), 60000);
```

---

**Last Updated**: January 2024
**API Version**: v1.0.0
**Frontend Framework**: Next.js 14+