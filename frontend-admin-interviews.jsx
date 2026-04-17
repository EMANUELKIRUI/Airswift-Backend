import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Your axios instance

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminInterviews = () => {
  const navigate = useNavigate();

  // ✅ ADMIN PAGE PROTECTION
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      console.log("🔄 Redirecting to:", "/");
      navigate("/");
      return;
    }
    if (user.role !== "admin") {
      console.log("🔄 Redirecting to:", "/");
      navigate("/");
    }
  }, [navigate]);

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/interviews');
      setInterviews(response.data);
    } catch (err) {
      setError('Failed to load interviews');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateInterviewStatus = async (id, status) => {
    try {
      await api.put(`/interviews/${id}/status`, { status });
      fetchInterviews();
    } catch (err) {
      console.error('Failed to update interview status:', err);
      alert('Failed to update interview status');
    }
  };

  if (loading) return <div>Loading interviews...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin - Interviews</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Interview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interviews.map((interview) => (
              <tr key={interview._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {interview.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {interview.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {interview.participants?.length || 0} participants
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleString() : 'Not scheduled'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    interview.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    interview.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {interview.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {interview.status === 'Scheduled' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => updateInterviewStatus(interview._id, 'In Progress')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        ▶️ Start
                      </button>
                      <button
                        onClick={() => updateInterviewStatus(interview._id, 'Completed')}
                        className="text-green-600 hover:text-green-900"
                      >
                        ✅ Complete
                      </button>
                    </div>
                  )}
                  {interview.status === 'In Progress' && (
                    <button
                      onClick={() => updateInterviewStatus(interview._id, 'Completed')}
                      className="text-green-600 hover:text-green-900"
                    >
                      ✅ Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminInterviews;