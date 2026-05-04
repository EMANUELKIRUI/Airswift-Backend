import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AuthService from '../authService';
import { redirectAfterLogin } from '../lib/auth';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session } = useSession();

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await AuthService.login(email, password);

      if (result.success) {
        console.log('✅ Login successful, redirecting...');

        // ✅ KEY: Call redirectAfterLogin after successful login
        // Admin users go straight to /admin/dashboard.
        // Regular users go to /dashboard if they already submitted an application,
        // or to /apply if they still need to fill out the form.
        await redirectAfterLogin(result.user, router);
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
      <h2>Login to Airswift</h2>
      
      {/* ✅ Google Sign-In Section */}
      <div className="social-login">
        <GoogleSignInButton full={true} />
        <div className="divider">
          <span>or</span>
        </div>
      </div>

      {/* ✅ Email/Password Form Section */}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@airswift.com or user@example.com"
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
        <p>Admin: admin@airswift.com (redirects to /admin/dashboard)</p>
        <p>Regular User: any registered user (redirects to /dashboard)</p>
      </div>

      <div className="auth-help">
        <p>Don't have an account? <a href="/register">Register here</a></p>
      </div>
    </div>
  );
};

export default LoginPage;
