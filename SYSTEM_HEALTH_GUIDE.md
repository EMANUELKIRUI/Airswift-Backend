# System Health Dashboard - Setup & Integration Guide

## Overview
Complete system health monitoring dashboard showing real-time server performance, database connectivity, and system resource usage.

## Backend API Endpoints

### 1. Get Overall System Health
**GET** `/api/system-health`
- Returns comprehensive system health status
- Requires: Admin role + authentication

**Response:**
```json
{
  "status": "UP",
  "timestamp": "2024-01-20T14:45:00Z",
  "server": {
    "status": "UP",
    "uptime": 86400,
    "version": "1.0.0"
  },
  "cpu": {
    "usage": 25.5,
    "cores": 4,
    "loadAverage": 1.2
  },
  "memory": {
    "used": 1073741824,
    "total": 8589934592,
    "percentUsed": 12.5
  },
  "disk": {
    "used": 53687091200,
    "total": 1099511627776,
    "percentUsed": 4.9
  },
  "database": {
    "status": "UP",
    "type": "MongoDB",
    "responseTime": 5
  },
  "application": {
    "status": "UP",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### 2. Get Server Health Only
**GET** `/api/system-health/server`
```json
{
  "server": { ... },
  "cpu": { ... },
  "memory": { ... },
  "disk": { ... },
  "timestamp": "2024-01-20T14:45:00Z"
}
```

### 3. Get Database Health
**GET** `/api/system-health/db`
```json
{
  "database": {
    "status": "UP",
    "type": "MongoDB",
    "responseTime": 5
  },
  "timestamp": "2024-01-20T14:45:00Z"
}
```

### 4. Get Service Status
**GET** `/api/system-health/services`
```json
{
  "aiService": {
    "status": "ONLINE",
    "configured": true
  },
  "emailService": {
    "status": "ONLINE",
    "configured": true
  },
  "database": { ... },
  "uptime": 86400,
  "timestamp": "2024-01-20T14:45:00Z"
}
```

### 5. Get Health History (for charts)
**GET** `/api/system-health/history?hours=24`
```json
{
  "data": [
    { timestamp: "2024-01-19T14:45:00Z", cpu: 25, memory: 12, ... },
    ...
  ],
  "period": "24 hours",
  "dataPoints": 144
}
```

### 6. Get Current Alerts
**GET** `/api/system-health/alerts`
```json
{
  "alerts": [
    {
      "type": "warning",
      "title": "High Memory Usage",
      "message": "Memory usage is above 80%",
      "timestamp": "2024-01-20T14:45:00Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-20T14:45:00Z"
}
```

### 7. Quick Health Check (lightweight)
**GET** `/api/system-health/quick`
```json
{
  "status": "UP",
  "responseTime": "2ms",
  "server": "UP",
  "database": "UP",
  "uptime": 86400,
  "timestamp": "2024-01-20T14:45:00Z"
}
```

## Frontend Integration

### Step 1: Import the Component
```jsx
import SystemHealth from '../components/SystemHealth';

export default function HealthDashboard() {
  return <SystemHealth />;
}
```

### Step 2: Features Included
- ✅ Real-time system health monitoring
- ✅ CPU, Memory, Disk usage visualization
- ✅ Database connectivity status
- ✅ Application health status
- ✅ Active alerts with severity levels
- ✅ Auto-refresh every 10 seconds
- ✅ Manual refresh button
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Error handling & loading states
- ✅ Timestamp of last update

### Step 3: Component Props (Optional)
```jsx
<SystemHealth 
  refreshInterval={10000}  // Auto-refresh interval in ms (default: 10000)
  onHealthChange={handleHealthChange}  // Callback when health changes
/>
```

## Testing the Endpoints

### Using Browser Console
```javascript
const token = localStorage.getItem('token');

// Test basic health endpoint
fetch('/api/system-health', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Health:', data))
.catch(e => console.error('Error:', e));

// Test quick health check (lightweight)
fetch('/api/system-health/quick', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Quick Check:', data));
```

### Using cURL
```bash
# Replace YOUR_TOKEN with actual JWT token
curl -X GET http://localhost:5000/api/system-health \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Quick health check
curl -X GET http://localhost:5000/api/system-health/quick \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get alerts
curl -X GET http://localhost:5000/api/system-health/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman
1. Create GET request to `http://localhost:5000/api/system-health`
2. Go to **Auth** tab → Bearer Token
3. Paste your JWT token
4. Click **Send**

## Troubleshooting

### Issue: "Failed to load health data"
**Symptoms:** Shows error message instead of data

**Causes & Solutions:**
1. **Not logged in / Invalid token**
   - Login as admin user
   - Check `localStorage.getItem('token')` returns a value
   
2. **Not an admin**
   - Only admins can access health endpoints
   - Check user role is 'admin'
   
3. **Backend not running**
   - Start backend: `npm run run`
   - Check terminal for errors
   
4. **Health monitor not initialized**
   - Restart backend server
   - Check `systemHealthMonitor.startMonitoring()` is called in server.js

### Issue: "SERVER STATUS DOWN"
**Symptoms:** Shows DOWN status even though server is running

**Causes:**
1. Database connection failed
   - Check MongoDB is running
   - Verify MONGODB_URI in .env
   
2. Health monitor service crashed
   - Restart backend
   - Check for errors in terminal
   
3. healthMonitor.getHealthStatus() returns null
   - Ensure health monitor is initialized
   - Check /backend/services/systemHealthMonitor.js exists

### Issue: CORS Error
**Solution:** Ensure frontend origin is in CORS whitelist:
```javascript
// In backend/server.js
cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
})
```

### Issue: "Cannot read property 'getHealthStatus' of undefined"
**Cause:** System health monitor service not properly imported

**Solution:**
```javascript
// In systemHealthController.js - verify this exists:
const healthMonitor = require('../services/systemHealthMonitor');
```

## Performance Metrics Explanation

### CPU Usage
- Percentage of CPU cores in use
- Load average shows threads waiting for CPU time
- Warning triggered if > 80%

### Memory Usage
- **Used**: Bytes currently allocated
- **Total**: Total available memory
- **Percent Used**: Percentage of total memory in use
- Critical if > 90%

### Disk Usage
- **Used**: Bytes of disk space in use
- **Total**: Total disk capacity
- **Percent Used**: Percentage of total disk space
- Alert if > 85%

### Database Status
- **UP**: MongoDB/SQL database is responsive
- **DOWN**: Cannot connect to database
- **Response Time**: How long queries take (should be < 50ms for healthy)

### Application Status
- **UP**: Application is running normally
- **DEGRADED**: Running but with issues
- **DOWN**: Application has crashed or major error

## Status Indicators

| Status | Meaning | Color |
|--------|---------|-------|
| UP | All systems normal | 🟢 Green |
| ONLINE | Service is operational | 🟢 Green |
| healthy | Component is healthy | 🟢 Green |
| DOWN | Critical failure | 🔴 Red |
| OFFLINE | Service unavailable | 🔴 Red |
| unhealthy | Component has issues | 🔴 Red |
| DEGRADED | Reduced functionality | 🟡 Yellow |
| WARNING | Needs attention | 🟡 Yellow |
| CRITICAL | Urgent attention needed | 🔴 Red |

## Backend Configuration

### Monitoring Interval
```javascript
// In server.js - Change monitoring frequency
healthMonitor.startMonitoring(5000); // Check every 5 seconds
```

### Alert Thresholds
Edit in `/backend/services/systemHealthMonitor.js`:
```javascript
const THRESHOLDS = {
  cpu: 80,        // Alert if CPU > 80%
  memory: 90,     // Alert if memory > 90%
  disk: 85,       // Alert if disk > 85%
  responseTime: 50 // Alert if DB response > 50ms
};
```

## Real-time Updates with WebSocket

The health monitor can emit real-time updates via Socket.io:

```javascript
// Frontend - Listen for health updates
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') }
});

socket.on('system_health_update', (health) => {
  console.log('Health updated:', health);
  // Update UI with fresh data
});
```

## File Structure

```
/workspaces/Airswift-Backend/
├── components/
│   └── SystemHealth.jsx          ← React component
├── styles/
│   └── SystemHealth.css          ← Styling
├── backend/
│   ├── controllers/
│   │   └── systemHealthController.js   ← API handlers
│   ├── services/
│   │   └── systemHealthMonitor.js      ← Health monitoring logic
│   ├── routes/
│   │   └── systemHealth.js             ← Routes definition
│   └── server.js                       ← Health monitor initialization
```

## Security

- ✅ Requires admin role to access all endpoints
- ✅ JWT token authentication required
- ✅ Middleware protection on all routes
- ✅ No sensitive data exposed in responses
- ✅ Rate limiting on health endpoints

## Next Steps

1. ✅ Import SystemHealth component into admin page
2. ✅ Test with browser console (see Testing section)
3. ✅ Verify system health displays correctly
4. ✅ Check alerts are working
5. ✅ Monitor real-time updates
6. ✅ Deploy to production

## Support

For debugging:
1. Check browser console for errors (F12)
2. Check network tab for API responses
3. Check backend logs for errors
4. Verify MongoDB is running
5. Verify JWT token is valid
6. Check user has admin role

---

System Health Dashboard ready! 🎉
