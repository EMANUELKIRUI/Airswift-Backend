import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/SystemHealth.css';

function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchHealthData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      setRefreshing(true);
      console.log('📡 Fetching system health data...');
      
      const response = await api.get('/system-health');
      console.log('✅ Health data received:', response.data);
      
      setHealth(response.data);
      setLastUpdated(new Date());
      setError(null);

      // Fetch alerts separately
      try {
        const alertsResponse = await api.get('/system-health/alerts');
        setAlerts(alertsResponse.data.alerts || []);
      } catch (alertError) {
        console.warn('Could not fetch alerts:', alertError.message);
      }
    } catch (err) {
      console.error('❌ Error fetching health:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch health data');
      
      if (err.response?.status === 401) {
        setError('Unauthorized - Please login again');
      } else if (err.response?.status === 403) {
        setError('Forbidden - You need admin privileges');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'UP': '#28a745',
      'ONLINE': '#28a745',
      'healthy': '#28a745',
      'DOWN': '#dc3545',
      'OFFLINE': '#dc3545',
      'unhealthy': '#dc3545',
      'DEGRADED': '#ffc107',
      'WARNING': '#ffc107',
      'CRITICAL': '#dc3545',
    };
    return statusMap[status] || '#6c757d';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !health) {
    return (
      <div className="system-health-container loading">
        <div className="spinner"></div>
        <p>Loading system health data...</p>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="system-health-container error">
        <div className="error-card">
          <h2>⚠️ Error Loading Health Data</h2>
          <p>{error}</p>
          <button onClick={fetchHealthData} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-container">
      <div className="health-header">
        <div className="header-content">
          <h1>System Health Dashboard</h1>
          <p className="header-desc">Real-time monitoring of server performance, database connectivity, and system resources</p>
        </div>
        <button 
          onClick={fetchHealthData} 
          disabled={refreshing}
          className="btn-refresh-header"
          title="Refresh health data"
        >
          {refreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && health && (
        <div className="warning-banner">
          ⚠️ {error}
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Overall Status */}
      {health?.status && (
        <div className="overall-status-section">
          <div className="status-widget" style={{ borderColor: getStatusColor(health.status) }}>
            <div className="status-indicator" style={{ background: getStatusColor(health.status) }}></div>
            <div className="status-content">
              <span className="status-label">System Status</span>
              <span className="status-value">{health.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Server Status */}
      {health?.server && (
        <div className="health-card server-status">
          <div className="card-header">
            <span className="status-badge" style={{ background: getStatusColor(health.server.status) }}>
              {health.server.status}
            </span>
            <h3>Server Status</h3>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">
                {health.server.uptime ? formatUptime(health.server.uptime) : 'N/A'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Status:</span>
              <span className="metric-value" style={{ color: getStatusColor(health.server.status) }}>
                {health.server.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CPU & Memory */}
      <div className="metrics-grid">
        {health?.cpu && (
          <div className="health-card metric-card">
            <h4>CPU Usage</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill cpu-fill" 
                style={{ width: `${health.cpu.usage || 0}%` }}
              ></div>
            </div>
            <div className="metric-details">
              <span className="metric-percent">{health.cpu.usage || 0}%</span>
              <span className="metric-info">
                Cores: {health.cpu.cores || 'N/A'} | Load: {health.cpu.loadAverage ? health.cpu.loadAverage.toFixed(2) : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {health?.memory && (
          <div className="health-card metric-card">
            <h4>Memory Usage</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill memory-fill" 
                style={{ width: `${health.memory.percentUsed || 0}%` }}
              ></div>
            </div>
            <div className="metric-details">
              <span className="metric-percent">{health.memory.percentUsed || 0}%</span>
              <span className="metric-info">
                {health.memory.used ? formatBytes(health.memory.used) : 'N/A'} / {health.memory.total ? formatBytes(health.memory.total) : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {health?.disk && (
          <div className="health-card metric-card">
            <h4>Disk Usage</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill disk-fill" 
                style={{ width: `${health.disk.percentUsed || 0}%` }}
              ></div>
            </div>
            <div className="metric-details">
              <span className="metric-percent">{health.disk.percentUsed || 0}%</span>
              <span className="metric-info">
                {health.disk.used ? formatBytes(health.disk.used) : 'N/A'} / {health.disk.total ? formatBytes(health.disk.total) : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Database Status */}
      {health?.database && (
        <div className="health-card database-status">
          <div className="card-header">
            <span className="status-badge" style={{ background: getStatusColor(health.database.status) }}>
              {health.database.status}
            </span>
            <h3>Database Status</h3>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Type:</span>
              <span className="metric-value">{health.database.type || 'MongoDB'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Connection:</span>
              <span className="metric-value" style={{ color: getStatusColor(health.database.status) }}>
                {health.database.status}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Response Time:</span>
              <span className="metric-value">{health.database.responseTime || 'N/A'}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Application Status */}
      {health?.application && (
        <div className="health-card application-status">
          <div className="card-header">
            <span className="status-badge" style={{ background: getStatusColor(health.application.status) }}>
              {health.application.status}
            </span>
            <h3>Application Status</h3>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Status:</span>
              <span className="metric-value" style={{ color: getStatusColor(health.application.status) }}>
                {health.application.status}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Version:</span>
              <span className="metric-value">{health.application.version || 'N/A'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Environment:</span>
              <span className="metric-value">{health.application.environment || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="health-card alerts-section">
          <h3>Active Alerts ({alerts.length})</h3>
          <div className="alerts-list">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`alert-item alert-${alert.type}`}>
                <span className="alert-icon">
                  {alert.type === 'critical' ? '🔴' : alert.type === 'warning' ? '🟡' : '🔵'}
                </span>
                <div className="alert-content">
                  <span className="alert-title">{alert.title || 'Alert'}</span>
                  <span className="alert-message">{alert.message}</span>
                  <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="timestamp">
        {health?.timestamp && `Data as of: ${new Date(health.timestamp).toLocaleString()}`}
      </div>
    </div>
  );
}

export default SystemHealth;
