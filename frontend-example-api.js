// ✅ FIXED: API Configuration with Axios Interceptors
// Copy this to your frontend application (src/api.js or src/services/api.js)

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Include cookies for authentication
});

// ✅ REQUEST INTERCEPTOR: Add Authorization header with Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  console.log('📤 API REQUEST INTERCEPTOR:');
  console.log('   URL:', config.url);
  console.log('   Token in localStorage:', token ? '✓ EXISTS' : '✗ MISSING');

  // ✅ FIX: Add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('   Authorization header set: Bearer [token]');
  } else {
    console.warn('   ⚠️ No token found - request may fail with 401');
  }

  return config;
});

// ✅ RESPONSE INTERCEPTOR: Handle authentication errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API RESPONSE:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API ERROR:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      console.warn('🔐 UNAUTHORIZED - Clearing token and redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;