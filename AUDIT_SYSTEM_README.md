# User Activity Audit Log System

A comprehensive audit logging system for tracking user activities, detecting suspicious behavior, and maintaining security in the Airswift Backend application.

## 🎯 Features Implemented

### ✅ Database Design
- **UserActivityAudit Model**: MongoDB/Mongoose model for storing audit logs
- **Comprehensive Fields**: user_id, action, ip_address, user_agent, device_info, suspicious flag, timestamps
- **Performance Indexes**: Optimized queries with database indexes on key fields

### ✅ Backend Logic
- **Central Logging Function**: `logUserActivity()` in `utils/auditLogger.js`
- **Automatic Logging**: Integrated into registration and login flows
- **Device Detection**: Parses user agent strings to extract browser, OS, and device type
- **Suspicious Activity Detection**: Flags multiple IPs, rapid failed logins, unusual patterns

### ✅ API Endpoints
- `GET /api/user-activity-audit` - Get audit logs with filtering and pagination
- `GET /api/user-activity-audit/export` - Export logs to CSV/JSON
- `GET /api/user-activity-audit/suspicious` - Get suspicious activities
- `DELETE /api/user-activity-audit/cleanup` - Cleanup old logs

### ✅ Admin UI
- **Complete HTML Interface**: `admin-audit-logs.html`
- **Advanced Filtering**: Action type, user search, IP filter, date range
- **Real-time Updates**: Socket.io integration for live monitoring
- **Statistics Dashboard**: Total logs, suspicious count, unique users/IPs
- **Export Functionality**: CSV download with all log data
- **Responsive Design**: Mobile-friendly interface

### ✅ Real-time Monitoring
- **Socket.io Events**: Emits `audit_log` events for new activities
- **Live Updates**: Admin dashboard updates instantly
- **Notification System**: Alerts for suspicious activities

### ✅ Security & Access Control
- **Admin Only**: All endpoints require admin authentication
- **Data Protection**: Sensitive information properly handled
- **Input Validation**: All API inputs validated with Joi

## 📊 What Gets Logged

| Action | Trigger | Details |
|--------|---------|---------|
| `REGISTER` | User registration | Account creation |
| `LOGIN` | Successful login | User authentication |
| `LOGOUT` | User logout | Session termination |
| `FAILED_LOGIN` | Failed login attempt | Invalid credentials |
| `EMAIL_VERIFICATION` | Email verification | Account activation |
| `PASSWORD_RESET` | Password reset | Security action |

## 🔍 Suspicious Activity Detection

The system automatically flags activities as suspicious when:

- **Multiple IPs**: Same user logs in from 3+ different IP addresses within 24 hours
- **Rapid Failures**: 5+ failed login attempts within a short time period
- **Unusual Patterns**: Other security-related anomalies

## 🚀 Usage

### Backend Integration
```javascript
const { logRegistration, logLogin, logFailedLogin } = require('./utils/auditLogger');

// In registration controller
await logRegistration(user._id, req);

// In login controller
await logLogin(user._id, req);

// On failed login
await logFailedLogin(req, email);
```

### Admin Interface
1. Navigate to `admin-audit-logs.html`
2. View real-time statistics and logs
3. Apply filters to narrow down results
4. Export data for compliance/reporting
5. Monitor suspicious activities

### API Usage
```javascript
// Get filtered logs
GET /api/user-activity-audit?action=LOGIN&start_date=2024-01-01

// Export to CSV
GET /api/user-activity-audit/export?format=csv&suspicious_only=true

// Get suspicious activities
GET /api/user-activity-audit/suspicious?limit=20
```

## 📁 File Structure

```
backend/
├── models/
│   └── UserActivityAudit.js          # Audit log model
├── controllers/
│   └── userActivityAuditController.js # API logic
├── routes/
│   └── userActivityAudit.js          # API routes
├── utils/
│   └── auditLogger.js                # Logging utilities
└── server.js                         # Route registration

admin-audit-logs.html                 # Admin interface
AUDIT_SYSTEM_README.md               # This documentation
```

## 🔧 Configuration

### Database Indexes (Auto-created)
```javascript
// Performance optimized indexes
{ user_id: 1 }
{ action: 1 }
{ created_at: -1 }
{ ip_address: 1 }
{ suspicious: 1 }
```

### Environment Variables
No additional environment variables required - uses existing MongoDB connection.

### Cleanup (Optional)
```javascript
// Remove logs older than 1 year
DELETE /api/user-activity-audit/cleanup
// Body: { "days_old": 365 }
```

## 📈 Performance Optimization

- **Pagination**: 50 logs per page to prevent memory issues
- **Indexing**: Strategic database indexes for fast queries
- **Filtering**: Server-side filtering reduces client-side processing
- **Caching**: Results cached for repeated queries
- **Cleanup**: Automated removal of old logs

## 🔒 Security Features

- **Admin Authentication**: JWT token required for all endpoints
- **Input Sanitization**: All inputs validated and sanitized
- **IP Tracking**: Full IP address logging for security analysis
- **Device Fingerprinting**: Browser/OS detection for anomaly detection
- **Suspicious Flagging**: Automatic detection of security threats

## 📊 Real-time Features

- **Live Updates**: New activities appear instantly in admin dashboard
- **Socket Events**: `audit_log` events emitted for real-time monitoring
- **Notification Alerts**: Suspicious activities trigger notifications
- **Statistics Updates**: Dashboard numbers update in real-time

## 🧪 Testing

### Manual Testing
1. Register a new user → Check audit logs
2. Login successfully → Verify login entry
3. Attempt failed login → Check suspicious flag
4. Use admin interface → Test filtering and export

### API Testing
```bash
# Get recent logs
curl -H "Authorization: Bearer <admin_token>" \
     "http://localhost:3000/api/user-activity-audit?page=1&limit=10"

# Export logs
curl -H "Authorization: Bearer <admin_token>" \
     "http://localhost:3000/api/user-activity-audit/export" \
     -o audit-logs.csv
```

## 🚨 Monitoring & Alerts

- **Suspicious Activities**: Highlighted in red with warning icons
- **Real-time Notifications**: Browser notifications for new suspicious activities
- **Statistics Dashboard**: Overview of system activity and security status
- **Export for Analysis**: CSV export for detailed security analysis

## 🔄 Future Enhancements

- **Geolocation**: IP-based location tracking
- **Advanced Analytics**: Trend analysis and reporting
- **Automated Alerts**: Email/SMS notifications for security events
- **Machine Learning**: AI-powered anomaly detection
- **Integration**: SIEM system integration for enterprise security

---

## ✅ Implementation Status

- ✅ Database model with indexes
- ✅ Backend logging functions
- ✅ API endpoints with filtering
- ✅ Admin HTML interface
- ✅ Real-time socket events
- ✅ Suspicious activity detection
- ✅ Export functionality
- ✅ Security and validation
- ✅ Performance optimization
- ✅ Documentation

**Status: COMPLETE** - Full audit logging system implemented and ready for production use.