# Frontend Development Guide for Airswift

This guide provides detailed instructions for building the frontend application that interacts with the Airswift backend API.

## 🛠️ Tech Stack Recommendations

- **Framework**: React.js (recommended) or Vue.js
- **State Management**: Redux Toolkit or Context API (React) / Vuex (Vue)
- **HTTP Client**: Axios
- **Routing**: React Router (React) / Vue Router (Vue)
- **UI Library**: Material-UI (React) or Vuetify (Vue)
- **File Upload**: React Dropzone
- **Form Handling**: React Hook Form
- **Notifications**: React Toastify

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.js
│   │   │   ├── Footer.js
│   │   │   ├── LoadingSpinner.js
│   │   │   └── ErrorBoundary.js
│   │   ├── auth/
│   │   │   ├── LoginForm.js
│   │   │   ├── RegisterForm.js
│   │   │   └── AuthGuard.js
│   │   ├── profile/
│   │   │   ├── ProfileView.js
│   │   │   ├── ProfileEdit.js
│   │   │   └── CVUploader.js
│   │   ├── jobs/
│   │   │   ├── JobList.js
│   │   │   ├── JobCard.js
│   │   │   ├── JobDetail.js
│   │   │   └── JobFilters.js
│   │   ├── applications/
│   │   │   ├── ApplicationForm.js
│   │   │   ├── MyApplications.js
│   │   │   └── ApplicationStatus.js
│   │   ├── interviews/
│   │   │   ├── InterviewList.js
│   │   │   └── InterviewDetail.js
│   │   ├── payments/
│   │   │   ├── PaymentForm.js
│   │   │   ├── PaymentHistory.js
│   │   │   └── MobileMoneyPrompt.js
│   │   └── admin/
│   │       ├── AdminDashboard.js
│   │       ├── JobManagement.js
│   │       ├── ApplicationManagement.js
│   │       └── UserManagement.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Dashboard.js
│   │   ├── AdminPanel.js
│   │   ├── Profile.js
│   │   ├── Jobs.js
│   │   └── NotFound.js
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── jobService.js
│   │   ├── applicationService.js
│   │   ├── paymentService.js
│   │   └── notificationService.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useJobs.js
│   │   └── useApplications.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── context/
│   │   ├── AuthContext.js
│   │   └── AppContext.js
│   ├── App.js
│   ├── index.js
│   └── styles/
│       ├── global.css
│       └── theme.js
├── package.json
├── .env
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. Create a new React app:
```bash
npx create-react-app airswift-frontend
cd airswift-frontend
```

2. Install dependencies:
```bash
npm install axios react-router-dom @mui/material @emotion/react @emotion/styled react-hook-form react-dropzone react-toastify redux @reduxjs/toolkit
```

3. Set up environment variables:
```bash
# .env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

## 🔗 API Integration

### Base API Configuration

```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Authentication Service

```javascript
// src/services/authService.js
import api from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
};
```

## 🎯 Core Components

### Authentication Components

#### Login Form
```javascript
// src/components/auth/LoginForm.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { TextField, Button, Paper, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';

const LoginForm = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await authService.login(data);
      localStorage.setItem('token', response.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Login
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          margin="normal"
          {...register('email', { required: 'Email is required' })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          margin="normal"
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Paper>
  );
};

export default LoginForm;
```

#### Profile Management
```javascript
// src/components/profile/ProfileEdit.js
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { TextField, Button, Chip, Box, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const ProfileEdit = () => {
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'skills'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile');
        const profile = response.data;
        setValue('experience', profile.experience);
        setValue('education', profile.education);
        setValue('phone_number', profile.phone_number);
        setValue('skills', profile.skills || []);
      } catch (error) {
        toast.error('Failed to load profile');
      }
    };
    fetchProfile();
  }, [setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.put('/profile', data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Edit Profile
      </Typography>

      <TextField
        fullWidth
        label="Phone Number"
        margin="normal"
        {...register('phone_number', {
          pattern: {
            value: /^\+256\d{9}$|^\+255\d{9}$|^\+250\d{9}$|^\+257\d{9}$/,
            message: 'Invalid phone number format'
          }
        })}
        error={!!errors.phone_number}
        helperText={errors.phone_number?.message}
      />

      <TextField
        fullWidth
        label="Experience"
        multiline
        rows={4}
        margin="normal"
        {...register('experience')}
      />

      <TextField
        fullWidth
        label="Education"
        multiline
        rows={4}
        margin="normal"
        {...register('education')}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Skills
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {fields.map((field, index) => (
          <Chip
            key={field.id}
            label={
              <TextField
                size="small"
                {...register(`skills.${index}`)}
                placeholder="Skill"
              />
            }
            onDelete={() => remove(index)}
          />
        ))}
        <Button onClick={() => append('')}>Add Skill</Button>
      </Box>

      <Button
        type="submit"
        variant="contained"
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </Button>
    </Box>
  );
};

export default ProfileEdit;
```

### Job Components

#### Job List with Filters
```javascript
// src/components/jobs/JobList.js
import { useState, useEffect } from 'react';
import { Grid, Pagination, Box } from '@mui/material';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import api from '../../services/api';

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { page, ...filters };
      const response = await api.get('/jobs', { params });
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, filters]);

  return (
    <Box>
      <JobFilters onFilterChange={setFilters} />
      <Grid container spacing={3}>
        {jobs.map(job => (
          <Grid item xs={12} sm={6} md={4} key={job.id}>
            <JobCard job={job} />
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={10} // Calculate based on total jobs
          page={page}
          onChange={(e, value) => setPage(value)}
        />
      </Box>
    </Box>
  );
};

export default JobList;
```

#### Job Card
```javascript
// src/components/jobs/JobCard.js
import { Card, CardContent, CardActions, Button, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const JobCard = ({ job }) => {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {job.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {job.location}
        </Typography>
        <Typography variant="body1" paragraph>
          {job.description.substring(0, 150)}...
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`${job.salary_min} - ${job.salary_max} KSH`} size="small" />
          <Chip label={job.category} size="small" />
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => navigate(`/jobs/${job.id}`)}>
          View Details
        </Button>
        <Button size="small" variant="contained">
          Apply Now
        </Button>
      </CardActions>
    </Card>
  );
};

export default JobCard;
```

### Application Components

#### Application Form
```javascript
// src/components/applications/ApplicationForm.js
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const ApplicationForm = ({ jobId, open, onClose }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/applications/apply', {
        job_id: jobId,
        cover_letter: data.coverLetter
      });
      toast.success('Application submitted successfully!');
      reset();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Apply for Job</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            fullWidth
            label="Cover Letter"
            multiline
            rows={6}
            margin="normal"
            {...register('coverLetter', { required: 'Cover letter is required' })}
            error={!!errors.coverLetter}
            helperText={errors.coverLetter?.message}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ApplicationForm;
```

### Payment Components

#### Mobile Money Payment
```javascript
// src/components/payments/MobileMoneyPrompt.js
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Alert, Box, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const MobileMoneyPrompt = ({ serviceType, amount, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/payment/initiate', {
        amount,
        service_type: serviceType,
        phone_number: data.phoneNumber
      });
      setPaymentInitiated(true);
      toast.success('Payment prompt sent to your phone!');
    } catch (error) {
      toast.error('Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  if (paymentInitiated) {
    return (
      <Alert severity="success">
        Payment prompt has been sent to your mobile number. Please complete the payment on your phone.
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Pay {amount} KSH via Mobile Money
      </Typography>
      <TextField
        fullWidth
        label="Phone Number"
        placeholder="+256XXXXXXXXX"
        margin="normal"
        {...register('phoneNumber', {
          required: 'Phone number is required',
          pattern: {
            value: /^\+256\d{9}$|^\+255\d{9}$|^\+250\d{9}$|^\+257\d{9}$/,
            message: 'Invalid phone number format'
          }
        })}
        error={!!errors.phoneNumber}
        helperText={errors.phoneNumber?.message}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? 'Initiating Payment...' : 'Pay Now'}
      </Button>
    </Box>
  );
};

export default MobileMoneyPrompt;
```

## 🔐 Authentication & Routing

### App.js with Routing
```javascript
// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/common/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';

import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;

  return children;
};

function AppContent() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/admin" element={
          <PrivateRoute adminOnly>
            <AdminPanel />
          </PrivateRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

### Auth Context
```javascript
// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        setUser(decoded);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    const decoded = jwt_decode(token);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 📱 Responsive Design

Use Material-UI's responsive breakpoints:

```javascript
// Responsive grid
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4} lg={3}>
    {/* Content */}
  </Grid>
</Grid>

// Responsive typography
<Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
  Title
</Typography>
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Set environment variables in Vercel dashboard

### Deploy to Netlify
1. Drag and drop the `build` folder to Netlify
2. Set environment variables in Netlify dashboard

## 🧪 Testing

### Unit Tests
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### E2E Tests
```bash
npm install --save-dev cypress
```

## 📋 Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Loading States**: Show loading indicators for better UX
3. **Form Validation**: Use react-hook-form for complex forms
4. **State Management**: Use Redux for complex state, Context for simple
5. **Code Splitting**: Use React.lazy for route-based code splitting
6. **Performance**: Implement memoization with React.memo
7. **Accessibility**: Use semantic HTML and ARIA attributes
8. **Security**: Never store sensitive data in localStorage

## 🔧 Troubleshooting

### Common Issues
- **CORS errors**: Ensure backend has proper CORS configuration
- **Token expiration**: Implement token refresh logic
- **File upload issues**: Check file size limits and types
- **Mobile responsiveness**: Test on various screen sizes

### Debug Tips
- Use React DevTools for component inspection
- Check Network tab for API call failures
- Use console.log for debugging (remove in production)
- Test API endpoints with Postman before frontend integration

This guide provides a comprehensive foundation for building a robust frontend application. Follow the structure and patterns outlined here to ensure maintainable and scalable code.</content>
<parameter name="filePath">/workspaces/Airswift-Backend/FRONTEND_GUIDE.md