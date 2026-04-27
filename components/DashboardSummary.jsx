import React from 'react';
import Link from 'next/link';
import '../../styles/DashboardSummary.css';

const DashboardSummary = ({ cards, loading = false }) => {
  if (loading) {
    return (
      <div className="dashboard-summary loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="summary-card skeleton">
            <div className="skeleton-icon"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-number"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-summary">
      {cards.map((card, index) => (
        <div key={index} className={`summary-card ${card.color}`}>
          <div className="card-icon">{card.icon}</div>
          <div className="card-content">
            <h3 className="card-title">{card.title}</h3>
            <p className="card-value">{card.value}</p>
            {card.description && (
              <p className="card-description">{card.description}</p>
            )}
          </div>
          {card.link && (
            <Link href={card.link} className="card-link">
              View →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary;