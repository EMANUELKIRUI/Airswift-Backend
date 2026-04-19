import { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { getSocket } from '../socket';

/**
 * useSocketNotifications - Integrates Socket.IO events with notification system
 * Listens for real-time events and automatically displays them as notifications
 */
export const useSocketNotifications = () => {
  const { addNotification } = useNotification();

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      console.warn('Socket.IO is not connected');
      return;
    }

    // Listen for status updates (admin updates application status)
    socket.on('status:update', (data) => {
      addNotification(
        data.message || `Status updated to: ${data.status}`,
        'success',
        5000
      );
    });

    // Listen for application updates
    socket.on('applicationUpdate', (data) => {
      addNotification(
        data.message || 'Your application has been updated',
        'info',
        5000
      );
    });

    // Listen for new applications
    socket.on('newApplication', (data) => {
      addNotification(
        data.message || 'New application received',
        'info',
        5000
      );
    });

    // Listen for interview updates
    socket.on('interview:update', (data) => {
      addNotification(
        data.message || 'Your interview has been updated',
        'info',
        5000
      );
    });

    // Listen for interview scheduling
    socket.on('interview:scheduled', (data) => {
      addNotification(
        data.message || `Interview scheduled for ${data.date}`,
        'success',
        5000
      );
    });

    // Listen for payment updates
    socket.on('payment:update', (data) => {
      addNotification(
        data.message || 'Payment status updated',
        data.status === 'completed' ? 'success' : 'info',
        5000
      );
    });

    // Listen for admin messages
    socket.on('Admin', (data) => {
      addNotification(
        data.message || 'You have a new message from admin',
        'info',
        6000
      );
    });

    // Listen for errors
    socket.on('socket-error', (data) => {
      addNotification(
        data.message || 'An error occurred',
        'error',
        5000
      );
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('status:update');
      socket.off('applicationUpdate');
      socket.off('newApplication');
      socket.off('interview:update');
      socket.off('interview:scheduled');
      socket.off('payment:update');
      socket.off('Admin');
      socket.off('socket-error');
    };
  }, [addNotification]);
};

export default useSocketNotifications;
