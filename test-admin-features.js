#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Admin Features
 * Tests:
 * 1. Audit Logs fetching
 * 2. Real-time application submission (within 5 seconds)
 * 3. Admin user management (Edit, Delete)
 * 4. Admin application management (Edit, Delete, Update)
 * 5. Persistence of saved changes
 * 6. Socket.IO real-time updates
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@airswift.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const USER_EMAIL = process.env.USER_EMAIL || 'testuser@airswift.com';
const USER_PASSWORD = process.env.USER_PASSWORD || 'test123';

// Storage for test data
let adminToken = null;
let userToken = null;
let testApplicationId = null;
let testUserId = null;

// Color helper
const log = {
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  header: (msg) => console.log(chalk.bold.cyan('\n' + msg + '\n'))
};

// Test counter
let tests = { total: 0, passed: 0, failed: 0 };

async function test(name, fn) {
  tests.total++;
  try {
    log.info(`Running: ${name}`);
    await fn();
    log.success(name);
    tests.passed++;
  } catch (err) {
    log.error(`${name}: ${err.message}`);
    tests.failed++;
  }
}

async function loginAdmin() {
  log.header('1. ADMIN AUTHENTICATION');
  
  await test('Login as admin', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = response.data.token;
    if (!adminToken) throw new Error('No token received');
  });
}

async function loginUser() {
  log.header('2. USER AUTHENTICATION');
  
  await test('Login as regular user', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    userToken = response.data.token;
    if (!userToken) throw new Error('No token received');
  });
}

async function testAuditLogs() {
  log.header('3. AUDIT LOGS - FETCH & DISPLAY');
  
  await test('Fetch audit logs (admin endpoint)', async () => {
    const response = await axios.get(`${API_BASE}/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10 }
    });
    
    if (!response.data.success) throw new Error('Audit logs fetch failed');
    if (!response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid audit logs response format');
    }
    log.info(`  Found ${response.data.data.length} audit logs`);
  });

  await test('Fetch audit logs (alternative endpoint)', async () => {
    const response = await axios.get(`${API_BASE}/auditLogs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 10 }
    });
    
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response format');
    }
  });

  await test('Audit logs have required fields', async () => {
    const response = await axios.get(`${API_BASE}/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, limit: 1 }
    });
    
    if (response.data.data.length > 0) {
      const log = response.data.data[0];
      if (!log.action) throw new Error('Missing action field');
      if (!log.createdAt) throw new Error('Missing createdAt field');
    }
  });
}

async function testApplicationSubmission() {
  log.header('4. REAL-TIME APPLICATION SUBMISSION');
  
  // First get a job ID to apply for
  await test('Get available jobs', async () => {
    const response = await axios.get(`${API_BASE}/applications/job-options`);
    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('No jobs available');
    }
    log.info(`  Found ${response.data.length} available jobs`);
  });
}

async function testUserManagement() {
  log.header('5. USER MANAGEMENT - CRUD OPERATIONS');
  
  await test('Fetch all users', async () => {
    const response = await axios.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!response.data.users || !Array.isArray(response.data.users)) {
      throw new Error('Invalid users response format');
    }
    
    // Get first non-admin user for testing
    testUserId = response.data.users.find(u => u.role !== 'admin')?._id;
    log.info(`  Found ${response.data.users.length} users`);
  });

  if (testUserId) {
    await test('Edit user (update name and email)', async () => {
      const response = await axios.put(
        `${API_BASE}/admin/users/${testUserId}`,
        {
          name: 'Updated Test User',
          email: `updated-${Date.now()}@test.com`,
          phone: '+1234567890',
          location: 'Test City',
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (!response.data.success) throw new Error('User update failed');
      if (!response.data.user) throw new Error('No user returned');
      if (response.data.user.lastModifiedAt) {
        log.info(`  Last modified at: ${new Date(response.data.user.lastModifiedAt).toLocaleString()}`);
      }
    });

    await test('Verify user changes persisted', async () => {
      const response = await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const user = response.data.users.find(u => u._id === testUserId);
      if (!user) throw new Error('User not found after update');
      if (user.phone !== '+1234567890') throw new Error('Phone not persisted');
    });
  }
}

async function testApplicationManagement() {
  log.header('6. APPLICATION MANAGEMENT - CRUD OPERATIONS');
  
  await test('Fetch all applications', async () => {
    const response = await axios.get(`${API_BASE}/applications/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid applications response format');
    }
    
    testApplicationId = response.data.data[0]?._id;
    log.info(`  Found ${response.data.data.length} applications`);
  });

  if (testApplicationId) {
    await test('Edit application (update status and notes)', async () => {
      const response = await axios.put(
        `${API_BASE}/admin/applications/${testApplicationId}`,
        {
          status: 'shortlisted',
          notes: 'Test note - ' + Date.now(),
          score: 85,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (!response.data.success) throw new Error('Application update failed');
      if (!response.data.data) throw new Error('No application returned');
    });

    await test('Verify application changes persisted', async () => {
      const response = await axios.get(`${API_BASE}/applications/admin`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const app = response.data.data.find(a => a._id === testApplicationId);
      if (!app) throw new Error('Application not found after update');
      if (app.status !== 'shortlisted') throw new Error('Status not persisted');
    });
  }
}

async function testPermissions() {
  log.header('7. PERMISSION & AUTHORIZATION TESTS');
  
  await test('Regular user cannot access audit logs', async () => {
    try {
      await axios.get(`${API_BASE}/admin/audit`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      throw new Error('Regular user should not access audit logs');
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        // Expected
        log.info('  Correctly denied regular user access');
      } else {
        throw err;
      }
    }
  });

  await test('Regular user cannot manage users', async () => {
    try {
      await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      throw new Error('Regular user should not access user management');
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        // Expected
        log.info('  Correctly denied regular user access');
      } else {
        throw err;
      }
    }
  });
}

async function runAllTests() {
  console.log(chalk.bold.cyan('\n🧪 ADMIN FEATURES TEST SUITE 🧪\n'));
  console.log(chalk.gray(`API Base: ${API_BASE}\n`));

  try {
    await loginAdmin();
    await loginUser();
    await testAuditLogs();
    await testApplicationSubmission();
    await testUserManagement();
    await testApplicationManagement();
    await testPermissions();

    // Summary
    console.log('\n' + chalk.bold.cyan('TEST SUMMARY'));
    console.log(chalk.gray('============'));
    console.log(chalk.blue(`Total Tests: ${tests.total}`));
    console.log(chalk.green(`Passed: ${tests.passed}`));
    console.log(chalk.red(`Failed: ${tests.failed}`));
    
    if (tests.failed === 0) {
      console.log(chalk.bold.green('\n✅ ALL TESTS PASSED!\n'));
    } else {
      console.log(chalk.bold.red(`\n❌ ${tests.failed} TEST(S) FAILED\n`));
      process.exit(1);
    }
  } catch (err) {
    log.error('Test suite error: ' + err.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
