# Frontend Developer Guide - Airswift Job Portal

## 📋 Overview

This guide provides comprehensive documentation for frontend developers working on the Airswift job portal application. The frontend is built with **Next.js** and **React**, providing a modern, server-side rendered user experience.

## 🏗️ Project Structure

```
Airswift-Backend/
├── components/           # Reusable React components
│   ├── UserLayout.jsx    # Main layout with sidebar/topbar
│   ├── UserSidebar.jsx   # Navigation sidebar
│   ├── UserTopBar.jsx    # Top navigation bar
│   ├── LoginPage.jsx     # Authentication page
│   ├── NotificationBell.jsx # Notification component
│   └── ...
├── pages/               # Next.js pages (auto-routed)
│   ├── _app.js         # App wrapper with providers
│   ├── dashboard.jsx   # User dashboard
│   ├── apply.jsx       # Job application form
│   ├── applications.jsx # User's applications
│   ├── interviews.jsx  # Interview management
│   ├── messages.jsx    # Messaging interface
│   └── ...
├── context/            # React Context providers
│   ├── AuthContext.js  # Authentication state
│   └── NotificationContext.jsx # Notifications
├── styles/             # CSS stylesheets
│   ├── UserLayout.css  # Layout styling
│   ├── globals.css     # Global styles
│   └── ...
├── api.js              # Axios API client configuration
├── lib/                # Utility libraries
│   └── auth.js         # Authentication helpers
└── socket.js           # Socket.IO client setup
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Git** for version control
- Backend server running (see Backend Developer Guide)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EMANUELKIRUI/Airswift-Backend.git
   cd Airswift-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

## 🔧 Core Technologies

### Next.js Framework
- **File-based routing**: Pages in `/pages` are auto-routed
- **Server-side rendering**: Improved SEO and performance
- **API routes**: Backend endpoints in `/pages/api`
- **Image optimization**: Automatic image optimization

### React Ecosystem
- **React 18**: Latest React with concurrent features
- **Context API**: State management for auth/notifications
- **Hooks**: useState, useEffect, useContext for state management

### UI & Styling
- **CSS Modules**: Scoped styling per component
- **Responsive Design**: Mobile-first approach
- **Custom Properties**: CSS variables for theming

### HTTP Client
- **Axios**: Configured API client with interceptors
- **Automatic auth**: JWT tokens added to requests
- **Error handling**: Centralized error management

## 🔐 Authentication System

### AuthContext Provider

The `AuthContext` manages user authentication state across the application.

```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return <div>Welcome, {user?.name}!</div>;
};
```

### Login Flow

1. User submits credentials on `LoginPage`
2. `AuthService.login()` calls `/api/auth/login`
3. JWT token stored in localStorage
4. User redirected based on role:
   - Admin → `/admin/dashboard`
   - User → `/dashboard` or `/apply`

### Protected Routes

Use the `protect` HOC for authenticated routes:

```javascript
// In pages/protected.jsx
import { withAuth } from '../lib/auth';

const ProtectedPage = () => {
  return <div>Protected content</div>;
};

export default withAuth(ProtectedPage);
```

## 📡 API Integration

### API Client Setup

The `api.js` file configures Axios with:

- Base URL from environment variables
- Automatic JWT token injection
- Request/response interceptors
- Error handling

### Making API Calls

```javascript
import api from '../api';

// GET request
const fetchData = async () => {
  try {
    const response = await api.get('/endpoint');
    console.log(response.data);
  } catch (error) {
    console.error('API Error:', error);
  }
};

// POST request with data
const submitData = async (data) => {
  try {
    const response = await api.post('/endpoint', data);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### File Uploads

For multipart/form-data requests:

```javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
```

### API Endpoints Reference

The frontend interacts with the following backend API endpoints:

#### Authentication APIs

**POST /api/auth/login**
- **Description**: Authenticate user and return JWT token
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user"
    },
    "token": "jwt_token_here"
  }
  ```

**GET /api/auth/me**
- **Description**: Get current authenticated user information
- **Headers**: Authorization: Bearer {token}
- **Response**:
  ```json
  {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user"
    }
  }
  ```

#### User Dashboard APIs

**GET /api/user/dashboard**
- **Description**: Get user dashboard statistics
- **Headers**: Authorization: Bearer {token}
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user"
    },
    "stats": {
      "totalApplications": 5,
      "pendingApplications": 2,
      "acceptedApplications": 1,
      "interviewsScheduled": 3,
      "unreadMessages": 4
    }
  }
  ```

#### Job Management APIs

**GET /api/jobs**
- **Description**: Get list of available jobs
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search term
- **Response**:
  ```json
  {
    "jobs": [
      {
        "id": "job_id",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "description": "Job description...",
        "location": "Remote",
        "salary": "50000-70000",
        "status": "active"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "pages": 5
    }
  }
  ```

#### Application Management APIs

**POST /api/applications**
- **Description**: Submit a new job application
- **Headers**: Authorization: Bearer {token}, Content-Type: multipart/form-data
- **Request Body** (FormData):
  - `job_id`: Job ID (string)
  - `cover_letter`: Cover letter text (string)
  - `cv`: CV file (file)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Application submitted successfully",
    "application": {
      "id": "application_id",
      "status": "pending"
    }
  }
  ```

**GET /api/applications/my**
- **Description**: Get user's job applications
- **Headers**: Authorization: Bearer {token}
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response**:
  ```json
  {
    "applications": [
      {
        "id": "application_id",
        "job": {
          "title": "Software Engineer",
          "company": "Tech Corp"
        },
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "pages": 1
    }
  }
  ```

#### Interview Management APIs

**GET /api/interviews/my**
- **Description**: Get user's scheduled interviews
- **Headers**: Authorization: Bearer {token}
- **Response**:
  ```json
  {
    "interviews": [
      {
        "id": "interview_id",
        "job": {
          "title": "Software Engineer"
        },
        "scheduledAt": "2024-01-20T14:00:00Z",
        "location": "Zoom Meeting",
        "status": "scheduled"
      }
    ]
  }
  ```

#### Messaging APIs

**GET /api/messages**
- **Description**: Get user's messages/conversations
- **Headers**: Authorization: Bearer {token}
- **Response**:
  ```json
  {
    "messages": [
      {
        "id": "message_id",
        "sender_id": "admin",
        "recipient_id": "user_id",
        "content": "Your application has been received",
        "read": false,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
  ```

**POST /api/messages**
- **Description**: Send a new message
- **Headers**: Authorization: Bearer {token}
- **Request Body**:
  ```json
  {
    "recipient_id": "admin",
    "content": "Thank you for the update"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": {
      "id": "message_id",
      "content": "Thank you for the update",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  }
  ```

#### Notification APIs

**GET /api/notifications**
- **Description**: Get user's notifications
- **Headers**: Authorization: Bearer {token}
- **Response**:
  ```json
  {
    "notifications": [
      {
        "id": "notification_id",
        "type": "info",
        "title": "Application Update",
        "message": "Your application status has changed",
        "read": false,
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ]
  }
  ```

#### Admin APIs (for admin users)

**GET /api/admin/audit-logs**
- **Description**: Get audit logs (admin only)
- **Headers**: Authorization: Bearer {token}
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 15)
  - `search`: Search term
  - `action`: Filter by action type
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "log_id",
        "action": "LOGIN",
        "user_id": {
          "name": "User Name",
          "email": "user@example.com"
        },
        "description": "User logged in",
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pages": 7
    }
  }
  ```

### Error Handling

All API calls should handle errors appropriately:

```javascript
try {
  const response = await api.get('/endpoint');
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized - redirect to login
    localStorage.removeItem('token');
    router.push('/login');
  } else if (error.response?.status === 403) {
    // Handle forbidden - show permission error
    setError('You do not have permission to perform this action');
  } else if (error.response?.status === 404) {
    // Handle not found
    setError('Resource not found');
  } else {
    // Handle other errors
    setError(error.response?.data?.message || 'An error occurred');
  }
}
```

### Response Format Standards

Most API responses follow this structure:

**Success Response**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

**Paginated Response**:
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

## 🎨 Component Architecture

### User Layout System

The application uses a consistent layout structure:

```jsx
// UserLayout.jsx - Main wrapper
<UserLayout>
  <DashboardContent />
</UserLayout>
```

#### UserSidebar
- Navigation menu with active state tracking
- Logout functionality
- Responsive design

#### UserTopBar
- Logo and branding
- User profile dropdown
- Notification bell integration

### Page Components

#### Dashboard (`pages/dashboard.jsx`)
- Fetches user stats from `/api/user/dashboard`
- Displays summary cards and recent activity
- Real-time updates via polling

#### Apply (`pages/apply.jsx`)
- Job selection dropdown from `/api/jobs`
- File upload for CV/resume
- Form validation and submission

#### Applications (`pages/applications.jsx`)
- Table view of user's applications
- Status badges and filtering
- Pagination support

#### Interviews (`pages/interviews.jsx`)
- Card-based interview display
- Calendar integration
- Status management

#### Messages (`pages/messages.jsx`)
- Real-time messaging interface
- Conversation management
- Socket.IO integration

## 🔔 Notification System

### NotificationContext

Manages application-wide notifications:

```javascript
import { useNotification } from '../context/NotificationContext';

const MyComponent = () => {
  const { addNotification, removeNotification } = useNotification();

  const showSuccess = () => {
    addNotification({
      type: 'success',
      title: 'Success!',
      message: 'Operation completed successfully',
    });
  };
};
```

### Notification Types
- `success`: Green notifications
- `error`: Red notifications
- `warning`: Yellow notifications
- `info`: Blue notifications

### NotificationBell Component

Displays unread count and dropdown menu with recent notifications.

## 🔌 Real-Time Features

### Socket.IO Integration

Real-time features are handled through Socket.IO:

```javascript
import { initSocket } from '../socket';

// Initialize socket connection
const socket = initSocket(token);

// Listen for events
socket.on('message:new', (data) => {
  // Handle new message
});

socket.on('interview:updated', (data) => {
  // Handle interview update
});
```

### Real-Time Events
- New messages
- Interview status changes
- Application updates
- Notification broadcasts

## 🎨 Styling Guidelines

### CSS Architecture

- **Component-scoped styles**: Each component has its own CSS file
- **CSS Modules**: Avoid global style conflicts
- **Utility classes**: Reusable classes for common patterns

### Naming Convention

```css
/* Component styles */
.my-component {
  /* Styles */
}

.my-component__element {
  /* Element styles */
}

.my-component--modifier {
  /* Modifier styles */
}
```

### Responsive Design

Use mobile-first approach with breakpoints:

```css
/* Mobile first */
.my-component {
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .my-component {
    width: 50%;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .my-component {
    width: 33.33%;
  }
}
```

### Theme Variables

Use CSS custom properties for consistent theming:

```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
}
```

## 🧪 Testing

### Unit Testing

Use Jest and React Testing Library:

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

### Integration Testing

Test component interactions and API calls:

```javascript
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits form successfully', async () => {
  render(<ApplicationForm />);
  userEvent.type(screen.getByLabelText('Name'), 'John Doe');
  userEvent.click(screen.getByText('Submit'));

  await waitFor(() => {
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});
```

## 🚀 Deployment

### Build Process

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Environment Variables

Production environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.airswift.com/api
NODE_ENV=production
```

### Static Export (Optional)

For static hosting:

```bash
npm run export
```

## 📚 Best Practices

### Code Quality

- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **TypeScript**: Type safety (future migration)

### Performance

- **Code splitting**: Lazy load components
- **Image optimization**: Use Next.js Image component
- **Bundle analysis**: Monitor bundle size

### Accessibility

- **Semantic HTML**: Proper heading hierarchy
- **ARIA labels**: Screen reader support
- **Keyboard navigation**: Full keyboard accessibility

### Security

- **Input validation**: Sanitize user inputs
- **XSS prevention**: Escape dynamic content
- **CSRF protection**: Use CSRF tokens

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check backend server is running
   - Verify API_BASE_URL in environment
   - Check network connectivity

2. **Authentication Errors**
   - Clear localStorage tokens
   - Check token expiration
   - Verify user permissions

3. **Styling Issues**
   - Check CSS Modules import
   - Verify className spelling
   - Inspect element for applied styles

### Debug Mode

Enable debug logging:

```javascript
// In component
console.log('Debug:', data);
```

## 📞 Support

For questions or issues:

1. Check this documentation first
2. Review existing issues on GitHub
3. Create a new issue with detailed information
4. Contact the development team

## 🔄 Future Enhancements

### Planned Features

- **Dark mode**: Theme switching
- **PWA**: Progressive Web App features
- **Offline support**: Service workers
- **Multi-language**: Internationalization
- **Advanced analytics**: User behavior tracking

### Technology Upgrades

- **TypeScript migration**: Type safety
- **Next.js 13**: App Router
- **Tailwind CSS**: Utility-first styling
- **React Query**: Data fetching and caching

---

*This guide is maintained by the Airswift development team. Last updated: April 2026*