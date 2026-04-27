import { useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { getSocket } from '../socket';

/**
 * useSocketNotifications - Integrates Socket.IO events with notification system
 * Listens for real-time events and automatically displays them as notifications
 * Provides a subscribe function for custom event handling
 */
export const useSocketNotifications = () => {
  const { addNotification } = useNotification();
  const subscribersRef = useRef(new Map());

  const subscribe = (event, callback) => {
    const socket = getSocket();
    if (!socket) {
      console.warn('Socket.IO is not connected');
      return () => {};
    }

    const handler = (data) => {
      callback(data);
    };

    socket.on(event, handler);

    // Store the handler for cleanup
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, []);
    }
    subscribersRef.current.get(event).push(handler);

    // Return unsubscribe function
    return () => {
      socket.off(event, handler);
      const handlers = subscribersRef.current.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          subscribersRef.current.delete(event);
        }
      }
    };
  };

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

      // Cleanup custom subscribers
      subscribersRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          socket.off(event, handler);
        });
      });
      subscribersRef.current.clear();
    };
  }, [addNotification]);

  return { subscribe };
};

export default useSocketNotifications;
