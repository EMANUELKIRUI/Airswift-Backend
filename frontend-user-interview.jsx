// ✅ USER INTERVIEW PAGE - Single Source of Truth
// Prevents users from accessing interview if not scheduled

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const UserInterviewPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data.user;
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
      return freshUser;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return null;
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const freshUser = await refreshUser();
      if (!freshUser) return;

      // Prevent users from accessing interview if not scheduled
      if (freshUser.applicationStatus !== 'interview' && freshUser.applicationStatus !== 'shortlisted') {
        navigate('/dashboard');
        return;
      }

      // Load interview data
      await loadInterview();
    } finally {
      setLoading(false);
    }
  };

  const loadInterview = async () => {
    try {
      const response = await api.get('/interviews/me');
      setInterview(response.data);
    } catch (err) {
      console.error('Failed to load interview:', err);
      setError('Interview not found or not scheduled yet.');
    }
  };

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitInterview = async () => {
    try {
      setSubmitting(true);

      const response = await api.post('/interviews/submit', {
        interviewId: interview._id,
        answers
      });

      if (response.data.success) {
        alert('Interview submitted successfully!');
        // Refresh user status after submission
        await refreshUser();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Interview submission error:', err);
      alert('Failed to submit interview. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Loading Interview...</h2>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!interview) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Interview Not Available</h2>
        <p>Your interview has not been scheduled yet. Please check back later.</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px' }}>
      <h1>Interview Session</h1>
      <p>Please answer all questions below.</p>

      <div style={{ marginBottom: '30px' }}>
        <h3>Interview Details</h3>
        <p><strong>Date:</strong> {new Date(interview.scheduledDate).toLocaleString()}</p>
        <p><strong>Mode:</strong> {interview.mode || 'Online'}</p>
        <p><strong>Duration:</strong> {interview.duration || '30 minutes'}</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Questions</h3>
        {interview.questions && interview.questions.map((question, index) => (
          <div key={question._id || index} style={{
            marginBottom: '20px',
            padding: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '6px'
          }}>
            <h4>Question {index + 1}</h4>
            <p>{question.text}</p>
            {question.type === 'text' && (
              <textarea
                value={answers[question._id || index] || ''}
                onChange={(e) => handleAnswerChange(question._id || index, e.target.value)}
                placeholder="Enter your answer..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            )}
            {question.type === 'multiple-choice' && question.options && (
              <div>
                {question.options.map((option, optIndex) => (
                  <label key={optIndex} style={{ display: 'block', marginBottom: '5px' }}>
                    <input
                      type="radio"
                      name={`question-${question._id || index}`}
                      value={option}
                      checked={answers[question._id || index] === option}
                      onChange={(e) => handleAnswerChange(question._id || index, e.target.value)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={handleSubmitInterview}
          disabled={submitting}
          style={{
            background: '#28a745',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: submitting ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Interview'}
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#6c757d',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default UserInterviewPage;