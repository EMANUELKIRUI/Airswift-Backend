const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    let credential;

    // Try to load from service account JSON file first (recommended)
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      // Load from JSON file
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Fallback to environment variables
      // Make sure the private key is properly formatted
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : null;

      if (!privateKey || privateKey.includes('your-private-key-here')) {
        console.warn('Firebase service account not configured. Please set up Firebase credentials.');
        console.warn('See FIREBASE_SETUP.md for instructions.');
        return null;
      }

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };

      credential = admin.credential.cert(serviceAccount);
    }

    try {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error.message);
      console.warn('Firebase authentication will not be available until properly configured.');
      return null;
    }
  }
  return admin;
};

module.exports = { initializeFirebase, admin };