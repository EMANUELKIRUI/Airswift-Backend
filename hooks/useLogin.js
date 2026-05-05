import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import api from '../api';

/**
 * Custom hook for handling login with automatic role-based redirect
 * Usage in login form:
 *   const { login, loading, error } = useLogin();
 *   const handleSubmit = async (email, password) => {
 *     await login(email, password);
 *   };
 */
export const useLogin = () => {
  const { login: setAuthUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend login endpoint
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error('Invalid login response from server');
      }

      console.log('✅ Login successful for:', user.email);
      console.log('👤 User role:', user.role);

      // Use auth context to set user and initialize socket
      setAuthUser(user, token, () => {
        // Redirect based on role
        if (user.role === 'admin') {
          console.log('📍 Redirecting admin to /admin/dashboard');
          router.push('/admin/dashboard');
        } else {
          console.log('📍 Redirecting user to /dashboard');
          router.push('/dashboard');
        }
      });

      return { success: true, user };
    } catch (err) {
      console.error('❌ Login error:', err.message);
      
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please try again.';

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};

export default useLogin;
