const os = require('os');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * System Health Monitoring Service
 * Collects and monitors system metrics, database connectivity, and application health
 */

class SystemHealthMonitor {
  constructor() {
    this.metrics = {};
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring system health
   * @param {number} interval - Monitoring interval in milliseconds (default: 5000ms)
   */
  startMonitoring(interval = 5000) {
    if (this.isMonitoring) {
      console.log('System health monitoring already running');
      return;
    }

    console.log('Starting system health monitoring...');
    this.isMonitoring = true;

    // Initial collection
    this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.emitRealTimeUpdates();
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('System health monitoring stopped');
  }

  /**
   * Collect all system metrics
   */
  async collectMetrics() {
    try {
      const timestamp = new Date();

      this.metrics = {
        timestamp,
        server: {
          status: 'UP',
          uptime: os.uptime(),
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          nodeVersion: process.version
        },
        cpu: this.getCpuMetrics(),
        memory: this.getMemoryMetrics(),
        disk: await this.getDiskMetrics(),
        database: await this.getDatabaseMetrics(),
        application: this.getApplicationMetrics(),
        network: this.getNetworkMetrics()
      };

      // Store historical data if enabled
      await this.storeHistoricalData(this.metrics);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
      this.metrics = {
        timestamp: new Date(),
        server: { status: 'DOWN', error: error.message },
        error: error.message
      };
    }
  }

  /**
   * Get CPU metrics
   */
  getCpuMetrics() {
    const cpus = os.cpus();
    const totalCores = cpus.length;

    // Calculate CPU usage (simplified - in production, you'd track over time)
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    // Load average (1, 5, 15 minutes)
    const loadAvg = os.loadavg();

    return {
      usage: Math.max(0, Math.min(100, usage)), // Clamp between 0-100
      cores: totalCores,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      model: cpus[0]?.model || 'Unknown'
    };
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;

    return {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      used: Math.round(usedMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024), // MB
      usage: Math.round(usagePercent * 100) / 100 // Percentage with 2 decimals
    };
  }

  /**
   * Get disk usage metrics
   */
  async getDiskMetrics() {
    try {
      // For Linux systems, check root filesystem
      const diskUsage = await this.getDiskUsage('/');

      return {
        total: diskUsage.total,
        used: diskUsage.used,
        free: diskUsage.free,
        usage: diskUsage.usage
      };
    } catch (error) {
      console.warn('Could not get disk metrics:', error.message);
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        error: error.message
      };
    }
  }

  /**
   * Get disk usage for a specific path
   */
  getDiskUsage(path) {
    return new Promise((resolve, reject) => {
      // Use system commands to get disk usage
      const { exec } = require('child_process');

      if (os.platform() === 'win32') {
        // Windows command
        exec(`wmic logicaldisk get size,freespace,caption /format:csv`, (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }

          // Parse Windows output (simplified)
          const lines = stdout.split('\n').filter(line => line.trim());
          if (lines.length > 1) {
            const parts = lines[1].split(',');
            if (parts.length >= 3) {
              const total = parseInt(parts[1]) || 0;
              const free = parseInt(parts[2]) || 0;
              const used = total - free;
              const usage = total > 0 ? (used / total) * 100 : 0;

              resolve({
                total: Math.round(total / 1024 / 1024 / 1024), // GB
                used: Math.round(used / 1024 / 1024 / 1024), // GB
                free: Math.round(free / 1024 / 1024 / 1024), // GB
                usage: Math.round(usage * 100) / 100
              });
            }
          }
          reject(new Error('Could not parse disk usage'));
        });
      } else {
        // Unix/Linux command
        exec(`df -BG ${path} | tail -1`, (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }

          const parts = stdout.trim().split(/\s+/);
          if (parts.length >= 5) {
            const total = parseInt(parts[1].replace('G', '')) || 0;
            const used = parseInt(parts[2].replace('G', '')) || 0;
            const free = parseInt(parts[3].replace('G', '')) || 0;
            const usage = parseInt(parts[4].replace('%', '')) || 0;

            resolve({
              total,
              used,
              free,
              usage
            });
          } else {
            reject(new Error('Could not parse disk usage'));
          }
        });
      }
    });
  }

  /**
   * Get database connectivity metrics
   */
  async getDatabaseMetrics() {
    const startTime = Date.now();

    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState === 1) {
        // Perform a simple ping query
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - startTime;

        return {
          status: 'UP',
          type: 'MongoDB',
          responseTime: `${responseTime}ms`,
          connections: mongoose.connection.readyState
        };
      } else {
        return {
          status: 'DOWN',
          type: 'MongoDB',
          error: 'Not connected',
          connections: mongoose.connection.readyState
        };
      }
    } catch (error) {
      return {
        status: 'DOWN',
        type: 'MongoDB',
        error: error.message,
        responseTime: `${Date.now() - startTime}ms`
      };
    }
  }

  /**
   * Get application-specific metrics
   */
  getApplicationMetrics() {
    const memUsage = process.memoryUsage();

    return {
      status: 'UP',
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      version: process.version
    };
  }

  /**
   * Get network metrics
   */
  getNetworkMetrics() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = [];

    Object.keys(networkInterfaces).forEach(iface => {
      networkInterfaces[iface].forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          interfaces.push({
            name: iface,
            address: addr.address,
            mac: addr.mac
          });
        }
      });
    });

    return {
      interfaces,
      hostname: os.hostname()
    };
  }

  /**
   * Check thresholds and generate alerts
   */
  checkThresholds() {
    const alerts = [];

    // CPU threshold
    if (this.metrics.cpu?.usage > 85) {
      alerts.push({
        type: 'warning',
        metric: 'cpu',
        message: `High CPU usage: ${this.metrics.cpu.usage}%`,
        value: this.metrics.cpu.usage,
        threshold: 85
      });
    }

    // Memory threshold
    if (this.metrics.memory?.usage > 90) {
      alerts.push({
        type: 'critical',
        metric: 'memory',
        message: `High memory usage: ${this.metrics.memory.usage}%`,
        value: this.metrics.memory.usage,
        threshold: 90
      });
    }

    // Disk threshold
    if (this.metrics.disk?.usage > 80) {
      alerts.push({
        type: 'warning',
        metric: 'disk',
        message: `High disk usage: ${this.metrics.disk.usage}%`,
        value: this.metrics.disk.usage,
        threshold: 80
      });
    }

    // Database status
    if (this.metrics.database?.status !== 'UP') {
      alerts.push({
        type: 'critical',
        metric: 'database',
        message: 'Database connection is down',
        value: this.metrics.database?.status,
        threshold: 'UP'
      });
    }

    // Update alerts
    this.alerts = alerts;

    // Emit alerts if any
    if (alerts.length > 0) {
      this.emitAlerts(alerts);
    }
  }

  /**
   * Emit real-time updates via WebSocket
   */
  emitRealTimeUpdates() {
    if (global.io) {
      global.io.emit('system_health_update', {
        metrics: this.metrics,
        alerts: this.alerts,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit alerts via WebSocket
   */
  emitAlerts(alerts) {
    if (global.io) {
      global.io.emit('system_health_alert', {
        alerts,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      ...this.metrics,
      alerts: this.alerts,
      monitoring: {
        active: this.isMonitoring,
        interval: this.monitoringInterval ? '5 seconds' : 'stopped'
      }
    };
  }

  /**
   * Store historical data (optional)
   */
  async storeHistoricalData(metrics) {
    // Optional: Store in database for historical trends
    // This can be enabled if historical data is needed for charts
    try {
      // Implementation would go here if historical logging is needed
      // For now, we'll keep it lightweight and only store in memory
    } catch (error) {
      console.warn('Could not store historical health data:', error.message);
    }
  }

  /**
   * Get historical data for charts
   */
  getHistoricalData(hours = 24) {
    // Return mock historical data for charts
    // In production, this would query the database
    const dataPoints = [];
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 50; // 50 data points

    for (let i = 49; i >= 0; i--) {
      const timestamp = new Date(now - (i * interval));
      dataPoints.push({
        timestamp,
        cpu: Math.random() * 100,
        memory: 50 + Math.random() * 40,
        disk: 60 + Math.random() * 30
      });
    }

    return dataPoints;
  }
}

// Export singleton instance
const healthMonitor = new SystemHealthMonitor();

module.exports = healthMonitor;