#!/usr/bin/env node
/**
 * Seed Audit Logs - Generate sample audit log entries for testing
 * Usage: node seed-audit-logs.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const AuditLog = require('./backend/models/AuditLogMongo');
const User = require('./backend/models/User');

const SAMPLE_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'CREATE_APPLICATION',
  'UPDATE_APPLICATION',
  'VIEW_APPLICATION',
  'DELETE_USER',
  'CREATE_JOB',
  'UPDATE_JOB',
  'APPROVE_APPLICATION',
  'REJECT_APPLICATION',
  'SCHEDULE_INTERVIEW',
  'UPDATE_USER_ROLE',
  'EXPORT_DATA',
  'IMPORT_DATA',
  'CHANGE_SETTINGS',
  'VIEW_DASHBOARD',
];

const SAMPLE_RESOURCES = [
  'APPLICATION',
  'JOB',
  'USER',
  'INTERVIEW',
  'SETTINGS',
  'PAYMENT',
  'EMAIL',
  'REPORT',
];

async function seedAuditLogs() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/airswift';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Get a sample admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️ No admin user found. Creating sample logs without user reference.');
    }

    // Generate sample audit logs
    const logsToCreate = [];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const action = SAMPLE_ACTIONS[Math.floor(Math.random() * SAMPLE_ACTIONS.length)];
      const resource = SAMPLE_RESOURCES[Math.floor(Math.random() * SAMPLE_RESOURCES.length)];

      logsToCreate.push({
        user_id: adminUser?._id || null,
        action,
        resource,
        description: `Admin ${action.toLowerCase()} on ${resource}`,
        metadata: {
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Testing)',
          timestamp: timestamp.toISOString(),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // Clear existing audit logs (optional)
    console.log('🗑️ Clearing existing audit logs...');
    await AuditLog.deleteMany({});
    console.log('✅ Cleared existing audit logs');

    // Insert sample logs
    console.log('📝 Creating sample audit logs...');
    const created = await AuditLog.insertMany(logsToCreate);
    console.log(`✅ Created ${created.length} sample audit logs`);

    // Display summary
    console.log('\n📊 Audit Log Summary:');
    console.log(`Total logs: ${created.length}`);
    
    // Count by action
    console.log('\nBy Action:');
    for (const action of SAMPLE_ACTIONS) {
      const count = logsToCreate.filter(log => log.action === action).length;
      if (count > 0) {
        console.log(`  ${action}: ${count}`);
      }
    }

    // Count by resource
    console.log('\nBy Resource:');
    for (const resource of SAMPLE_RESOURCES) {
      const count = logsToCreate.filter(log => log.resource === resource).length;
      if (count > 0) {
        console.log(`  ${resource}: ${count}`);
      }
    }

    console.log('\n✨ Audit logs seeding complete!');
    console.log('📍 Access logs at: http://localhost:5000/api/admin/audit-logs');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    process.exit(1);
  }
}

// Run the seeding
seedAuditLogs();
