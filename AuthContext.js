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

  const normalizeUser = (userData) => {
    if (!userData) return null;
    const normalizedUser = { ...userData };
    if (!normalizedUser.role && normalizedUser.email === 'admin@talex.com') {
      normalizedUser.role = 'admin';
    }
    if (!normalizedUser.id && normalizedUser._id) {
      normalizedUser.id = normalizedUser._id;
    }
    return normalizedUser;
  };

  const fetchUser = async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseUser = response.data.user || response.data;
      const normalizedUser = normalizeUser(responseUser);
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Initialize Socket.IO connection with token
      if (token) {
        initSocket(token);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      disconnectSocketConnection();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login - Set user data and initialize socket connection
   * @param {Object} userData - User information from server
   * @param {string} token - JWT token for authentication
   */
  const login = (userData, token) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", token);
    
    // Initialize Socket.IO connection for real-time updates
    if (token) {
      initSocket(token);
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