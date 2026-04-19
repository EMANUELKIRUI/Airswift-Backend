// ✅ USER PAYMENT PAGE - Single Source of Truth
// Prevents users from accessing payment if not approved

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const UserPaymentPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data.user;
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
      return freshUser;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return null;
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const freshUser = await refreshUser();
      if (!freshUser) return;

      // Prevent users from accessing payment if not approved
      if (freshUser.applicationStatus !== 'approved' && freshUser.applicationStatus !== 'accepted') {
        navigate('/dashboard');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const handlePayment = async () => {
    try {
      setPaymentLoading(true);

      // Call M-Pesa STK Push
      const response = await api.post('/payments/initiate', {
        amount: 30000,
        phone: user.phone || '254712345678', // Get from user profile
        description: 'Visa Processing Fee'
      });

      if (response.data.success) {
        alert('Payment initiated! Check your phone for M-Pesa prompt.');
        // Refresh user status after payment attempt
        await refreshUser();
      } else {
        alert('Payment failed to initiate. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
      <h1>Complete Your Payment</h1>
      <p>Visa Processing Fee: KSh 30,000</p>

      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0',
        border: '1px solid #dee2e6'
      }}>
        <h3>Payment Details</h3>
        <p><strong>Amount:</strong> KSh 30,000</p>
        <p><strong>Description:</strong> Visa Processing Fee</p>
        <p><strong>Status:</strong> {user.applicationStatus}</p>
      </div>

      <button
        onClick={handlePayment}
        disabled={paymentLoading}
        style={{
          background: '#28a745',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: paymentLoading ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '20px'
        }}
      >
        {paymentLoading ? 'Processing Payment...' : 'Pay KSh 30,000 via M-Pesa'}
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: '#6c757d',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default UserPaymentPage;