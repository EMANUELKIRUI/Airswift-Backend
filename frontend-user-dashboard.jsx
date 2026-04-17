// ✅ USER DASHBOARD - Shows Application Status, Interview Date & Timeline
// Copy this to your frontend user dashboard page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Your axios instance

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ ROUTE PROTECTION: Only for authenticated non-admin users
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (!storedUser) {
      console.log("🔄 Redirecting to: /");
      navigate("/");
      return;
    }

    // ✅ Admins should not access this dashboard
    if (storedUser.role === "admin") {
      console.log("🔄 Redirecting admin to: /admin/dashboard");
      navigate("/admin/dashboard");
      return;
    }

    // ✅ Users without application should go to apply page
    if (!storedUser.hasSubmittedApplication) {
      console.log("🔄 Redirecting to: /apply");
      navigate("/apply");
      return;
    }

    setUser(storedUser);
  }, [navigate]);

  // ✅ FETCH USER APPLICATION STATUS
  useEffect(() => {
    if (user) {
      fetchApplicationStatus();
    }
  }, [user]);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current application status
      const response = await api.get('/applications/me');
      setApplication(response.data);
    } catch (err) {
      console.error('Error fetching application:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/'), 2000);
      } else if (err.response?.status === 404) {
        setError('No application found. Please submit an application first.');
      } else {
        setError('Failed to load application status');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ GET STATUS BADGE COLOR & ICON
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: '#FFA500', icon: '⏳', label: 'Under Review' },
      shortlisted: { color: '#28A745', icon: '✅', label: 'Shortlisted' },
      interview: { color: '#0056B3', icon: '📅', label: 'Interview Scheduled' },
      accepted: { color: '#20C997', icon: '🎉', label: 'Accepted' },
      rejected: { color: '#DC3545', icon: '❌', label: 'Rejected' },
      hired: { color: '#6F42C1', icon: '🏆', label: 'Hired' },
    };

    return statusMap[status] || { color: '#6C757D', icon: '❓', label: 'Unknown' };
  };

  // ✅ FORMAT DATE FOR DISPLAY
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  // ✅ GET TIMELINE STEPS
  const getTimelineSteps = () => {
    const currentStatus = application?.status || 'pending';
    const steps = [
      { status: 'pending', label: 'Application Submitted', completed: true },
      { status: 'shortlisted', label: 'Shortlisted', completed: ['shortlisted', 'interview', 'accepted', 'hired'].includes(currentStatus) },
      { status: 'interview', label: 'Interview Scheduled', completed: ['interview', 'accepted', 'hired'].includes(currentStatus) },
      { status: 'accepted', label: 'Accepted', completed: ['accepted', 'hired'].includes(currentStatus) },
      { status: 'hired', label: 'Hired', completed: currentStatus === 'hired' },
    ];

    return steps;
  };

  // ✅ RENDER TIMELINE
  const renderTimeline = () => {
    const steps = getTimelineSteps();
    return (
      <div className="timeline">
        {steps.map((step, index) => {
          const isCurrentStep = application?.status === step.status;
          return (
            <div key={step.status} className="timeline-step">
              <div className={`step-dot ${step.completed ? 'completed' : ''} ${isCurrentStep ? 'current' : ''}`}>
                {step.completed ? '✓' : index + 1}
              </div>
              <div className="step-label">{step.label}</div>
              {index < steps.length - 1 && (
                <div className={`step-line ${step.completed ? 'completed' : ''}`}></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="user-dashboard-loading" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Loading your application status...</h2>
        <div style={{ marginTop: '20px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-dashboard-error" style={{ textAlign: 'center', padding: '40px', color: '#DC3545' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={fetchApplicationStatus}
          style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
        >
          Retry
        </button>
        <button 
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="user-dashboard-empty" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>No Application Found</h2>
        <p>Please submit an application to view your status.</p>
        <button onClick={() => navigate('/apply')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Go to Apply
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(application.status);
  const interviewDate = application.interviewDate || application.interview?.date;

  return (
    <div className="user-dashboard">
      <style>{`
        .user-dashboard {
          max-width: 900px;
          margin: 0 auto;
          padding: 30px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .welcome-text {
          font-size: 24px;
          margin-bottom: 10px;
          color: #333;
        }

        .status-container {
          background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 40px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .status-badge {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .status-label {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .status-description {
          font-size: 16px;
          opacity: 0.9;
        }

        .interview-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #0056B3;
        }

        .interview-section h3 {
          margin: 0 0 15px 0;
          color: #0056B3;
          font-size: 18px;
        }

        .interview-date {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }

        .interview-note {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
        }

        .timeline {
          display: flex;
          align-items: center;
          margin: 40px 0;
          position: relative;
          justify-content: space-between;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .step-dot {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e9ecef;
          border: 2px solid #dee2e6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #6c757d;
          margin-bottom: 10px;
          transition: all 0.3s ease;
        }

        .step-dot.completed {
          background: #28A745;
          border-color: #28A745;
          color: white;
        }

        .step-dot.current {
          background: #0056B3;
          border-color: #0056B3;
          color: white;
          box-shadow: 0 0 0 4px rgba(0,86,179,0.2);
        }

        .step-label {
          font-size: 12px;
          text-align: center;
          color: #666;
          max-width: 80px;
          line-height: 1.4;
        }

        .step-line {
          position: absolute;
          top: 20px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: #dee2e6;
          z-index: -1;
        }

        .step-line.completed {
          background: #28A745;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .info-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .info-card h4 {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-card p {
          margin: 0;
          color: #333;
          font-size: 16px;
          font-weight: 500;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 30px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .btn-primary {
          background: #0056B3;
          color: white;
        }

        .btn-primary:hover {
          background: #004399;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,86,179,0.3);
        }

        .btn-secondary {
          background: #6C757D;
          color: white;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .feedback-section {
          background: #e7f3ff;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
          border-left: 4px solid #0056B3;
        }

        .feedback-section h4 {
          margin: 0 0 10px 0;
          color: #0056B3;
        }

        .feedback-section p {
          margin: 0;
          color: #333;
          line-height: 1.6;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0056B3;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .timeline {
            flex-direction: column;
          }

          .timeline-step {
            width: 100%;
            margin-bottom: 20px;
          }

          .step-line {
            position: absolute;
            left: 20px;
            width: 2px;
            height: 100%;
            top: 50%;
          }

          .status-container {
            padding: 20px;
          }

          .welcome-text {
            font-size: 20px;
          }

          .status-badge {
            font-size: 36px;
          }

          .status-label {
            font-size: 20px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-text">Welcome, {user?.name || 'Applicant'}! 👋</div>
        <p style={{ color: '#666', margin: 0 }}>Track your application status</p>
      </div>

      {/* Current Status */}
      <div className="status-container">
        <div className="status-badge">{statusInfo.icon}</div>
        <div className="status-label">{statusInfo.label}</div>
        <div className="status-description">
          Your application is currently {statusInfo.label.toLowerCase()}
        </div>
      </div>

      {/* Interview Date (if shortlisted) */}
      {['shortlisted', 'interview', 'accepted'].includes(application.status) && interviewDate && (
        <div className="interview-section">
          <h3>📅 Interview Scheduled</h3>
          <div className="interview-date">{formatDate(interviewDate)}</div>
          <div className="interview-note">
            {application.status === 'shortlisted' && 
              '✅ Congratulations! You have been shortlisted. Your interview is scheduled for the date above.'}
            {application.status === 'interview' && 
              '🎤 Your interview has been scheduled. Prepare well!'}
            {application.status === 'accepted' && 
              '🎉 Great! You have been accepted for the next round.'}
          </div>
        </div>
      )}

      {/* Application Details */}
      <div className="info-grid">
        <div className="info-card">
          <h4>📧 Email</h4>
          <p>{application.email || user?.email}</p>
        </div>
        <div className="info-card">
          <h4>📱 Phone</h4>
          <p>{application.phone || 'Not provided'}</p>
        </div>
        <div className="info-card">
          <h4>📅 Application Date</h4>
          <p>{formatDate(application.createdAt || application.submittedAt)}</p>
        </div>
        <div className="info-card">
          <h4>⏱️ Current Status</h4>
          <p style={{ color: statusInfo.color }}>{statusInfo.label}</p>
        </div>
      </div>

      {/* Timeline Progress */}
      <h3 style={{ marginTop: '40px', marginBottom: '20px', textAlign: 'center', color: '#333' }}>
        📊 Application Progress
      </h3>
      {renderTimeline()}

      {/* Feedback Section */}
      {application.feedback && (
        <div className="feedback-section">
          <h4>💬 Feedback from Recruiter</h4>
          <p>{application.feedback}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="button-group">
        <button className="btn btn-primary" onClick={fetchApplicationStatus}>
          🔄 Refresh Status
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Go Home
        </button>
      </div>

      {/* Additional Info */}
      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
        <p>Status updated automatically. Check back regularly for updates!</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    </div>
  );
};

export default UserDashboard;
