// ✅ SAMPLE LOGIN COMPONENT
// This shows how to use redirectAfterLogin after successful login

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import AuthService from '../authService';
import { redirectAfterLogin } from '../lib/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await AuthService.login(email, password);

      if (result.success) {
        console.log('✅ Login successful, redirecting...');

        // ✅ KEY: Call redirectAfterLogin after successful login
        // Admin users go straight to /dashboard.
        // Regular users go to /dashboard if they already submitted an application,
        // or to /apply if they still need to fill out the form.
        await redirectAfterLogin(result.user, router);

        // Alternative: Manual redirect if you prefer
        // if (result.user.role === 'admin') {
        //   router.push('/admin/dashboard');
        // } else if (result.user.hasSubmittedApplication) {
        //   router.push('/dashboard');
        // } else {
        //   router.push('/apply');
        // }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@talex.com or user@example.com"
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

      <div className="info">
        <p><strong>Test Accounts:</strong></p>
        <p>Admin: admin@talex.com (redirects to /admin/dashboard)</p>
        <p>Regular User: any registered user (redirects to /dashboard)</p>
      </div>
    </div>
  );
};

export default LoginPage;