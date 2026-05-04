import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

/**
 * GoogleSignInButton Component
 * 
 * Renders a Google Sign-In button that integrates with NextAuth
 * Handles loading states and error messages
 * 
 * Usage:
 * <GoogleSignInButton />
 * 
 * Props:
 * - full: boolean - Whether to show full width button (default: false)
 * - className: string - Custom CSS classes to apply
 */
const GoogleSignInButton = ({ full = false, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // ✅ SignIn with Google using NextAuth
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result.error) {
        console.error('❌ Google Sign-In Error:', result.error);
        toast.error('Google sign-in failed. Please try again.');
      } else if (result.ok) {
        console.log('✅ Google Sign-In Successful');
        toast.success('Welcome! Redirecting...');
        // Redirect to dashboard or callback URL
        router.push(result.url || '/dashboard');
      }
    } catch (error) {
      console.error('❌ Unexpected error during Google Sign-In:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={`google-signin-btn ${full ? 'full-width' : ''} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        color: '#333333',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.3s ease',
        width: full ? '100%' : 'auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
      onMouseOver={(e) => {
        if (!loading) {
          e.target.style.backgroundColor = '#f5f5f5';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = '#ffffff';
        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      {/* Google Icon SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
      <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
    </button>
  );
};

export default GoogleSignInButton;
