import React, { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../api';

/**
 * ✅ REGISTRATION COMPONENT WITH GMAIL VALIDATION
 * - Enforces @gmail.com requirement for regular users
 * - Real-time email validation
 * - Proper error handling and feedback
 */
function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * ✅ Email validation function
   * - Ensures @gmail.com domain
   * - Validates format
   */
  const validateEmail = (emailAddress) => {
    if (!emailAddress) {
      return {
        valid: false,
        message: '📧 Email address is required'
      };
    }

    // Check domain
    if (!emailAddress.endsWith('@gmail.com')) {
      return {
        valid: false,
        message: '❌ Only Gmail addresses (@gmail.com) are allowed for user registration. Please use a valid Gmail account.'
      };
    }

    // Check email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(emailAddress)) {
      return {
        valid: false,
        message: '❌ Invalid Gmail address format. Example: yourname@gmail.com'
      };
    }

    return { 
      valid: true, 
      message: '✅ Valid Gmail address'
    };
  };

  /**
   * Validate password strength
   */
  const validatePassword = (password) => {
    if (!password) {
      return {
        valid: false,
        message: 'Password is required'
      };
    }

    if (password.length < 8) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters long'
      };
    }

    // Check for mixed case and numbers
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return {
        valid: false,
        message: 'Password must contain uppercase, lowercase, and numbers'
      };
    }

    return { 
      valid: true, 
      message: '✅ Password is strong'
    };
  };

  /**
   * Handle input changes with real-time validation
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }

    // Real-time validation for email
    if (name === 'email') {
      if (value) {
        const validation = validateEmail(value);
        setErrors(prev => ({
          ...prev,
          email: validation.valid ? '' : validation.message
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          email: ''
        }));
      }
    }

    // Real-time validation for password
    if (name === 'password') {
      if (value) {
        const validation = validatePassword(value);
        setErrors(prev => ({
          ...prev,
          password: validation.valid ? '' : validation.message
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          password: ''
        }));
      }
    }

    // Check password match
    if (name === 'confirmPassword' || name === 'password') {
      const pwd = name === 'password' ? value : formData.password;
      const confirm = name === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (confirm && pwd && pwd !== confirm) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: '❌ Passwords do not match'
        }));
      } else if (confirm) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  /**
   * Validate all form fields
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '❌ Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    // Validate form
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Registering user with Gmail:', formData.email);
      
      const response = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name
      });

      console.log('✅ Registration successful:', response.data);
      
      setSuccessMessage('✅ Registration successful! Redirecting to dashboard...');

      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // Redirect after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('❌ Registration error:', err);
      
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Registration failed. Please try again.';
      
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1>Create Account</h1>
            <p>Join TALEX using your Gmail account</p>
          </div>

          {generalError && (
            <div className="alert alert-error">
              <span>❌ {generalError}</span>
              <button 
                onClick={() => setGeneralError('')}
                className="alert-close"
              >
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success">
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="register-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                📧 Gmail Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="yourname@gmail.com"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => {
                  if (formData.email) {
                    const validation = validateEmail(formData.email);
                    if (!validation.valid) {
                      setErrors(prev => ({
                        ...prev,
                        email: validation.message
                      }));
                    }
                  }
                }}
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                required
              />
              {errors.email && (
                <p className="field-error">{errors.email}</p>
              )}
              <p className="field-hint">
                ℹ️ Only Gmail addresses (@gmail.com) are accepted for user registration
              </p>
            </div>

            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                👤 Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your Full Name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                required
              />
              {errors.name && (
                <p className="field-error">{errors.name}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                🔒 Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="At least 8 characters (uppercase, lowercase, number)"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                required
              />
              {errors.password && (
                <p className="field-error">{errors.password}</p>
              )}
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                    ✓ Uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                    ✓ Lowercase letter (a-z)
                  </li>
                  <li className={/\d/.test(formData.password) ? 'met' : ''}>
                    ✓ Number (0-9)
                  </li>
                  <li className={formData.password.length >= 8 ? 'met' : ''}>
                    ✓ At least 8 characters
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                🔒 Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                required
              />
              {errors.confirmPassword && (
                <p className="field-error">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || Object.values(errors).some(e => e)}
              className="btn btn-primary btn-block"
            >
              {loading ? '⏳ Creating Account...' : '✅ Create Account'}
            </button>
          </form>

          {/* Info Box */}
          <div className="info-box">
            <p>
              <strong>⚠️ Gmail Required:</strong> Regular user accounts must use a Gmail address for registration.
            </p>
          </div>

          {/* Login Link */}
          <div className="login-link">
            <p>
              Already have an account? 
              <a href="/login"> Sign in here</a>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        .register-container {
          width: 100%;
          max-width: 450px;
        }

        .register-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
        }

        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .register-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px;
        }

        .register-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .alert {
          padding: 12px 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .alert-error {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background-color: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .alert-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: inherit;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .form-input {
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input.input-error {
          border-color: #ff6b6b;
          background-color: #fff5f5;
        }

        .field-error {
          font-size: 13px;
          color: #c33;
          margin: 0;
        }

        .field-hint {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .password-requirements {
          font-size: 12px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 6px;
          margin-top: 8px;
        }

        .password-requirements p {
          margin: 0 0 8px;
          font-weight: 600;
          color: #666;
        }

        .password-requirements ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .password-requirements li {
          padding: 4px 0;
          color: #999;
          transition: color 0.3s;
        }

        .password-requirements li.met {
          color: #3c3;
          font-weight: 600;
        }

        .btn {
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-block {
          width: 100%;
        }

        .info-box {
          margin-top: 20px;
          padding: 12px;
          background-color: #fef3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          font-size: 13px;
          color: #856404;
        }

        .info-box p {
          margin: 0;
        }

        .login-link {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
        }

        .login-link a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .login-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default RegisterPage;
