# Firebase Authentication Setup Guide

This guide explains how to set up Firebase Authentication for the Airswift Backend.

## Prerequisites

1. A Google account
2. A Firebase project

## Firebase Project Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "airswift-backend")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the sign-in providers you want to use:
   - Email/Password
   - Google
   - Facebook
   - etc.

### 3. Generate Service Account Key

1. In your Firebase project, go to "Project settings" (gear icon)
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file - this contains your service account credentials

## Backend Configuration

### 1. Update Environment Variables

Update your `.env` file with the Firebase credentials from the downloaded JSON:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# Frontend URL for Firebase auth links
FRONTEND_URL=http://localhost:3000
```

**Important:** Replace the `\n` in the private key with actual newlines.

### 2. Database Migration

If you're using a database, you may need to run migrations to add the new Firebase fields to the User table:

```bash
# If using Sequelize CLI
npx sequelize-cli db:migrate

# Or manually update your database schema to include:
# - firebaseUid (string, unique, nullable)
# - authProvider (string, default 'local')
# - profilePicture (string, nullable)
```

## API Endpoints

The following Firebase authentication endpoints are now available:

### Authentication Endpoints

- `POST /api/firebase-auth/verify-token` - Verify Firebase ID token
- `POST /api/firebase-auth/sync-user` - Sync Firebase user with local database
- `GET /api/firebase-auth/profile` - Get user profile
- `PUT /api/firebase-auth/profile` - Update user profile
- `DELETE /api/firebase-auth/account` - Delete user account
- `POST /api/firebase-auth/custom-token` - Create custom token (admin)
- `POST /api/firebase-auth/sign-in-link` - Generate email sign-in link
- `GET /api/firebase-auth/dashboard` - Protected dashboard route

### Usage Examples

#### Client-Side Authentication

```javascript
// Sign in with Firebase Auth
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase-config';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Send token to backend
const response = await fetch('/api/firebase-auth/verify-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Backend Verification

```javascript
// The middleware automatically verifies tokens
// User info is available in req.user
router.get('/protected', verifyFirebaseToken, (req, res) => {
  res.json({ user: req.user });
});
```

## Security Considerations

1. **Environment Variables**: Never commit Firebase credentials to version control
2. **Token Validation**: Always use the Firebase middleware to validate tokens
3. **User Sync**: Consider syncing Firebase users with your local database for additional user data
4. **Rate Limiting**: Firebase routes inherit the same rate limiting as other routes
5. **CORS**: Ensure your frontend domain is allowed in CORS settings

## Testing

Test the Firebase authentication:

```bash
# Test token verification
curl -X POST http://localhost:5000/api/firebase-auth/verify-token \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json"

# Test protected route
curl -X GET http://localhost:5000/api/firebase-auth/dashboard \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Troubleshooting

### Common Issues

1. **"Invalid token"**: Check that the Firebase ID token is valid and not expired
2. **"Project not found"**: Verify FIREBASE_PROJECT_ID in your .env file
3. **"Invalid credentials"**: Ensure all Firebase environment variables are correctly set
4. **"CORS error"**: Add your frontend domain to the CORS configuration

### Firebase Console Logs

Check the Firebase Console for authentication events and errors.

## Next Steps

1. Implement Firebase Authentication in your frontend
2. Add additional sign-in methods (Google, Facebook, etc.)
3. Implement password reset functionality
4. Add user roles and permissions
5. Set up Firebase Security Rules for Firestore (if using)