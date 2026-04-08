const os = require('os');
const mongoose = require('mongoose');
const healthMonitor = require('../services/systemHealthMonitor');

/**
 * System Health Controller
 * Handles API endpoints for system health monitoring
 */

/**
 * Get current system health status
 */
const getSystemHealth = async (req, res) => {
  try {
    const healthStatus = healthMonitor.getHealthStatus();

    // Determine overall status
    const overallStatus = determineOverallStatus(healthStatus);

    res.json({
      status: overallStatus,
      timestamp: new Date(),
      ...healthStatus
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      status: 'DOWN',
      error: 'Failed to retrieve system health',
      message: error.message
    });
  }
};

/**
 * Get historical health data for charts
 */
const getHealthHistory = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const historicalData = healthMonitor.getHistoricalData(parseInt(hours));

    res.json({
      data: historicalData,
      period: `${hours} hours`,
      dataPoints: historicalData.length
    });

  } catch (error) {
    console.error('Get health history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve health history',
      message: error.message
    });
  }
};

/**
 * Get current alerts
 */
const getHealthAlerts = async (req, res) => {
  try {
    const alerts = healthMonitor.alerts || [];

    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get health alerts error:', error);
    res.status(500).json({
      error: 'Failed to retrieve health alerts',
      message: error.message
    });
  }
};

/**
 * Start health monitoring
 */
const startHealthMonitoring = async (req, res) => {
  try {
    const { interval = 5000 } = req.body;

    healthMonitor.startMonitoring(parseInt(interval));

    res.json({
      message: 'Health monitoring started',
      interval: `${interval}ms`,
      status: 'active'
    });

  } catch (error) {
    console.error('Start health monitoring error:', error);
    res.status(500).json({
      error: 'Failed to start health monitoring',
      message: error.message
    });
  }
};

/**
 * Stop health monitoring
 */
const stopHealthMonitoring = async (req, res) => {
  try {
    healthMonitor.stopMonitoring();

    res.json({
      message: 'Health monitoring stopped',
      status: 'stopped'
    });

  } catch (error) {
    console.error('Stop health monitoring error:', error);
    res.status(500).json({
      error: 'Failed to stop health monitoring',
      message: error.message
    });
  }
};

/**
 * Perform a quick health check (lightweight)
 */
const quickHealthCheck = async (req, res) => {
  try {
    const startTime = Date.now();

    // Quick checks
    const checks = {
      server: 'UP',
      database: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
      uptime: os.uptime(),
      timestamp: new Date()
    };

    const responseTime = Date.now() - startTime;

    // Determine status
    const status = (checks.server === 'UP' && checks.database === 'UP') ? 'UP' : 'DOWN';

    res.json({
      status,
      responseTime: `${responseTime}ms`,
      ...checks
    });

  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      error: 'Health check failed',
      message: error.message
    });
  }
};

/**
 * Determine overall system status based on individual components
 */
function determineOverallStatus(healthStatus) {
  // Critical failures
  if (healthStatus.server?.status === 'DOWN') return 'DOWN';
  if (healthStatus.database?.status === 'DOWN') return 'DOWN';
  if (healthStatus.application?.status === 'DOWN') return 'DOWN';

  // Check for critical alerts
  const criticalAlerts = healthStatus.alerts?.filter(alert => alert.type === 'critical') || [];
  if (criticalAlerts.length > 0) return 'CRITICAL';

  // Check for warning alerts
  const warningAlerts = healthStatus.alerts?.filter(alert => alert.type === 'warning') || [];
  if (warningAlerts.length > 0) return 'WARNING';

  // All systems normal
  return 'UP';
}

module.exports = {
  getSystemHealth,
  getHealthHistory,
  getHealthAlerts,
  startHealthMonitoring,
  stopHealthMonitoring,
  quickHealthCheck,
};