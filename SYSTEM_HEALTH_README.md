# System Health Monitoring System

A comprehensive real-time system health monitoring solution for the Airswift Backend application, providing admins with complete visibility into server performance, database connectivity, and system resources.

## 🎯 Features Implemented

### ✅ Backend Health Service
- **SystemHealthMonitor Service**: Comprehensive monitoring of system metrics
- **Real-time Data Collection**: CPU, memory, disk, database, and application metrics
- **Automatic Threshold Detection**: Intelligent alerting for performance issues
- **WebSocket Integration**: Real-time updates to admin dashboard

### ✅ API Endpoints
- `GET /api/system-health` - Complete system health status
- `GET /api/system-health/history` - Historical data for charts
- `GET /api/system-health/alerts` - Current active alerts
- `GET /api/system-health/quick` - Lightweight health check
- `POST /api/system-health/start` - Start monitoring service
- `POST /api/system-health/stop` - Stop monitoring service

### ✅ Admin Dashboard UI
- **Real-time Status Cards**: Server, database, CPU, memory, disk status
- **Interactive Charts**: Chart.js-powered performance trends
- **Metrics Table**: Detailed system metrics with status indicators
- **Alert System**: Real-time notifications for critical issues
- **Control Panel**: Auto-refresh, monitoring controls, chart period selection

### ✅ Real-time Monitoring
- **WebSocket Events**: `system_health_update` and `system_health_alert`
- **Live Updates**: Dashboard updates every 5 seconds
- **Instant Alerts**: Immediate notification of critical issues
- **Historical Tracking**: Rolling window of performance data

### ✅ Alert System
- **Threshold-based Alerts**: CPU >85%, Memory >90%, Disk >80%
- **Critical Alerts**: Database down, server down
- **Real-time Notifications**: Browser notifications and UI alerts
- **Alert History**: Tracking of all system alerts

## 📊 Metrics Monitored

### 🧠 System Metrics
| Metric | Description | Unit | Threshold |
|--------|-------------|------|-----------|
| CPU Usage | Processor utilization | % | >85% warning |
| CPU Load Average | System load (1, 5, 15 min) | ratio | N/A |
| Memory Usage | RAM utilization | % | >90% critical |
| Disk Usage | Storage utilization | % | >80% warning |
| Server Uptime | System uptime | seconds | N/A |

### 🗄️ Database Health
| Metric | Description | Status |
|--------|-------------|--------|
| Connection Status | MongoDB connectivity | UP/DOWN |
| Response Time | Query response time | ms |
| Connection Count | Active connections | count |

### 🌐 Application Health
| Metric | Description | Unit |
|--------|-------------|------|
| Process Memory | Node.js heap usage | MB |
| Process Uptime | Application uptime | seconds |
| PID | Process ID | number |

## 🚀 Usage

### Backend Integration
```javascript
// Service automatically starts with server
const healthMonitor = require('./services/systemHealthMonitor');
// Monitoring starts automatically on server startup
```

### Admin Interface
1. Navigate to `admin-system-health.html`
2. View real-time system status and metrics
3. Monitor performance trends on interactive charts
4. Receive instant alerts for critical issues
5. Control monitoring settings and refresh rates

### API Usage
```javascript
// Get full health status
GET /api/system-health
Authorization: Bearer <admin_token>

// Get historical data for charts
GET /api/system-health/history?hours=24

// Get current alerts
GET /api/system-health/alerts

// Quick health check
GET /api/system-health/quick
```

## 📁 File Structure

```
backend/
├── services/
│   └── systemHealthMonitor.js      # Core monitoring service
├── controllers/
│   └── systemHealthController.js   # API endpoints
├── routes/
│   └── systemHealth.js             # Route definitions
└── server.js                       # Service initialization

admin-system-health.html            # Admin dashboard
SYSTEM_HEALTH_README.md            # This documentation
```

## 🔧 Configuration

### Monitoring Intervals
- **Default**: 5000ms (5 seconds)
- **Configurable**: 1-60 seconds via API
- **Real-time**: WebSocket updates for instant feedback

### Alert Thresholds
```javascript
const THRESHOLDS = {
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 85, critical: 90 },
    disk: { warning: 80, critical: 95 },
    database: { timeout: 5000 } // ms
};
```

### Chart Configuration
- **Data Points**: Rolling window of 50 data points
- **Time Periods**: 1h, 6h, 24h, 72h selectable
- **Update Frequency**: Real-time via WebSocket

## 📊 Real-time Features

### WebSocket Events
```javascript
// Health updates
socket.on('system_health_update', (data) => {
    // Update UI with new metrics
});

// Alert notifications
socket.on('system_health_alert', (alerts) => {
    // Show critical alerts
});
```

### Live Dashboard Updates
- **Status Cards**: Update every 5 seconds
- **Charts**: Real-time data point addition
- **Alerts**: Instant notification display
- **Metrics Table**: Live status indicators

## 🚨 Alert System

### Alert Types
- **WARNING**: CPU >85%, Memory >85%, Disk >80%
- **CRITICAL**: Memory >90%, Database down, Server down
- **INFO**: System status changes, monitoring events

### Alert Actions
- **UI Notifications**: Browser alerts and dashboard banners
- **Visual Indicators**: Color-coded status cards and metrics
- **Persistent Display**: Active alerts remain visible until resolved

## 🔐 Security

- **Admin Authentication**: JWT token required for all endpoints
- **Role-based Access**: Admin-only access to health monitoring
- **Input Validation**: All API inputs validated and sanitized
- **Rate Limiting**: Protected against excessive API calls

## 📈 Performance Optimization

- **Efficient Monitoring**: Lightweight system calls
- **Data Limiting**: Chart data capped at 50 points
- **Memory Management**: Rolling data windows prevent memory leaks
- **WebSocket Optimization**: Binary data transmission for charts

## 🧪 Testing

### Manual Testing
1. Access admin dashboard during high load
2. Disconnect database to test alerts
3. Fill disk space to trigger warnings
4. Monitor real-time chart updates

### API Testing
```bash
# Full health check
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/system-health

# Start monitoring
curl -X POST -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/system-health/start

# Get alerts
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/system-health/alerts
```

## 🔄 Future Enhancements

- **Email Alerts**: SMTP notifications for critical alerts
- **Slack Integration**: Team notifications for system issues
- **Historical Storage**: Database persistence for long-term trends
- **Custom Thresholds**: Configurable alert levels per environment
- **Multi-server Support**: Monitor multiple server instances
- **Performance Profiling**: Detailed application performance metrics

## 📋 System Requirements

- **Node.js**: >= 14.0.0
- **MongoDB**: Connection for database health checks
- **WebSocket Support**: Socket.io for real-time updates
- **Chart.js**: For performance visualization
- **Admin Authentication**: JWT tokens for API access

## 🎯 Implementation Status

- ✅ **Backend Monitoring Service** - Complete system metrics collection
- ✅ **API Endpoints** - Full REST API for health data
- ✅ **Real-time Updates** - WebSocket integration working
- ✅ **Admin Dashboard** - Complete UI with charts and alerts
- ✅ **Alert System** - Threshold-based notifications
- ✅ **Security Controls** - Admin authentication and validation
- ✅ **Performance Optimization** - Efficient monitoring and updates
- ✅ **Documentation** - Comprehensive implementation guide

**Status: COMPLETE** - Full system health monitoring implementation ready for production use.