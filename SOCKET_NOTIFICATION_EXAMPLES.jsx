/**
 * Socket.IO + Notifications Integration Examples
 * 
 * Real-world examples showing how to integrate Socket.IO events
 * with the notification system and UI updates
 */

import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { getSocket } from '../socket';
import { useAuth } from '../AuthContext';

// ============================================================
// ✅ EXAMPLE 1: Application Status Listener
// ============================================================

export const ApplicationStatusListener = ({ applicationId }) => {
  const [status, setStatus] = useState(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      setStatus(data.status);
      addNotification(data.message, 'success', 6000);
    };

    socket.on('status:update', handleStatusUpdate);

    return () => socket.off('status:update', handleStatusUpdate);
  }, [addNotification]);

  return (
    <div className="status-display">
      <h3>Application Status</h3>
      <p>{status || 'Pending...'}</p>
    </div>
  );
};

// ============================================================
// ✅ EXAMPLE 2: Real-Time Dashboard Updates
// ============================================================

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || user?.role !== 'admin') return;

    // Listen for dashboard updates
    socket.on('dashboardUpdate', (data) => {
      setStats(data);
      addNotification(data.message || 'Dashboard updated', 'info', 3000);
    });

    // Listen for new applications
    socket.on('newApplication', (data) => {
      setStats((prev) => ({
        ...prev,
        total_applications: prev.total_applications + 1,
      }));
      addNotification(`📝 New application received!`, 'info', 5000);
    });

    return () => {
      socket.off('dashboardUpdate');
      socket.off('newApplication');
    };
  }, [user, addNotification]);

  return (
    <div className="admin-dashboard">
      <h2>Dashboard</h2>
      {stats && (
        <>
          <div className="stat-card">Total Applications: {stats.total_applications}</div>
          <div className="stat-card">Pending: {stats.pending_applications}</div>
          <div className="stat-card">Approved: {stats.approved_applications}</div>
        </>
      )}
    </div>
  );
};

// ============================================================
// ✅ EXAMPLE 3: Interview Scheduling with Notifications
// ============================================================

export const ScheduleInterview = ({ applicationId }) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleSchedule = async (date, time) => {
    setLoading(true);
    try {
      const response = await fetch('/api/interviews/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ applicationId, date, time }),
      });

      if (!response.ok) throw new Error('Failed to schedule');

      const data = await response.json();

      // ✅ API returns success
      addNotification(`✅ Interview scheduled for ${date}`, 'success', 6000);

      // Socket event will come from backend once notified
      // This is handled by useSocketNotifications hook automatically
    } catch (error) {
      addNotification(`❌ ${error.message}`, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="schedule-interview">
      <button onClick={() => handleSchedule('2024-05-15', '10:00')}>
        {loading ? 'Scheduling...' : 'Schedule Interview'}
      </button>
    </div>
  );
};

// ============================================================
// ✅ EXAMPLE 4: Payment Status Real-Time Updates
// ============================================================

export const PaymentTracker = ({ paymentId }) => {
  const { addNotification } = useNotification();
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for payment status updates
    const handlePaymentUpdate = (data) => {
      setPaymentStatus(data.status);
      setPaymentData(data);

      // Show different notifications based on status
      if (data.status === 'completed') {
        addNotification(
          '✅ Payment successful! Thank you!',
          'success',
          6000
        );
      } else if (data.status === 'failed') {
        addNotification(
          '❌ Payment failed. Please try again.',
          'error',
          6000
        );
      }
    };

    socket.on('payment:update', handlePaymentUpdate);

    return () => socket.off('payment:update', handlePaymentUpdate);
  }, [addNotification]);

  return (
    <div className="payment-tracker">
      <h3>Payment Status</h3>
      <p>Status: {paymentStatus}</p>
      {paymentData && <p>Amount: ${paymentData.amount}</p>}
    </div>
  );
};

// ============================================================
// ✅ EXAMPLE 5: Error & Reconnection Handling
// ============================================================

export const SocketConnectionMonitor = () => {
  const { addNotification } = useNotification();
  const { reconnectSocket } = useAuth();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for connection errors
    const handleConnectionError = (error) => {
      addNotification(
        `⚠️ Connection error: ${error}`,
        'warning',
        5000
      );

      // Attempt to reconnect after delay
      setTimeout(() => {
        reconnectSocket();
        addNotification('🔄 Reconnecting...', 'info', 3000);
      }, 2000);
    };

    // Listen for disconnection
    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      addNotification(
        `⚠️ Connection lost. Reconnecting...`,
        'warning',
        5000
      );
    };

    // Listen for reconnection
    const handleReconnect = () => {
      addNotification('✅ Reconnected!', 'success', 3000);
    };

    socket.on('connect_error', handleConnectionError);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect_error', handleConnectionError);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleReconnect);
    };
  }, [addNotification, reconnectSocket]);

  return null; // Just handles events, no UI
};

// ============================================================
// ✅ EXAMPLE 6: Interview Submission with Feedback
// ============================================================

export const SubmitInterview = ({ interviewId }) => {
  const { addNotification, removeNotification } = useNotification();
  const { refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (answers) => {
    setSubmitting(true);

    // Show loading notification
    const loadingId = addNotification(
      '⏳ Submitting your interview...',
      'info',
      0 // Don't auto-dismiss
    );

    try {
      const response = await fetch('/api/interviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ interviewId, answers }),
      });

      if (!response.ok) throw new Error('Submission failed');

      // Remove loading notification
      removeNotification(loadingId);

      // Show success
      addNotification(
        '✅ Interview submitted successfully!',
        'success',
        6000
      );

      // Refresh user data to reflect new status
      setTimeout(() => {
        refreshUser();
      }, 1000);

      // Socket event will come from backend
      // Watch for interview:completed event via useSocketNotifications
    } catch (error) {
      removeNotification(loadingId);
      addNotification(`❌ ${error.message}`, 'error', 5000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={() => handleSubmit({})}
      disabled={submitting}
    >
      {submitting ? 'Submitting...' : 'Submit Interview'}
    </button>
  );
};

// ============================================================
// ✅ EXAMPLE 7: Admin Message Broadcasting
// ============================================================

export const AdminMessageNotification = () => {
  const { addNotification } = useNotification();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for admin messages
    const handleAdminMessage = (data) => {
      addNotification(
        `📢 ${data.title}: ${data.message}`,
        'info',
        8000 // Longer duration for important messages
      );
    };

    socket.on('adminMessage', handleAdminMessage);
    socket.on('Admin', handleAdminMessage); // Fallback event name

    return () => {
      socket.off('adminMessage', handleAdminMessage);
      socket.off('Admin', handleAdminMessage);
    };
  }, [addNotification]);

  return null; // Just handles events, no UI
};

// ============================================================
// ✅ EXAMPLE 8: Complete User Journey
// ============================================================

export const CompleteUserFlow = () => {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    // Handler for every type of update
    const handleStatusUpdate = async (data) => {
      // 1. Show notification
      addNotification(data.message, 'success', 6000);

      // 2. Update local state
      setTimeout(() => {
        // 3. Refresh user data from server
        refreshUser();
      }, 1000);

      // 4. Analytics tracking (optional)
      console.log('Status update tracked:', {
        userId: user.id,
        status: data.status,
        timestamp: new Date(),
      });
    };

    socket.on('status:update', handleStatusUpdate);

    return () => socket.off('status:update', handleStatusUpdate);
  }, [user, refreshUser, addNotification]);

  return (
    <div className="user-flow">
      <ApplicationStatusListener applicationId={user?.activeApplicationId} />
      <PaymentTracker paymentId={user?.activePaymentId} />
      <SocketConnectionMonitor />
      <AdminMessageNotification />
    </div>
  );
};

export default {
  ApplicationStatusListener,
  AdminDashboard,
  ScheduleInterview,
  PaymentTracker,
  SocketConnectionMonitor,
  SubmitInterview,
  AdminMessageNotification,
  CompleteUserFlow,
};
