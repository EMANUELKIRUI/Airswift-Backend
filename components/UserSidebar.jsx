import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const UserSidebar = () => {
  const router = useRouter();

  const menuItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/apply', icon: '📝', label: 'Apply' },
    { href: '/applications', icon: '📂', label: 'Applications' },
    { href: '/interviews', icon: '📅', label: 'Interviews' },
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="user-sidebar">
      <div className="sidebar-header">
        <h2>Airswift</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={`sidebar-link ${router.pathname === item.href ? 'active' : ''}`}>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <span className="icon">🚪</span>
          <span className="label">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;