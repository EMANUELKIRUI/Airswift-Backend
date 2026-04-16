// ✅ AUTHENTICATION SERVICE - Centralized Auth Management
// Use this file to manage all authentication-related operations

import api from './api';
import { reconnectSocketConnection, disconnectSocketConnection } from './socket';

class AuthService {
  // ==========================================
  // TOKEN MANAGEMENT
  // ==========================================

  /**
   * Store token and user data after login
   */
  static storeToken(token, user) {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'admin') {
        localStorage.setItem('adminToken', token);
      }

      console.log('✅ Token stored successfully:', token.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('❌ Error storing token:', error);
      return false;
    }
  }

  /**
   * Get token from localStorage
   */
  static getToken() {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Get user data from localStorage
   */
  static getUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('❌ Error retrieving user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated() {
    return this.getToken() !== null;
  }

  /**
   * Check if user is admin
   */
  static isAdmin() {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  // ==========================================
  // AUTHENTICATION OPERATIONS
  // ==========================================

  /**
   * Login user with email and password
   */
  static async login(email, password) {
    try {
      console.log('🔐 Logging in user:', email);

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      console.log('✅ Login successful');

      if (response.data.token && response.data.user) {
        // Store token and user
        this.storeToken(response.data.token, response.data.user);

        // Reconnect socket with new token
        console.log('🔌 Reconnecting socket with token...');
        const socket = reconnectSocketConnection();
        if (socket) {
          console.log('✅ Socket reconnected:', socket.id);
        }

        return {
          success: true,
          token: response.data.token,
          user: response.data.user,
        };
      } else {
        throw new Error('Login response missing token or user data');
      }
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Logout user
   */
  static logout() {
    try {
      console.log('🚪 Logging out user...');

      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminToken');

      // Disconnect socket
      disconnectSocketConnection();

      console.log('✅ User logged out successfully');
      return true;
    } catch (error) {
      console.error('❌ Error during logout:', error);
      return false;
    }
  }

  /**
   * Register new user
   */
  static async register(userData) {
    try {
      console.log('📝 Registering user:', userData.email);

      const response = await api.post('/auth/register', userData);

      console.log('✅ Registration successful');
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(email, otp) {
    try {
      console.log('🔐 Verifying OTP for:', email);

      const response = await api.post('/auth/verify-otp', {
        email,
        otp,
      });

      console.log('✅ OTP verified successfully');

      if (response.data.token && response.data.user) {
        this.storeToken(response.data.token, response.data.user);

        // Reconnect socket
        reconnectSocketConnection();

        return {
          success: true,
          token: response.data.token,
          user: response.data.user,
        };
      }

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ OTP verification error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken() {
    try {
      console.log('🔄 Refreshing token...');

      const response = await api.post('/auth/refresh');

      if (response.data.token) {
        const user = this.getUser();
        this.storeToken(response.data.token, user);

        console.log('✅ Token refreshed successfully');

        // Reconnect socket with new token
        reconnectSocketConnection();

        return {
          success: true,
          token: response.data.token,
        };
      }

      throw new Error('No token in refresh response');
    } catch (error) {
      console.error('❌ Token refresh error:', error.message);

      // If refresh fails, logout user
      this.logout();

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // ==========================================
  // PROFILE OPERATIONS
  // ==========================================

  /**
   * Get current user profile
   */
  static async getProfile() {
    try {
      console.log('👤 Fetching user profile...');

      const response = await api.get('/auth/profile');

      console.log('✅ Profile fetched successfully');
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      console.error('❌ Error fetching profile:', error.message);

      if (error.response?.status === 401) {
        console.log('🔄 Token invalid, attempting refresh...');
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          // Retry fetching profile
          return this.getProfile();
        } else {
          this.logout();
        }
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates) {
    try {
      console.log('📝 Updating profile...');

      const response = await api.put('/auth/profile', updates);

      // Update stored user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      console.log('✅ Profile updated successfully');
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      console.error('❌ Error updating profile:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // ==========================================
  // PASSWORD OPERATIONS
  // ==========================================

  /**
   * Request password reset
   */
  static async requestPasswordReset(email) {
    try {
      console.log('🔐 Requesting password reset for:', email);

      const response = await api.post('/auth/forgot-password', {
        email,
      });

      console.log('✅ Password reset requested');
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ Password reset request error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token, newPassword) {
    try {
      console.log('🔐 Resetting password...');

      const response = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      console.log('✅ Password reset successfully');
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ Password reset error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Change password
   */
  static async changePassword(currentPassword, newPassword) {
    try {
      console.log('🔐 Changing password...');

      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      console.log('✅ Password changed successfully');
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ Password change error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get authorization header for manual API calls
   */
  static getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Clear all auth data on error
   */
  static clearAuthData() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminToken');
      disconnectSocketConnection();
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  }
}

export default AuthService;
