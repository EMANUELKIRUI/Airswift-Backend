import React from 'react';
import UserSidebar from './UserSidebar';
import UserTopBar from './UserTopBar';
import '../styles/UserLayout.css';

const UserLayout = ({ children }) => {
  return (
    <div className="user-layout">
      <UserSidebar />
      <div className="user-main">
        <UserTopBar />
        <div className="user-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default UserLayout;