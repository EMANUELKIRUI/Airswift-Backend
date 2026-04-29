/**
 * ✅ AXIOS API CLIENT CONFIGURATION
 * Centralized API client with automatic authentication and error handling
 * 
 * Usage:
 *   import api from './api';
 *   const response = await api.get('/endpoint');
 */

import axios from 'axios';

// Get the API base URL from environment variables
const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  'http://localhost:5000/api';

console.log('📡 API baseURL set to:', API_BASE_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

/**
 * REQUEST INTERCEPTOR
 * Automatically adds authentication token to all requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request details for debugging
    console.log('📤 API REQUEST INTERCEPTOR:');
    console.log('   URL:', config.url);
    console.log('   Method:', config.method.toUpperCase());
    console.log('   Content-Type:', config.headers['Content-Type']);
    console.log('   Token in localStorage:', token ? '✓ EXISTS' : '✗ MISSING');
    if (token) {
      console.log('   ✅ Authorization header set: Bearer [token]');
    }
    if (config.data) {
      console.log('   📦 Request body:', config.data);
      console.log('   📦 Body type:', typeof config.data);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles responses and common errors
 */
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API RESPONSE: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    console.error('❌ API ERROR:', error.response?.data || error);

    // Handle 401 Unauthorized - redirect to login
    if (status === 401) {
      console.warn('🔐 Unauthorized - clearing auth and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden - user lacks permissions
    if (status === 403) {
      console.warn('🚫 Forbidden - user lacks required permissions');
    }

    // Handle 404 Not Found
    if (status === 404) {
      console.warn('🔍 Endpoint not found (404):', error.config?.url);
    }

    // Handle 500 Server Error
    if (status === 500) {
      console.error('⚠️  Server error (500) - backend issue:', message);
    }

    return Promise.reject(error);
  }
);

export default api;
