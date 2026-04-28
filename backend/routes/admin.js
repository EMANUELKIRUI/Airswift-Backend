const express = require("express");
const router = express.Router();
const { protect, authorize, permit } = require("../middleware/auth");
const mongoose = require("mongoose");
const { list, single, created, success, error: errorFormatter } = require("../utils/responseFormatter");

// Import both model types
const SettingsModels = require("../models/Settings");
const AuditLogMongo = require("../models/AuditLogMongo");
const AuditLogSequelize = require("../models/AuditLog");

// Helper function to get the correct models at runtime
const getModels = () => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  return {
    Settings: SettingsModels.getModel(),
    AuditLog: isMongoConnected ? AuditLogMongo : AuditLogSequelize,
    isMongoConnected
  };
};

const Interview = require("../models/Interview");
const Payment = require("../models/Payment");

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

router.post("/users", permit('manage_users'), async (req, res) => {
  try {
    const { name, email, role = 'user', isVerified = false, phone, location, bio } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const newUser = new User({
      name,
      email,
      role,
      isVerified,
      phone,
      location,
      bio,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
    });

    await newUser.save();

    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE_USER',
      resource: 'User',
      description: `Created user: ${newUser.name} (${newUser.email})`,
      createdData: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });

    const io = global.io;
    if (io) {
      io.emit('userCreated', { user: newUser });
    }

    res.status(201).json({ success: true, message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error('User creation error:', err);
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
    const io = global.io;
    if (io) {
      io.emit('userUpdated', { userId, user });
      console.log('📡 Broadcasting user update via socket');
    }

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
    const io = global.io;
    if (io) {
      io.emit('userDeleted', { userId });
      console.log('📡 Broadcasting user deletion via socket');
    }

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

    res.json(list(apps, apps.length));
  } catch (err) {
    console.error('❌ Admin fetch error:', err);
    res.status(500).json(errorFormatter(err.message));
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
    const io = global.io;
    if (io) {
      io.emit('applicationUpdated', { appId, app });
      console.log('📡 Broadcasting application update via socket');
    }

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
    const io = global.io;
    if (io) {
      io.emit('applicationDeleted', { appId });
      console.log('📡 Broadcasting application deletion via socket');
    }

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
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 100));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Interview.findAndCountAll({
      include: [
        { association: 'application', attributes: ['id', 'status'] },
        { association: 'interviewer', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    res.json({
      success: true,
      count: rows.length,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / limitNum),
      interviews: rows
    });
  } catch (err) {
    console.error('Error fetching interviews:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get interview statistics
router.get("/interviews/stats", permit('manage_interviews'), async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { Op } = require('sequelize');
    
    const stats = await Interview.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalInterviews = await Interview.count();
    
    res.json({
      success: true,
      totalInterviews,
      statsByStatus: stats || []
    });
  } catch (err) {
    console.error('Error fetching interview stats:', err);
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ PAYMENTS - requires view_analytics permission
//
router.get("/payments", permit('view_analytics'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        { association: 'user', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    res.json({
      success: true,
      count: rows.length,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / limitNum),
      payments: rows
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    // Return empty data instead of 500
    res.json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      payments: [],
      message: 'Payments data temporarily unavailable'
    });
  }
});

//
// ✅ EMAIL LOGS - requires view_audit_logs permission
//
router.get("/email-logs", permit('view_audit_logs'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, type } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    let emailLogs, total;
    if (mongoose.connection.readyState === 1) {
      // MongoDB
      const query = EmailLog.find(where);
      total = await EmailLog.countDocuments(where);
      emailLogs = await query
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum);
    } else {
      // SQLite
      const result = await EmailLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset: offset,
        distinct: true
      });
      emailLogs = result.rows;
      total = result.count;
    }

    res.json({
      success: true,
      count: emailLogs.length,
      total: total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      emailLogs: emailLogs
    });
  } catch (err) {
    console.error('Error fetching email logs:', err);
    // Return empty data instead of 500
    res.json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      emailLogs: [],
      message: 'Email logs temporarily unavailable'
    });
  }
});

//
// ✅ AUDIT LOGS - requires view_audit_logs permission
//
router.get("/audit", permit('view_audit_logs'), async (req, res) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    let logs, total;
    if (mongoose.connection.readyState === 1) {
      // MongoDB
      let query = {};
      if (search) {
        query.description = { $regex: search, $options: "i" };
      }
      if (action && action !== "all") {
        query.action = action;
      }

      total = await AuditLog.countDocuments(query);
      logs = await AuditLog.find(query)
        .populate("user_id", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    } else {
      // SQLite
      let where = {};
      if (search) {
        where.description = { [require('sequelize').Op.like]: `%${search}%` };
      }
      if (action && action !== "all") {
        where.action = action;
      }

      const result = await AuditLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset: skip,
        distinct: true
      });
      logs = result.rows;
      total = result.count;
    }

    console.log(`✅ Admin fetched ${logs.length} audit logs (Total: ${total})`);

    res.json({
      success: true,
      data: logs,
      auditLogs: logs,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('❌ Admin audit logs fetch error:', err);
    // Return empty data instead of 500
    res.json({
      success: true,
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      },
      message: 'Audit logs temporarily unavailable'
    });
  }
});

router.get("/audit-logs", permit('view_audit_logs'), async (req, res) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;
    const { AuditLog, isMongoConnected } = getModels();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    let logs, total;
    if (isMongoConnected) {
      // MongoDB
      let query = {};
      if (search) {
        query.description = { $regex: search, $options: "i" };
      }
      if (action && action !== "all") {
        query.action = action;
      }

      total = await AuditLog.countDocuments(query);
      logs = await AuditLog.find(query)
        .populate("user_id", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    } else {
      // SQLite
      let where = {};
      if (search) {
        where.description = { [require('sequelize').Op.like]: `%${search}%` };
      }
      if (action && action !== "all") {
        where.action = action;
      }

      const result = await AuditLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset: skip,
        distinct: true
      });
      logs = result.rows;
      total = result.count;
    }

    console.log(`✅ Admin fetched ${logs.length} audit logs via alias route (Total: ${total})`);

    res.json({
      success: true,
      data: logs,
      auditLogs: logs,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('❌ Admin audit alias fetch error:', err);
    // Return empty data instead of 500 to prevent UI errors
    res.json({
      success: true,
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      },
      message: 'Audit logs temporarily unavailable'
    });
  }
});

//
// ✅ SETTINGS - requires manage_settings permission
//
router.get("/settings", permit('manage_settings'), async (req, res) => {
  try {
    console.log('📥 Admin fetching settings...');
    const { Settings, isMongoConnected } = getModels();

    let settings;
    if (isMongoConnected) {
      // MongoDB
      settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
    } else {
      // SQLite
      settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
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
    console.log('💾 Admin updating settings:', req.body);
    const { Settings, AuditLog, isMongoConnected } = getModels();

    let settings;
    if (isMongoConnected) {
      // MongoDB
      settings = await Settings.findOne();
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
            metadata: changes,
          });
        }
      }

      await settings.save();
    } else {
      // SQLite
      settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create(req.body);
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
        await settings.update(req.body);

        // Log the changes
        if (Object.keys(changes).length > 0) {
          await AuditLog.create({
            user_id: req.user.id,
            action: 'UPDATE_SETTINGS',
            resource: 'Settings',
            description: `Updated system settings: ${Object.keys(changes).join(', ')}`,
            metadata: changes,
          });
        }
      }
    }

    // Emit real-time update to all connected clients
    const io = global.io || req.app.get('io');
    if (io) {
      io.emit('settingsUpdated', { settings });
    }

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
