import React from 'react';
import Link from 'next/link';
import '../../styles/RecentActivity.css';

const RecentActivity = ({ activities, loading = false, limit = 5 }) => {
  if (loading) {
    return (
      <div className="recent-activity loading">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="activity-item skeleton">
              <div className="activity-icon skeleton"></div>
              <div className="activity-content skeleton">
                <div className="skeleton-title"></div>
                <div className="skeleton-desc"></div>
                <div className="skeleton-time"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayActivities = activities.slice(0, limit);

  return (
    <div className="recent-activity">
      <h2>📢 Recent Activity</h2>
      {displayActivities.length > 0 ? (
        <div className="activity-list">
          {displayActivities.map((activity) => (
            <div key={activity.id} className={`activity-item ${activity.type}`}>
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <div className="activity-title">{activity.title}</div>
                {activity.description && (
                  <div className="activity-description">{activity.description}</div>
                )}
                <div className="activity-time">{activity.timestamp}</div>
                {activity.action && (
                  <div className="activity-action">{activity.action}</div>
                )}
              </div>
              {activity.link && (
                <Link href={activity.link} className="activity-link">
                  View
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;