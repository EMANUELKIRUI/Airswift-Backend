/**
 * RBAC with Permissions - Example Routes
 * 
 * This file demonstrates how to use the new permission system
 * Copy these patterns to your route files
 */

const express = require('express');
const { protect, authorize, permit } = require('../middleware/auth');

const router = express.Router();

// ✅ EXAMPLE 1: User Only (Any authenticated user)
router.get('/profile', protect, (req, res) => {
  // req.user contains: id, role, permissions
  res.json({ 
    message: `Hello ${req.user.id}`,
    role: req.user.role,
    permissions: req.user.permissions
  });
});

// ✅ EXAMPLE 2: Admin Only (By role)
router.get('/admin/dashboard', protect, authorize('admin'), (req, res) => {
  res.json({ 
    message: 'Welcome to admin dashboard',
    adminId: req.user.id
  });
});

// ✅ EXAMPLE 3: Multiple Roles
router.get('/interviews', protect, authorize('admin', 'recruiter'), (req, res) => {
  res.json({ 
    message: 'Interviews page',
    viewAs: req.user.role
  });
});

// ✅ EXAMPLE 4: Permission Check (edit_templates)
router.put('/email-templates/:id', 
  protect, 
  permit('edit_templates'), 
  (req, res) => {
    res.json({ 
      message: 'Template updated',
      permission: 'edit_templates'
    });
  }
);

// ✅ EXAMPLE 5: Multiple Permissions (All required)
router.post('/interviews/:id/schedule', 
  protect, 
  permit('schedule_interviews', 'view_all_applications'),
  (req, res) => {
    res.json({ 
      message: 'Interview scheduled',
      requiredPermissions: ['schedule_interviews', 'view_all_applications']
    });
  }
);

// ✅ EXAMPLE 6: Role + Permission
router.delete('/users/:id', 
  protect,
  authorize('admin'),        // Must be admin
  permit('delete_user'),     // Must have delete permission
  (req, res) => {
    res.json({ 
      message: 'User deleted',
      deletedBy: req.user.id,
      userRole: req.user.role
    });
  }
);

// ✅ EXAMPLE 7: Conditional Logic Inside Handler
router.get('/dashboard', protect, (req, res) => {
  const { role, permissions } = req.user;

  if (role === 'admin') {
    // Show admin dashboard
    return res.json({ 
      dashboard: 'admin',
      availableActions: permissions
    });
  }
  
  if (role === 'user') {
    // Show user dashboard
    return res.json({ 
      dashboard: 'user',
      availableActions: permissions
    });
  }

  res.status(403).json({ message: 'Unknown role' });
});

// ✅ EXAMPLE 8: Job Application (User only)
router.post('/applications', 
  protect, 
  permit('apply_jobs'),
  async (req, res) => {
    // req.user.id is the applicant
    const application = {
      userId: req.user.id,
      jobId: req.body.jobId,
      status: 'pending'
    };

    res.json({ 
      message: 'Application submitted',
      application 
    });
  }
);

// ✅ EXAMPLE 9: Approve Application (Admin only)
router.put('/applications/:id/approve', 
  protect,
  authorize('admin'),
  permit('manage_applications'),
  async (req, res) => {
    // req.user.id is the admin
    const updatedApplication = {
      id: req.params.id,
      status: 'approved',
      approvedBy: req.user.id
    };

    res.json({ 
      message: 'Application approved',
      application: updatedApplication
    });
  }
);

// ✅ EXAMPLE 10: View Audit Logs (Admin only)
router.get('/audit-logs', 
  protect,
  authorize('admin'),
  permit('view_audit_logs'),
  async (req, res) => {
    // Only admins with view_audit_logs permission
    res.json({ 
      message: 'Audit logs retrieved',
      logsCount: 150
    });
  }
);

// ✅ EXAMPLE 11: Check Permissions in Handler
router.post('/sensitive-action', protect, (req, res) => {
  const requiredPermission = 'edit_templates';
  
  if (!req.user.permissions.includes(requiredPermission)) {
    return res.status(403).json({ 
      message: `Permission denied: requires ${requiredPermission}`,
      yourPermissions: req.user.permissions
    });
  }

  // Action allowed
  res.json({ 
    message: 'Action completed',
    performedBy: req.user.id
  });
});

// ✅ EXAMPLE 12: Jobs Management (Admin only)
router.post('/jobs', 
  protect,
  authorize('admin'),
  permit('manage_jobs'),
  (req, res) => {
    res.json({ 
      message: 'Job created',
      createdBy: req.user.id,
      job: req.body
    });
  }
);

router.put('/jobs/:id', 
  protect,
  authorize('admin'),
  permit('manage_jobs'),
  (req, res) => {
    res.json({ 
      message: 'Job updated',
      jobId: req.params.id,
      updatedBy: req.user.id
    });
  }
);

router.delete('/jobs/:id', 
  protect,
  authorize('admin'),
  permit('manage_jobs'),
  (req, res) => {
    res.json({ 
      message: 'Job deleted',
      jobId: req.params.id,
      deletedBy: req.user.id
    });
  }
);

// ✅ EXAMPLE 13: Settings Management
router.put('/settings', 
  protect,
  authorize('admin'),
  permit('manage_settings'),
  (req, res) => {
    res.json({ 
      message: 'Settings updated',
      updatedBy: req.user.id,
      settings: req.body
    });
  }
);

// ✅ EXAMPLE 14: Template Management
router.get('/email-templates', 
  protect,
  // Everyone can view templates, but only admins can edit
  (req, res) => {
    res.json({ 
      message: 'Templates retrieved',
      templates: [
        { id: 1, name: 'Welcome' },
        { id: 2, name: 'Approval' }
      ]
    });
  }
);

router.put('/email-templates/:id', 
  protect,
  permit('edit_templates'),  // Only admins have this
  (req, res) => {
    res.json({ 
      message: 'Template updated',
      templateId: req.params.id,
      editedBy: req.user.id
    });
  }
);

// ✅ EXAMPLE 15: Recruiter Features
router.post('/recruiter/schedule-interview', 
  protect,
  authorize('recruiter', 'admin'),  // Recruiters or admins
  permit('schedule_interviews'),
  (req, res) => {
    res.json({ 
      message: 'Interview scheduled',
      scheduledBy: req.user.id,
      userRole: req.user.role
    });
  }
);

/**
 * ERROR HANDLING EXAMPLES
 */

// If middleware denies access, automatic error response:
// 401: No token provided
// 401: Invalid token
// 403: Access denied. Requires: admin
// 403: Permission denied

/**
 * SUMMARY
 * 
 * protect           - Requires valid JWT token
 * authorize('role') - Requires specific role(s)
 * permit('perm')    - Requires specific permission(s)
 * 
 * Order matters:
 * 1. protect (always first)
 * 2. authorize (then role checks)
 * 3. permit (then permission checks)
 * 4. handler (finally your logic)
 */

module.exports = router;
