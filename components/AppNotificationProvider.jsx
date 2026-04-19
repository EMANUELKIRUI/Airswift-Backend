import React from 'react';
import { NotificationProvider } from '../context/NotificationContext';
import useSocketNotifications from '../hooks/useSocketNotifications';
import NotificationBell from './NotificationBell';

/**
 * NotificationWrapper - Sets up notification system
 * Initializes Socket.IO listeners and displays NotificationBell
 */
const NotificationWrapper = () => {
  // This hook initializes all Socket.IO event listeners
  useSocketNotifications();

  return <NotificationBell />;
};

/**
 * AppNotificationProvider - Complete notification setup
 * Wrap your entire app with this component:
 * 
 * <AppNotificationProvider>
 *   <YourApp />
 * </AppNotificationProvider>
 */
export const AppNotificationProvider = ({ children }) => {
  return (
    <NotificationProvider>
      <NotificationWrapper />
      {children}
    </NotificationProvider>
  );
};

export default AppNotificationProvider;
