import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api'; // Adjust path as needed
import { initSocket, disconnectSocketConnection, reconnectSocketConnection } from './socket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Initialize Socket.IO connection with token
        if (token) {
          initSocket(token);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user during session validation:', error.message);
      
      // Only clear auth on 401/403 (unauthorized/forbidden)
      // Don't clear on network errors or other 5xx errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        disconnectSocketConnection();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login - Set user data and initialize socket connection
   * @param {Object} userData - User information from server
   * @param {string} token - JWT token for authentication
   * @param {Function} onSuccess - Optional callback after successful login
   */
  const login = (userData, token, onSuccess) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    
    // Initialize Socket.IO connection for real-time updates
    if (token) {
      initSocket(token);
    }

    // Redirect based on role if callback provided
    if (typeof onSuccess === 'function') {
      onSuccess(userData);
    } else if (typeof window !== 'undefined') {
      // Fallback: Redirect based on role
      const redirectPath = userData?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      const currentPath = window.location.pathname;
      
      // Only redirect if not already on the target page
      if (currentPath !== redirectPath && currentPath !== '/') {
        window.location.href = redirectPath;
      }
    }
  };

  /**
   * Logout - Clear user data and disconnect socket
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    disconnectSocketConnection();
  };

  /**
   * Refresh user data - Fetch fresh user info from server
   * Useful when admin updates user status
   */
  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await fetchUser(token);
    }
  };

  /**
   * Reconnect socket - Re-establish socket connection
   * Useful when connection drops
   */
  const reconnectSocket = () => {
    const token = localStorage.getItem("token");
    if (token) {
      reconnectSocketConnection(token);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      refreshUser,
      reconnectSocket 
    }}>
      {children}
    </AuthContext.Provider>
  );
};