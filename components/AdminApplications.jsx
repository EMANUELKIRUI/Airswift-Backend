import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AdminApplications.css';

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [applicationsPerPage] = useState(10);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Fetching all applications from admin endpoint...');

      let response;
      let applications = [];

      // Try primary admin endpoint (permission-based)
      try {
        console.log('🔄 Trying /applications/admin endpoint...');
        response = await api.get('/applications/admin');
        console.log('✅ Response from /applications/admin:', response.data);
        
        // Handle different response formats from this endpoint
        if (response.data && response.data.data) {
          applications = response.data.data;
        } else if (Array.isArray(response.data)) {
          applications = response.data;
        } else if (response.data && response.data.applications) {
          applications = response.data.applications;
        }
      } catch (err1) {
        console.warn('⚠️ /applications/admin failed, trying /applications/mongo/admin...');
        
        try {
          // Fallback to MongoDB endpoint (role-based)
          response = await api.get('/applications/mongo/admin');
          console.log('✅ Response from /applications/mongo/admin:', response.data);
          
          if (Array.isArray(response.data)) {
            applications = response.data;
          } else if (response.data && response.data.data) {
            applications = response.data.data;
          } else if (response.data && response.data.applications) {
            applications = response.data.applications;
          }
        } catch (err2) {
          console.error('❌ Both endpoints failed');
          throw err1; // Throw the first error
        }
      }

      console.log('✅ Applications fetched:', applications);
      setApplications(Array.isArray(applications) ? applications : []);
    } catch (err) {
      console.error('❌ Error fetching applications:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch applications';
      setError(errorMessage);

      if (err.response?.status === 401) {
        setError('Unauthorized - Please login again');
      } else if (err.response?.status === 403) {
        setError('Forbidden - You do not have permission to view applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications.filter((app) => {
      const matchesSearch = !searchTerm ||
        app.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobId?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    setFilteredApplications(filtered);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchApplications();
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Applicant Name', 'Email', 'Job Title', 'Status', 'Applied Date', 'Phone'],
      ...filteredApplications.map(app => [
        app.userId?.name || 'N/A',
        app.userId?.email || 'N/A',
        app.jobId?.title || 'N/A',
        app.status || 'pending',
        new Date(app.createdAt).toLocaleDateString(),
        app.phoneNumber || 'N/A'
      ])
    ];

    const csvString = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'pending': '#ffc107',
      'shortlisted': '#17a2b8',
      'interview': '#007bff',
      'hired': '#28a745',
      'rejected': '#dc3545',
    };
    return statusMap[status?.toLowerCase()] || '#6c757d';
  };

  // Pagination
  const indexOfLastApp = currentPage * applicationsPerPage;
  const indexOfFirstApp = indexOfLastApp - applicationsPerPage;
  const currentApplications = filteredApplications.slice(indexOfFirstApp, indexOfLastApp);
  const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);

  if (loading) {
    return (
      <div className="admin-applications-container loading">
        <div className="spinner"></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-applications-container error">
        <div className="error-card">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-applications-container">
      <div className="applications-header">
        <div className="header-content">
          <h1>Applications & Applicants</h1>
          <p className="header-desc">Review and manage job applications</p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-refresh-header"
          title="Refresh applications"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card">
          <span className="stat-label">Total Applications</span>
          <span className="stat-value">{applications.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value pending">
            {applications.filter(a => a.status?.toLowerCase() === 'pending').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Shortlisted</span>
          <span className="stat-value shortlisted">
            {applications.filter(a => a.status?.toLowerCase() === 'shortlisted').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Interviews</span>
          <span className="stat-value interview">
            {applications.filter(a => a.status?.toLowerCase() === 'interview').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Hired</span>
          <span className="stat-value hired">
            {applications.filter(a => a.status?.toLowerCase() === 'hired').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rejected</span>
          <span className="stat-value rejected">
            {applications.filter(a => a.status?.toLowerCase() === 'rejected').length}
          </span>
        </div>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by applicant name, email, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={handleRefresh} className="btn-refresh" title="Refresh applications">
            🔄 Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-export" title="Export to CSV">
            📥 Export
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="applications-section">
        {currentApplications.length === 0 ? (
          <div className="no-results">
            <p>No applications found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Applicant Name</th>
                    <th>Email</th>
                    <th>Job Title</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {currentApplications.map((app) => (
                    <tr key={app._id} className={`application-row status-${app.status?.toLowerCase()}`}>
                      <td className="name-cell">
                        <span className="applicant-name">{app.userId?.name || 'N/A'}</span>
                      </td>
                      <td className="email-cell">{app.userId?.email || 'N/A'}</td>
                      <td className="job-cell">{app.jobId?.title || 'N/A'}</td>
                      <td className="status-cell">
                        <span
                          className={`status-badge status-${app.status?.toLowerCase()}`}
                          style={{ background: getStatusColor(app.status) }}
                        >
                          {app.status || 'pending'}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="phone-cell">{app.phoneNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-pagination"
                >
                  ← Previous
                </button>
                <div className="page-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-pagination"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminApplications;
