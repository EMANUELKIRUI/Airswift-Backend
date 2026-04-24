import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const UserTopBar = () => {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="user-topbar">
      <div className="topbar-left">
        <div className="logo">
          <h1>Airswift</h1>
        </div>
      </div>
      <div className="topbar-right">
        <NotificationBell />
        <div className="user-menu">
          <button
            className="user-menu-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          {dropdownOpen && (
            <div className="user-dropdown">
              <div className="dropdown-item">Profile</div>
              <div className="dropdown-item">Settings</div>
              <div className="dropdown-item" onClick={handleLogout}>Logout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserTopBar;