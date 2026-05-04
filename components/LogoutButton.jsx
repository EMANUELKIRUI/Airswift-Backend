import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import AuthService from '../authService';

/**
 * LogoutButton Component
 * 
 * Renders a logout button that handles both NextAuth and custom auth
 * Clears tokens from localStorage and clears NextAuth session
 * 
 * Usage:
 * <LogoutButton />
 * 
 * Props:
 * - className: string - Custom CSS classes
 * - icon: boolean - Show icon only (default: false)
 */
const LogoutButton = ({ className = '', icon = false }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    setLoading(true);
    try {
      // ✅ If using NextAuth (Google Sign-In)
      if (session) {
        await signOut({ redirect: false });
        console.log('✅ NextAuth session cleared');
      }

      // ✅ Also clear local auth service tokens
      AuthService.logout();
      console.log('✅ Local auth service cleared');

      toast.success('Logged out successfully');
      
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  if (icon) {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`logout-button-icon ${className}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontSize: '20px',
          padding: '5px 10px',
        }}
        title={loading ? 'Logging out...' : 'Logout'}
      >
        🚪
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`logout-button ${className}`}
      style={{
        padding: '8px 16px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
      }}
      onMouseOver={(e) => {
        if (!loading) {
          e.target.style.backgroundColor = '#cc0000';
        }
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = '#ff4444';
      }}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
};

export default LogoutButton;
