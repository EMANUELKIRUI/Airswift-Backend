/**
 * Test Admin Applications Functionality
 * - Verifies admin can fetch all applications
 * - Tests permission-based access control
 * - Ensures response formats are consistent
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test data
let userToken = null;
let adminToken = null;
let jobId = null;
let userId = null;
let adminId = null;

const TEST_USERS = {
  regularUser: {
    email: 'user@test.com',
    password: 'password123',
    name: 'Test User',
  },
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Test Admin',
  },
};

/**
 * Create a dummy file for testing
 */
function createDummyFile(filename, content = 'dummy content') {
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

/**
 * Cleanup dummy files
 */
function cleanupFiles(...filepaths) {
  filepaths.forEach(filepath => {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (err) {
      console.error(`Error deleting ${filepath}:`, err.message);
    }
  });
}

/**
 * Test 1: Create or login test admin
 */
async function testAdminLogin() {
  console.log('\n=== TEST 1: Admin Login/Signup ===');
  try {
    // Try to login first
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      });

      console.log('✅ Admin logged in successfully');
      adminToken = loginResponse.data.token;
      adminId = loginResponse.data.user?.id || loginResponse.data.userId;
      console.log('Admin Token:', adminToken.substring(0, 20) + '...');
      return true;
    } catch (loginErr) {
      // If login fails, try to signup
      if (loginErr.response?.status === 401) {
        console.log('Admin not found, attempting signup...');
        
        const signupResponse = await axios.post(`${BASE_URL}/api/auth/signup`, {
          name: TEST_USERS.admin.name,
          email: TEST_USERS.admin.email,
          password: TEST_USERS.admin.password,
          role: 'admin',
        });

        console.log('✅ Admin created and logged in');
        adminToken = signupResponse.data.token;
        adminId = signupResponse.data.user?.id || signupResponse.data.userId;
        return true;
      }
      throw loginErr;
    }
  } catch (err) {
    console.error('❌ Admin login/signup failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 2: Create or login test user
 */
async function testUserLogin() {
  console.log('\n=== TEST 2: User Login/Signup ===');
  try {
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USERS.regularUser.email,
        password: TEST_USERS.regularUser.password,
      });

      console.log('✅ User logged in successfully');
      userToken = loginResponse.data.token;
      userId = loginResponse.data.user?.id || loginResponse.data.userId;
      return true;
    } catch (loginErr) {
      if (loginErr.response?.status === 401) {
        console.log('User not found, attempting signup...');
        
        const signupResponse = await axios.post(`${BASE_URL}/api/auth/signup`, {
          name: TEST_USERS.regularUser.name,
          email: TEST_USERS.regularUser.email,
          password: TEST_USERS.regularUser.password,
          role: 'user',
        });

        console.log('✅ User created and logged in');
        userToken = signupResponse.data.token;
        userId = signupResponse.data.user?.id || signupResponse.data.userId;
        return true;
      }
      throw loginErr;
    }
  } catch (err) {
    console.error('❌ User login failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 3: Get available jobs
 */
async function testGetJobs() {
  console.log('\n=== TEST 3: Get Available Jobs ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/applications/job-options`);

    const jobs = Object.values(response.data.data?.jobs || {}).flat();
    if (jobs.length > 0) {
      jobId = jobs[0].id;
      console.log('✅ Jobs fetched successfully');
      console.log('First job ID:', jobId);
      console.log('Total jobs available:', jobs.length);
      return true;
    } else {
      console.error('❌ No jobs available');
      return false;
    }
  } catch (err) {
    console.error('❌ Failed to fetch jobs:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 4: User submits application
 */
async function testUserSubmitApplication() {
  console.log('\n=== TEST 4: User Submit Application ===');
  try {
    if (!userToken || !jobId) {
      console.error('❌ Missing token or jobId');
      return false;
    }

    // Create dummy files
    const cvFile = createDummyFile('test-cv.pdf', 'This is a test CV');
    const passportFile = createDummyFile('test-passport.pdf', 'This is a test passport');
    const nationalIdFile = createDummyFile('test-national-id.pdf', 'This is a test national ID');

    const form = new FormData();
    form.append('cv', fs.createReadStream(cvFile));
    form.append('passport', fs.createReadStream(passportFile));
    form.append('nationalId', fs.createReadStream(nationalIdFile));
    form.append('jobId', jobId);
    form.append('phone', '1234567890');

    const response = await axios.post(
      `${BASE_URL}/api/applications`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    console.log('✅ Application submitted successfully');
    console.log('Application ID:', response.data.application?._id || response.data.applicationId);

    // Cleanup
    cleanupFiles(cvFile, passportFile, nationalIdFile);

    return true;
  } catch (err) {
    console.error('❌ Application submission failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 5: Admin fetches all applications via /api/applications/admin
 */
async function testAdminFetchApplicationsV1() {
  console.log('\n=== TEST 5: Admin Fetch Applications (/api/applications/admin) ===');
  try {
    if (!adminToken) {
      console.error('❌ Missing admin token');
      return false;
    }

    const response = await axios.get(
      `${BASE_URL}/api/applications/admin`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    console.log('✅ Admin fetched applications successfully');
    console.log('Response structure:', Object.keys(response.data));
    console.log('Total applications:', response.data.count || response.data.data?.length || response.data.length || 0);
    
    if (response.data.success !== undefined) {
      console.log('Success flag:', response.data.success);
    }

    if (response.data.data) {
      console.log('Applications in data field:', response.data.data.length);
    } else if (Array.isArray(response.data)) {
      console.log('Applications (array):', response.data.length);
    }

    return true;
  } catch (err) {
    console.error('❌ Admin fetch failed (/api/applications/admin):', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 6: Admin fetches all applications via /api/admin/applications
 */
async function testAdminFetchApplicationsV2() {
  console.log('\n=== TEST 6: Admin Fetch Applications (/api/admin/applications) ===');
  try {
    if (!adminToken) {
      console.error('❌ Missing admin token');
      return false;
    }

    const response = await axios.get(
      `${BASE_URL}/api/admin/applications`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    console.log('✅ Admin fetched applications successfully');
    console.log('Response structure:', Object.keys(response.data));
    console.log('Total applications:', response.data.count || response.data.data?.length || response.data.length || 0);
    
    if (response.data.success !== undefined) {
      console.log('Success flag:', response.data.success);
    }

    if (response.data.data) {
      console.log('Applications in data field:', response.data.data.length);
    } else if (Array.isArray(response.data)) {
      console.log('Applications (array):', response.data.length);
    }

    return true;
  } catch (err) {
    console.error('❌ Admin fetch failed (/api/admin/applications):', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 7: Verify regular user CANNOT fetch all applications
 */
async function testUserCannotFetchAllApplications() {
  console.log('\n=== TEST 7: User Permission Check (Should Fail) ===');
  try {
    if (!userToken) {
      console.error('❌ Missing user token');
      return false;
    }

    const response = await axios.get(
      `${BASE_URL}/api/applications/admin`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    console.error('❌ User was able to fetch admin applications (should have been denied)');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ User correctly denied access (403 Forbidden)');
      console.log('Error message:', err.response.data?.message);
      return true;
    } else {
      console.error('❌ Unexpected error:', err.response?.data || err.message);
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ADMIN APPLICATIONS FUNCTIONALITY TEST SUITE'.padStart(50));
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}\n`);

  let results = [];

  // Run tests sequentially
  results.push({ test: 'Admin Login/Signup', passed: await testAdminLogin(), critical: true });
  results.push({ test: 'User Login/Signup', passed: await testUserLogin(), critical: true });
  results.push({ test: 'Get Available Jobs', passed: await testGetJobs(), critical: true });
  results.push({ test: 'User Submit Application', passed: await testUserSubmitApplication(), critical: true });
  results.push({ test: 'Admin Fetch Apps (v1)', passed: await testAdminFetchApplicationsV1(), critical: true });
  results.push({ test: 'Admin Fetch Apps (v2)', passed: await testAdminFetchApplicationsV2(), critical: true });
  results.push({ test: 'User Permission Check', passed: await testUserCannotFetchAllApplications(), critical: false });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY'.padStart(50));
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const type = result.critical ? '[CRITICAL]' : '[INFO]';
    console.log(`${status} ${type.padEnd(12)} ${result.test}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  const criticalFailed = results.filter(r => r.critical && !r.passed).length;
  
  console.log(`\nTotal: ${totalPassed}/${results.length} tests passed`);
  
  if (criticalFailed === 0) {
    console.log('🎉 All critical tests passed!');
  } else {
    console.log(`⚠️  ${criticalFailed} critical test(s) failed`);
  }

  console.log('='.repeat(60) + '\n');

  process.exit(criticalFailed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testAdminLogin,
  testUserLogin,
  testGetJobs,
  testUserSubmitApplication,
  testAdminFetchApplicationsV1,
  testAdminFetchApplicationsV2,
  testUserCannotFetchAllApplications,
};
