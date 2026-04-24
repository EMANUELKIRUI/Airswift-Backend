import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AuditLogs.css';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(15);
  const [totalLogs, setTotalLogs] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchAuditLogs();
    // Refresh audit logs every 10 seconds for real-time updates
    const interval = setInterval(fetchAuditLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, actionFilter, sortOrder, searchTerm]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Fetching audit logs...');

      const pageNum = currentPage;
      const limit = logsPerPage;

      const params = {
        page: pageNum,
        limit: limit,
      };

      if (actionFilter && actionFilter !== 'all') {
        params.action = actionFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      let response;

      const endpoints = ['/admin/audit-logs', '/admin/audit', '/audit-logs', '/auditLogs'];
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint, { params });
          break;
        } catch (err) {
          console.warn(`⚠️ ${endpoint} failed, trying next endpoint...`, err.response?.status);
        }
      }

      if (!response) {
        throw new Error('Unable to fetch audit logs from configured endpoints');
      }

      console.log('✅ Audit logs fetched:', response.data);

      const data = response.data;
      
      // Handle different response formats
      let logsData = [];
      let pagination = { total: 0, pages: 1 };

      const getArray = (value) => {
        if (Array.isArray(value)) return value;
        if (value?.logs && Array.isArray(value.logs)) return value.logs;
        if (value?.records && Array.isArray(value.records)) return value.records;
        if (value?.auditLogs && Array.isArray(value.auditLogs)) return value.auditLogs;
        return [];
      };

      if (data?.data) {
        logsData = getArray(data.data);
        pagination = data.data.pagination || data.pagination || { total: logsData.length, pages: 1 };
      } else if (Array.isArray(data)) {
        logsData = data;
        pagination = { total: data.length, pages: 1 };
      } else {
        logsData = getArray(data);
        pagination = data.pagination || { total: logsData.length, pages: 1 };
      }

      setLogs(logsData);
      setTotalLogs(pagination.total || logsData.length);
    } catch (err) {
      console.error('❌ Error fetching audit logs:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unable to load audit logs. Please try again.';
      setError(errorMessage);

      if (err.response?.status === 401) {
        setError('Unauthorized - Please login again');
      } else if (err.response?.status === 403) {
        setError('Forbidden - You do not have permission to view audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleActionFilterChange = (e) => {
    setActionFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'User', 'Resource', 'Description'],
      ...logs.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.action || 'N/A',
        log.user_id?.name || 'Unknown User',
        log.resource || 'N/A',
        log.description || 'N/A'
      ])
    ];

    const csvString = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(totalLogs / logsPerPage);

  if (loading && logs.length === 0) {
    return (
      <div className="audit-logs-container loading">
        <div className="spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="audit-logs-container error">
        <div className="error-message">
          <h3>⚠️ Error Loading Audit Logs</h3>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn-retry">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const getActionBadgeClass = (action) => {
    if (action.includes('CREATE')) return 'badge-create';
    if (action.includes('UPDATE')) return 'badge-update';
    if (action.includes('DELETE')) return 'badge-delete';
    if (action.includes('VIEW')) return 'badge-view';
    return 'badge-default';
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('VIEW')) return '👁️';
    return '•';
  };

  return (
    <div className="audit-logs-container">
      <div className="audit-logs-header">
        <h2>📋 Audit Logs</h2>
        <p>Track all system activities and changes</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={handleRefresh} className="btn-dismiss">✕</button>
        </div>
      )}

      <div className="audit-logs-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search audit logs..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={actionFilter}
            onChange={handleActionFilterChange}
            className="filter-select"
          >
            <option value="all">All Actions</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER">Update User</option>
            <option value="DELETE_USER">Delete User</option>
            <option value="CREATE_APPLICATION">Create Application</option>
            <option value="UPDATE_APPLICATION">Update Application</option>
            <option value="DELETE_APPLICATION">Delete Application</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={handleRefresh} className="btn-refresh" title="Refresh audit logs">
            🔄 Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-export" title="Export to CSV">
            📥 Export
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <p>📭 No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="audit-logs-table-wrapper">
            <table className="audit-logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((log, index) => (
                  <tr key={log._id || index} className={`log-row ${getActionBadgeClass(log.action)}`}>
                    <td className="timestamp">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="action">
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {getActionIcon(log.action)} {log.action}
                      </span>
                    </td>
                    <td className="user">
                      <strong>{log.user_id?.name || 'Unknown'}</strong>
                      <small>{log.user_id?.email || ''}</small>
                    </td>
                    <td className="resource">
                      {log.resource || 'N/A'}
                    </td>
                    <td className="description">
                      {log.description || 'No description'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>

              <div className="page-info">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                ({totalLogs} total logs)
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditLogs;
