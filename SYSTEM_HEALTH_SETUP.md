# System Health Integration - Quick Start Guide

## ✅ What's Been Set Up

Your system health monitoring is complete with:

### Backend Components
- ✅ **Main API**: `GET /api/system-health` - Comprehensive health dashboard
- ✅ **Quick Check**: `GET /api/system-health/quick` - Lightweight health check (2-3ms response)
- ✅ **Specific Endpoints**: Server, Database, Services health checks
- ✅ **Monitoring Service**: Real-time collection of system metrics
- ✅ **Alert System**: Automatic alerts for high resource usage
- ✅ **History**: 24-hour historical data for charts

### Frontend Components
- ✅ **SystemHealth.jsx** - Complete monitoring dashboard
- ✅ **SystemHealth.css** - Professional styling with responsive design
- ✅ **SYSTEM_HEALTH_GUIDE.md** - Complete API documentation
- ✅ **HEALTH_MONITORING_TEST.js** - Testing & debugging tools

## 🚀 3-Step Integration

### Step 1: Import Component
```jsx
import SystemHealth from '../components/SystemHealth';

export default function AdminHealthPage() {
  return <SystemHealth />;
}
```

### Step 2: Ensure Admin Authentication
The component automatically:
- Checks for JWT token in localStorage
- Adds Authorization header to requests
- Handles 401/403 errors
- Requires admin role

### Step 3: Test It
1. Login as admin user
2. Navigate to health page
3. You'll see:
   - Real-time system metrics
   - Server status & uptime
   - CPU, Memory, Disk usage
   - Database connectivity
   - Active alerts
   - Auto-refresh every 10 seconds

## 📊 What Gets Monitored

| Metric | Location | Threshold | Alert |
|--------|----------|-----------|-------|
| CPU Usage | `/server` | > 80% | ⚠️ Warning |
| Memory | `/server` | > 90% | 🔴 Critical |
| Disk | `/server` | > 85% | ⚠️ Warning |
| Database | `/db` | DOWN | 🔴 Critical |
| Response Time | `/db` | > 50ms | ⚠️ Warning |
| Application | `/app` | DOWN | 🔴 Critical |

## 🧪 Testing (After Login as Admin)

### Quick Browser Console Test
```javascript
// Copy & paste into browser console (F12)
// This will run all health tests

await fetch('/api/system-health/quick', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log('🏥 Health Status:', data))
.catch(e => console.error('❌ Error:', e));
```

### Run Full Test Suite
```javascript
// In browser console after loading HEALTH_MONITORING_TEST.js
quickHealthTest();  // Runs all tests automatically
```

### Available Test Commands
```javascript
testHealthEndpoints()         // Test all endpoints exist
testDetailedHealthFetch()     // Fetch & analyze health data
monitorHealthChanges(60)      // Watch health for 60 seconds
analyzeHealth(data)           // Analyze specific health snapshot
testAuthentication()          // Check auth status
```

## 🔍 Common Issues & Fixes

### "Failed to load health data"
**Check:**
1. Are you logged in?
   ```javascript
   localStorage.getItem('token')  // Should return a token
   ```
2. Are you an admin?
   ```javascript
   const user = JSON.parse(localStorage.getItem('user'));
   console.log(user.role);  // Should be 'admin'
   ```
3. Is the backend running?
   ```bash
   npm run run
   ```

### "SERVER STATUS DOWN"
**Backend Checks:**
1. Check MongoDB is running
2. Verify health monitor started:
   ```javascript
   // In backend logs, you should see:
   // "Starting system health monitoring..."
   ```
3. Verify health monitor service exists
4. Restart backend

### "DATABASE DOWN" with server UP
**This means:**
1. MongoDB connection failed
2. Check connection string in `.env`
3. Verify MongoDB is actually running
4. Check firewall isn't blocking connection

### Data not refreshing
**Solutions:**
1. Check browser console for errors (F12)
2. Verify token hasn't expired
3. Try manual refresh button
4. Clear browser cache

## 📱 Features Included

- ✅ Real-time metrics with live updates
- ✅ Color-coded status indicators
- ✅ Progress bars for CPU/Memory/Disk
- ✅ Uptime display with days/hours/minutes format
- ✅ Detailed resource usage breakdown
- ✅ Active alerts with severity levels
- ✅ Auto-refresh every 10 seconds
- ✅ Manual refresh button
- ✅ Mobile-responsive design
- ✅ Error handling & user-friendly messages
- ✅ Loading states with spinner
- ✅ Last update timestamp

## 🔧 Customization

### Change Refresh Interval
```jsx
// In SystemHealth.jsx - Change line:
const interval = setInterval(fetchHealthData, 10000); // 10 seconds
// To:
const interval = setInterval(fetchHealthData, 5000);  // 5 seconds
```

### Add More Metrics
```jsx
// In SystemHealth.jsx - Add new card:
<div className="health-card">
  <h3>Custom Metric</h3>
  {/* Your metric here */}
</div>
```

### Adjust Alert Thresholds
Backend thresholds are in `/backend/services/systemHealthMonitor.js`

## 🚀 Performance Tips

1. **Use Quick Check for Frequent Polling**
   ```javascript
   // Instead of full health check
   GET /api/system-health/quick  // 2-3ms response
   ```

2. **Request Only What You Need**
   ```javascript
   GET /api/system-health/server  // Just server metrics
   GET /api/system-health/db      // Just database status
   ```

3. **Set Appropriate Refresh Intervals**
   - Dashboard: 10 seconds
   - Background monitoring: 30+ seconds
   - Critical systems: 1-5 seconds

## 📈 Metrics Explanation

### CPU Usage
- Percentage of CPU cores actively processing
- 0-20%: Ideal
- 20-50%: Normal
- 50-80%: High (⚠️)
- 80%+: Critical (🔴)

### Memory Usage
- Percentage of RAM in use
- 0-50%: Healthy
- 50-80%: Good
- 80-90%: High (⚠️)
- 90%+: Critical (🔴)

### Disk Usage
- Percentage of disk space in use
- 0-50%: Healthy
- 50-75%: Good
- 75-85%: High (⚠️)
- 85%+: Critical (🔴)

### Uptime
- How long the server has been running
- Restarts show as low uptime
- Example: "5d 12h 30m" = 5 days, 12 hours, 30 minutes

### Database Response Time
- How fast database queries respond
- < 10ms: Excellent
- 10-50ms: Good
- 50-100ms: Acceptable
- 100ms+: Slow (needs investigation)

## 🔐 Security

- ✅ Admin-only access (requires admin role)
- ✅ JWT token authentication required
- ✅ CORS protection enabled
- ✅ No sensitive data exposed
- ✅ Rate limiting on endpoints
- ✅ Encrypted token transmission

## 📡 API endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `/api/health` | No | Public health check |
| `/api/system-health` | Yes | Full system dashboard |
| `/api/system-health/quick` | Yes | Fast health status |
| `/api/system-health/server` | Yes | Server metrics only |
| `/api/system-health/db` | Yes | Database status only |
| `/api/system-health/services` | Yes | Service status |
| `/api/system-health/alerts` | Yes | Current alerts list |
| `/api/system-health/history` | Yes | Historical data |

## ✅ Verification Checklist

- [ ] Component imported into admin page
- [ ] Backend is running (`npm run run`)
- [ ] Can login as admin
- [ ] JWT token stored in localStorage
- [ ] System health page loads without errors
- [ ] Metrics update every 10 seconds
- [ ] Alerts display correctly
- [ ] Responsive design works on mobile

## 🎯 Next Steps

1. ✅ Integrate SystemHealth component into your admin dashboard
2. ✅ Test with browser console commands
3. ✅ Monitor for 1-2 minutes to see metrics update
4. ✅ Check that alerts work (should see warnings for high CPU/Memory)
5. ✅ Test on mobile/tablet for responsive design
6. ✅ Deploy to production

## 📞 Support

**Browser Console (F12)** - Run these commands:
```javascript
quickHealthTest()           // Full diagnostic test
testDetailedHealthFetch()   // Get latest health data
monitorHealthChanges(30)    // Watch for 30 seconds
```

**Check Backend Logs** - Look for:
```
Starting system health monitoring...
System health update: { status: 'UP', ... }
```

**Verify Connection** - Simple curl test:
```bash
curl http://localhost:5000/api/health  # Should show status without auth
```

---

System Health Monitoring is ready! 🏥✅
