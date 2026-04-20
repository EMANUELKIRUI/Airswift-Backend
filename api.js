// ✅ FIXED: API Configuration with Axios Interceptors
// This file provides automatic Authorization header handling

import axios from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com/api';
const normalizedBaseUrl = rawApiUrl.replace(/\/+$/, '');
const baseURL = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

// Create axios instance with base configuration
const api = axios.create({
  baseURL,
  withCredentials: true, // Include cookies for authentication
});

console.log('📡 API baseURL set to:', baseURL);

// ✅ REQUEST INTERCEPTOR: Add Authorization header with Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  console.log('📤 API REQUEST INTERCEPTOR:');
  console.log('   URL:', config.url);
  console.log('   Method:', config.method?.toUpperCase());
  console.log('   Token in localStorage:', token ? '✓ EXISTS' : '✗ MISSING');

  // ✅ FIX: Add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('   ✅ Authorization header set: Bearer [token]');
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
    const status = error.response?.status;
    const url = error.config?.url;
    const message = error.response?.data?.message || error.message;

    console.error('❌ API ERROR:', {
      status,
      url,
      message
    });

    // Only clear auth and redirect on explicit 401 UNAUTHORIZED responses
    // Skip for profile/me endpoints to avoid redirect loops during session validation
    if (status === 401 && url && !url.includes('/auth/me') && !url.includes('/auth/profile')) {
      console.warn('🔐 UNAUTHORIZED - Clearing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      
      // Show alert only if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        alert("Session expired. Please login again.");
        window.location.href = '/login';
      }
    } else if (!error.response) {
      console.error('🌐 NETWORK ERROR - No response from server');
    }

    return Promise.reject(error);
  }
);

export default api;