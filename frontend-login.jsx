// ✅ FIXED LOGIN COMPONENT - Stores Token Correctly & Reconnects Socket
// Copy this to your frontend login page

import React, { useState } from 'react';
import api from './api'; // Your API configuration
import { reconnectSocketConnection } from './socket'; // Import socket reconnect function

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      console.log('LOGIN RESPONSE:', response.data);

      // 🔥 CRITICAL: Store token after successful login
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // 🔥 For admin users, also store as adminToken for admin pages
        if (response.data.user && response.data.user.role === 'admin') {
          localStorage.setItem("adminToken", response.data.token);
        }

        console.log('✅ Token stored successfully:', response.data.token.substring(0, 20) + '...');

        // 🔥 NEW: Reconnect socket with new token
        console.log('🔌 Reconnecting socket with token...');
        const socket = reconnectSocketConnection();
        if (socket) {
          console.log('✅ Socket reconnected:', socket.id);
        } else {
          console.warn('⚠️ Socket connection deferred (will retry)');
        }

        // Redirect to dashboard or home page
        window.location.href = response.data.user.role === 'admin' ? '/admin' : '/dashboard';
      } else {
        setError('Login failed: No token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else {
        alert("Something went wrong");
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
