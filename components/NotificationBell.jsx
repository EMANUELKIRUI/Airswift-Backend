import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import './NotificationBell.css';

/**
 * NotificationBell - Displays notification count and dropdown
 * Shows all recent notifications with their status
 */
const NotificationBell = () => {
  const { notifications, removeNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="notification-bell-container">
      {/* Bell Button */}
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button
                className="clear-all-btn"
                onClick={() => {
                  notifications.forEach((n) => removeNotification(n.id));
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item notification-${notification.type}`}
                  style={{
                    borderLeft: `4px solid ${getTypeColor(notification.type)}`,
                  }}
                >
                  <div className="notification-content">
                    <span className="notification-type-icon">
                      {getTypeIcon(notification.type)}
                    </span>
                    <p className="notification-message">{notification.message}</p>
                    <button
                      className="remove-notification-btn"
                      onClick={() => removeNotification(notification.id)}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                  <small className="notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="notification-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
