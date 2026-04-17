import React, { useState } from 'react';
import AuthService from './authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const result = await AuthService.requestPasswordReset(email);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-container">
        <div className="reset-success">
          <h2>Reset Email Sent!</h2>
          <p>We've sent a password reset link to your email address.</p>
          <p>Please check your inbox and follow the instructions to reset your password.</p>
          <p>If you don't see the email, check your spam folder.</p>
          <button onClick={() => window.location.href = '/login'} className="login-btn">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <h2>Forgot Your Password?</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
        </button>
      </form>

      <div className="forgot-links">
        <a href="/login">Back to Login</a>
      </div>
    </div>
  );
};

export default ForgotPassword;