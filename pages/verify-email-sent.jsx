import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function VerifyEmailSentPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const queryEmail = router.query.email;
    if (typeof queryEmail === 'string') {
      setEmail(queryEmail);
    }
  }, [router.isReady, router.query.email]);

  return (
    <div className="verify-email-page">
      <div className="verify-email-container">
        <div className="verify-card">
          <div className="verify-icon">✓</div>
          <h1>Check Your Email</h1>
          <p className="verify-text">
            We sent an activation link to <strong>{email || 'your email address'}</strong>.
            Please open your inbox and click the link to verify your account.
          </p>
          <p className="verify-subtext">
            If you do not see the email, check your spam folder or refresh your inbox.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>

      <style jsx>{`
        .verify-email-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        .verify-email-container {
          width: 100%;
          max-width: 500px;
        }

        .verify-card {
          background: white;
          border-radius: 16px;
          padding: 45px 35px;
          text-align: center;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
        }

        .verify-icon {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #e6ffed;
          color: #2f855a;
          font-size: 48px;
          border: 3px solid #9ae6b4;
        }

        .verify-card h1 {
          margin-bottom: 16px;
          font-size: 30px;
          color: #2d3748;
        }

        .verify-text {
          font-size: 16px;
          color: #4a5568;
          margin: 0 auto 18px;
          line-height: 1.8;
          max-width: 420px;
        }

        .verify-subtext {
          margin-bottom: 30px;
          color: #718096;
          font-size: 14px;
        }

        .btn {
          padding: 14px 18px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-secondary {
          background: #edf2ff;
          color: #2d3748;
        }

        .btn-secondary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.18);
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailSentPage;
