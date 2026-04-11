// ✅ SAFE AUDIT LOGS ADMIN PAGE
// Copy this to your React/Next.js admin application

import React, { useState, useEffect } from 'react';
import api from './frontend-example-api';

const SafeAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  const fetchLogs = async (override = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: override.page || pagination.page,
        limit: pagination.limit,
        action: filters.action || undefined,
        entity: filters.entity || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const response = await api.get('/admin/audit/logs', { params });
      const data = response.data || {};

      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setPagination((prev) => ({
        ...prev,
        page: data.page || override.page || prev.page,
        pages: data.pages || prev.pages,
        total: data.total || 0
      }));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Unable to load audit logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = async () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    await fetchLogs({ page: 1 });
  };

  const changePage = async (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    await fetchLogs({ page: newPage });
  };

  const renderDetails = (details) => {
    if (!details) return '—';
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  };

  return (
    <div className="audit-log-page" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Audit Logs</h1>

      <div className="filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Action"
          value={filters.action}
          onChange={(e) => handleFilterChange('action', e.target.value)}
          style={{ padding: '10px', minWidth: '160px' }}
        />
        <input
          type="text"
          placeholder="Entity"
          value={filters.entity}
          onChange={(e) => handleFilterChange('entity', e.target.value)}
          style={{ padding: '10px', minWidth: '160px' }}
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          style={{ padding: '10px' }}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          style={{ padding: '10px' }}
        />
        <button onClick={applyFilters} style={{ padding: '10px 18px', cursor: 'pointer' }}>
          Apply Filters
        </button>
      </div>

      {loading && <p>Loading audit logs...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Time</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>User</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Action</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Entity</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Entity ID</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>IP</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Device</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Status</th>
                  <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '20px', textAlign: 'center' }}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id || log.id}>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{new Date(log.created_at || log.createdAt).toLocaleString()}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>
                        {log.user_id?.name || log.user_id?.email || 'Unknown'}
                      </td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.action}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.entity || '—'}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.entity_id || '—'}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.ip_address || log.ipAddress || '—'}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.device || '—'}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{log.status}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '10px', whiteSpace: 'pre-wrap' }}>{renderDetails(log.details)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => changePage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              style={{ padding: '10px 16px', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
            </span>
            <button
              onClick={() => changePage(Math.min(pagination.pages, pagination.page + 1))}
              disabled={pagination.page >= pagination.pages}
              style={{ padding: '10px 16px', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SafeAuditLogs;
