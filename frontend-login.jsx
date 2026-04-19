// ✅ FIXED LOGIN COMPONENT - Stores Token Correctly & Reconnects Socket
// Copy this to your frontend login page

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from './api'; // Your API configuration
import { initSocket } from './lib/socket';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) return;

    if (storedUser.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }

    if (storedUser.hasSubmittedApplication) {
      navigate('/dashboard');
      return;
    }

    navigate('/apply');
  }, [navigate]);

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

      if (!response.data.token || !response.data.user) {
        throw new Error('Login response missing required authentication data');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      console.log("Saved user:", response.data.user);

      if (response.data.user.role.toLowerCase() === 'admin') {
        localStorage.setItem('adminToken', response.data.token);
      }

      console.log('🔌 Initializing socket with token...');
      const socket = initSocket(response.data.token);
      if (socket) {
        console.log('✅ Socket initialized:', socket.id);
      }

      const user = response.data.user;
      if (user.role.toLowerCase() === 'admin') {
        console.log('🔄 Redirecting to:', '/admin/dashboard');
        router.replace('/admin/dashboard');
      } else if (user.hasSubmittedApplication) {
        console.log('🔄 Redirecting to:', '/dashboard');
        router.replace('/dashboard');
      } else {
        console.log('🔄 Redirecting to:', '/apply');
        router.replace('/apply');
      }
    } catch (err) {
      console.error('❌ Login failed:', err);
      setError(err.response?.data?.message || err.message || 'Login failed');
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

      <div className="login-links">
        <a href="/forgot-password">Forgot Password?</a>
      </div>
    </div>
  );
};

export default Login;
