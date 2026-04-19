/**
 * RBAC Permission Middleware Examples
 * 
 * Shows best practices for using the permit() middleware
 * in various route scenarios
 */

const express = require('express');
const { authMiddleware, permit, isAdmin } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ✅ EXAMPLE 1: Single Permission Check
// ============================================================
// Only users with 'manage_applications' permission can update status

router.put(
  '/applications/:id/status',
  authMiddleware,
  permit('manage_applications'),
  async (req, res) => {
    try {
      const { status } = req.body;
      
      // User is guaranteed to have permission at this point
      const application = await Application.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      // Emit socket event to notify user
      global.io.to(`user_${application.userId}`).emit('status:update', {
        status,
        message: `✅ Your application was ${status}!`,
      });

      res.json({
        success: true,
        application,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 2: Multiple Permissions (ALL Required)
// ============================================================
// Only users with BOTH 'manage_users' AND 'view_analytics' permissions

router.get(
  '/admin/analytics',
  authMiddleware,
  permit('manage_users', 'view_analytics'),
  async (req, res) => {
    try {
      // Complex analytics that needs both permissions
      const analytics = await getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 3: Admin-Only Route
// ============================================================
// Use isAdmin for simple admin checks

router.delete(
  '/users/:id',
  authMiddleware,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'User deleted',
        user,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 4: Routes with Custom Logic
// ============================================================
// Users can view their own data, admins can view all

router.get(
  '/applications/:id',
  authMiddleware,
  permit('view_my_applications'),
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.id);

      // Custom check: Ensure user is viewing their own or admin
      if (
        application.userId !== req.user.id &&
        !req.user.permissions.includes('view_all_applications')
      ) {
        return res.status(403).json({
          message: 'Cannot view other users applications',
        });
      }

      res.json(application);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 5: Audit Logging with Permissions
// ============================================================
// Track admin actions for compliance

router.post(
  '/settings',
  authMiddleware,
  permit('manage_settings'),
  async (req, res) => {
    try {
      const { key, value } = req.body;

      // Log the admin action
      await AuditLog.create({
        admin_id: req.user.id,
        action: 'UPDATE_SETTING',
        details: { key, value },
        timestamp: new Date(),
      });

      // Update setting
      const setting = await Setting.findOneAndUpdate(
        { key },
        { value },
        { new: true }
      );

      res.json({
        success: true,
        setting,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 6: Conditional Permission Checks
// ============================================================
// Different logic based on user permissions

router.get(
  '/dashboard',
  authMiddleware,
  async (req, res) => {
    try {
      let dashboard = {};

      // Serve different data based on permissions
      if (req.user.permissions.includes('view_dashboard')) {
        dashboard.admin_stats = await getAdminStats();
        dashboard.users = await getAllUsers();
      }

      if (req.user.permissions.includes('view_my_applications')) {
        dashboard.my_applications = await getUserApplications(req.user.id);
      }

      if (req.user.permissions.includes('view_analytics')) {
        dashboard.analytics = await getAnalytics();
      }

      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 7: Multi-Level Permission Checks
// ============================================================
// Routes that need different permissions at different stages

router.put(
  '/interviews/:id/complete',
  authMiddleware,
  async (req, res) => {
    try {
      const interview = await Interview.findById(req.params.id);

      // Interviewer can complete if they have permission
      if (
        interview.interviewer_id === req.user.id &&
        req.user.permissions.includes('schedule_interviews')
      ) {
        // Interviewer completing interview
        await Interview.findByIdAndUpdate(req.params.id, {
          status: 'completed',
          completed_by: req.user.id,
        });
      }
      // Admin can always complete
      else if (req.user.permissions.includes('manage_interviews')) {
        // Admin completing interview
        await Interview.findByIdAndUpdate(req.params.id, {
          status: 'completed',
          completed_by: req.user.id,
        });
      } else {
        return res.status(403).json({
          message: 'You cannot complete this interview',
        });
      }

      res.json({
        success: true,
        message: 'Interview completed',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// ✅ EXAMPLE 8: Error Response with Permissions
// ============================================================
// Clear error messages about missing permissions

router.post(
  '/send-email',
  authMiddleware,
  permit('manage_settings'),
  async (req, res) => {
    // Error handling is automatic via permit() middleware
    // Response format:
    // {
    //   "message": "Permission denied",
    //   "required": ["manage_settings"],
    //   "current": ["apply_jobs", "view_profile"]
    // }
  }
);

// ============================================================
// PERMISSION REFERENCE
// ============================================================
/*
Available Permissions:

USER PERMISSIONS:
- 'apply_jobs': Apply for job positions
- 'view_profile': View own profile
- 'edit_profile': Edit own profile
- 'submit_application': Submit job applications
- 'view_my_applications': View own applications
- 'view_interviews': View own interviews

ADMIN PERMISSIONS:
- 'manage_users': Manage all users
- 'delete_user': Delete user accounts
- 'view_dashboard': Access admin dashboard
- 'view_all_applications': View all applications
- 'manage_applications': Update application status
- 'edit_templates': Edit email templates
- 'manage_jobs': Create and edit jobs
- 'manage_interviews': Manage all interviews
- 'view_analytics': View system analytics
- 'view_audit_logs': View audit logs
- 'manage_settings': Manage system settings

RECRUITER PERMISSIONS:
- 'recruit_users': Manage recruitment
- 'schedule_interviews': Schedule interviews
- 'view_recruiter_dashboard': Access recruiter dashboard
*/

module.exports = router;
