import React, { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';
import api from '../api';

const Interviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/interviews/my');
      setInterviews(response.data.interviews || response.data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      scheduled: 'status-upcoming',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    };
    return statusClasses[status] || 'status-default';
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Loading interviews...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="interviews-page">
        <h1>📅 My Interviews</h1>
        {interviews.length === 0 ? (
          <p>No interviews scheduled.</p>
        ) : (
          <div className="interviews-list">
            {interviews.map((interview) => (
              <div key={interview._id} className="interview-card">
                <h3>{interview.job?.title || 'Interview'}</h3>
                <p><strong>Date & Time:</strong> {new Date(interview.scheduledAt).toLocaleString()}</p>
                <p><strong>Location/Link:</strong> {interview.location || 'TBD'}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${getStatusBadge(interview.status)}`}>{interview.status}</span></p>
                <div className="actions">
                  <button className="btn-accept">Accept</button>
                  <button className="btn-calendar">Add to Calendar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default Interviews;