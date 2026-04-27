import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import '../../styles/UserDashboardLayout.css';

const UserDashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navigationItems = [
    { href: '/job-seeker/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/job-seeker/apply', icon: '📝', label: 'Apply' },
    { href: '/job-seeker/applications', icon: '📂', label: 'Applications' },
    { href: '/job-seeker/interviews', icon: '📅', label: 'Interviews' },
    { href: '/job-seeker/messages', icon: '💬', label: 'Messages' },
    { href: '/job-seeker/settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [router.pathname]);

  return (
    <div className="user-dashboard-layout">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/job-seeker/dashboard" className="sidebar-logo">
            <h2>Airswift</h2>
          </Link>
          <button
            className="sidebar-close-btn mobile-only"
            onClick={closeSidebar}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={`sidebar-link ${router.pathname === item.href ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">{item.icon}</span>
                <span className="link-label">{item.label}</span>
              </a>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <span className="btn-icon">🚪</span>
            <span className="btn-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle mobile-only"
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <h1 className="page-title">
              {navigationItems.find(item => item.href === router.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="topbar-right">
            <NotificationBell />

            <div className="profile-menu">
              <button
                className="profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <span className="profile-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="profile-name">{user?.name || 'User'}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <Link href="/job-seeker/settings">
                    <a className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                      ⚙️ Settings
                    </a>
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay mobile-only" onClick={closeSidebar}></div>
      )}
    </div>
  );
};

export default UserDashboardLayout;