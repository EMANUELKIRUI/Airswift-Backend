const express = require("express");
const router = express.Router();
const { protect, authorize, permit } = require("../middleware/auth");

const User = require("../models/User");
const Application = require("../models/ApplicationMongoose");
const Interview = require("../models/Interview");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLogMongo");

// 🔐 Protect all admin routes - requires admin role
router.use(protect, authorize('admin'));

//
// ✅ USERS - requires manage_users permission
//
router.get("/users", permit('manage_users'), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id", permit('manage_users'), async (req, res) => {
  try {
    const { applicationStatus, name, email, role, isVerified, phone, location, bio } = req.body;
    const userId = req.params.id;

    // Build update object with only provided fields
    const updateData = {};
    if (applicationStatus !== undefined) updateData.applicationStatus = applicationStatus;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    
    // Track when changes were saved
    updateData.lastModifiedBy = req.user.id;
    updateData.lastModifiedAt = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the update in audit logs
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE_USER',
      resource: 'User',
      description: `Updated user: ${user.name} (${user.email})`,
      changes: updateData,
    });

    // Emit real-time update
    const io = require('../utils/socket').getIO();
    io.emit('userUpdated', { userId, user });

    res.json({ success: true, message: 'User updated successfully', user });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a user
router.delete("/users/:id", permit('manage_users'), async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the only admin or self
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the only admin user' });
      }
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Log deletion before removing
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE_USER',
      resource: 'User',
      description: `Deleted user: ${user.name} (${user.email})`,
      deletedData: { id: user._id, name: user.name, email: user.email, role: user.role },
    });

    await User.findByIdAndDelete(userId);

    // Emit real-time update
    const io = require('../utils/socket').getIO();
    io.emit('userDeleted', { userId });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ APPLICATIONS - requires view_all_applications permission
//
router.get("/applications", permit('view_all_applications'), async (req, res) => {
  try {
    const apps = await Application.find()
      .populate("userId", "name email phone location")
      .populate("jobId", "title description")
      .sort({ createdAt: -1 });

    console.log('✅ Admin fetched', apps.length, 'applications');

    res.json({
      success: true,
      count: apps.length,
      data: apps,
    });
  } catch (err) {
    console.error('❌ Admin fetch error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Update an application
router.put("/applications/:id", permit('view_all_applications'), async (req, res) => {
  try {
    const { status, notes, score, skills } = req.body;
    const appId = req.params.id;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (score !== undefined) updateData.score = score;
    if (skills !== undefined) updateData.skills = skills;

    // Track when changes were saved
    updateData.lastModifiedBy = req.user.id;
    updateData.lastModifiedAt = new Date();

    const app = await Application.findByIdAndUpdate(
      appId,
      updateData,
      { new: true }
    ).populate("userId", "name email phone location")
      .populate("jobId", "title description");

    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Log the update in audit logs
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE_APPLICATION',
      resource: 'Application',
      description: `Updated application status to: ${app.status}`,
      changes: updateData,
    });

    // Emit real-time update
    const io = require('../utils/socket').getIO();
    io.emit('applicationUpdated', { appId, app });

    res.json({ success: true, message: 'Application updated successfully', data: app });
  } catch (err) {
    console.error('Application update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an application
router.delete("/applications/:id", permit('view_all_applications'), async (req, res) => {
  try {
    const appId = req.params.id;

    const app = await Application.findById(appId);
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Log deletion before removing
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE_APPLICATION',
      resource: 'Application',
      description: `Deleted application with status: ${app.status}`,
      deletedData: { id: app._id, status: app.status, userId: app.userId, jobId: app.jobId },
    });

    await Application.findByIdAndDelete(appId);

    // Emit real-time update
    const io = require('../utils/socket').getIO();
    io.emit('applicationDeleted', { appId });

    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    console.error('Application delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ INTERVIEWS - requires manage_interviews permission
//
router.get("/interviews", permit('manage_interviews'), async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate("user", "name email")
      .populate("application");

    res.json(interviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ PAYMENTS - requires view_analytics permission
//
router.get("/payments", permit('view_analytics'), async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ AUDIT LOGS - requires view_audit_logs permission
//
router.get("/audit", permit('view_audit_logs'), async (req, res) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;

    let query = {};

    // 🔍 Search (description)
    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    // 🎯 Filter by action
    if (action && action !== "all") {
      query.action = action;
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate("user_id", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    console.log(`✅ Admin fetched ${logs.length} audit logs (Total: ${total})`);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('❌ Admin audit logs fetch error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Failed to fetch audit logs" 
    });
  }
});

//
// ✅ SETTINGS - requires manage_settings permission
//
router.get("/settings", permit('manage_settings'), async (req, res) => {
  try {
    console.log('📥 Admin fetching settings...');
    
    // Import Settings model
    const Settings = require('../models/Settings');
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({});
    }

    console.log('✅ Settings fetched successfully');

    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error('❌ Error fetching settings:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Update settings
router.put("/settings", permit('manage_settings'), async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    
    console.log('💾 Admin updating settings:', req.body);
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      // Track changes for audit log
      const changes = {};
      Object.keys(req.body).forEach(key => {
        if (JSON.stringify(settings[key]) !== JSON.stringify(req.body[key])) {
          changes[key] = {
            old: settings[key],
            new: req.body[key]
          };
        }
      });
      
      // Update settings
      Object.assign(settings, req.body);
      
      // Log the changes
      if (Object.keys(changes).length > 0) {
        await AuditLog.create({
          user_id: req.user.id,
          action: 'UPDATE_SETTINGS',
          resource: 'Settings',
          description: `Updated system settings: ${Object.keys(changes).join(', ')}`,
          changes: changes,
        });
      }
    }

    await settings.save();

    // Emit real-time update to all connected clients
    const io = require('../utils/socket').getIO();
    io.emit('settingsUpdated', { settings });

    console.log('✅ Settings saved successfully');

    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: settings,
    });
  } catch (err) {
    console.error('❌ Error saving settings:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Get settings change history
router.get("/settings/history", permit('manage_settings'), async (req, res) => {
  try {
    console.log('📊 Fetching settings change history...');
    
    const logs = await AuditLog.find({
      action: 'UPDATE_SETTINGS'
    })
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error('❌ Error fetching settings history:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;
