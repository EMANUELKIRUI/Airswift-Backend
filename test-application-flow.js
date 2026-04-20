/**
 * Test Application Flow
 * - User submits application
 * - Admin fetches all applications
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test data
let userToken = null;
let adminToken = null;
let applicationId = null;
let jobId = null;
let userId = null;

/**
 * Create a dummy file for testing
 */
function createDummyFile(filename, content = 'dummy content') {
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

/**
 * Test 1: Login as regular user
 */
async function testUserLogin() {
  console.log('\n=== TEST 1: User Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'user@test.com',
      password: 'password123',
    });

    console.log('✅ User logged in successfully');
    console.log('Token:', response.data.token.substring(0, 20) + '...');
    
    userToken = response.data.token;
    userId = response.data.user?.id || response.data.userId;
    
    return true;
  } catch (err) {
    console.error('❌ User login failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 2: Get available jobs
 */
async function testGetJobs() {
  console.log('\n=== TEST 2: Get Available Jobs ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/applications/job-options`);

    console.log('✅ Jobs fetched successfully');
    console.log('Total jobs available:', response.data.data.total);
    
    // Get first job ID
    const jobs = Object.values(response.data.data.jobs).flat();
    if (jobs.length > 0) {
      jobId = jobs[0].id;
      console.log('First job ID:', jobId);
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
 * Test 3: User submits application
 */
async function testUserSubmitApplication() {
  console.log('\n=== TEST 3: User Submit Application ===');
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
    console.log('Response:', response.data);
    
    applicationId = response.data.application?._id || response.data.applicationId;
    console.log('Application ID:', applicationId);

    // Cleanup
    fs.unlinkSync(cvFile);
    fs.unlinkSync(passportFile);
    fs.unlinkSync(nationalIdFile);

    return true;
  } catch (err) {
    console.error('❌ Application submission failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 4: Login as admin
 */
async function testAdminLogin() {
  console.log('\n=== TEST 4: Admin Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123',
    });

    console.log('✅ Admin logged in successfully');
    console.log('Token:', response.data.token.substring(0, 20) + '...');
    
    adminToken = response.data.token;
    return true;
  } catch (err) {
    console.error('❌ Admin login failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 5: Admin fetches all applications
 */
async function testAdminFetchApplications() {
  console.log('\n=== TEST 5: Admin Fetch All Applications ===');
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
    console.log('Total applications:', response.data.count || response.data.applications?.length || 0);
    console.log('Applications:', response.data.applications);

    return true;
  } catch (err) {
    console.error('❌ Admin fetch failed:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Test 6: Verify application in database
 */
async function testFetchSpecificApplication() {
  console.log('\n=== TEST 6: Fetch Specific Application ===');
  try {
    if (!adminToken || !applicationId) {
      console.error('❌ Missing token or applicationId');
      return false;
    }

    // Try to fetch the specific application
    const response = await axios.get(
      `${BASE_URL}/api/applications/admin`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const app = response.data.applications?.find(a => a._id === applicationId);
    if (app) {
      console.log('✅ Application found in database');
      console.log('Application details:', app);
      return true;
    } else {
      console.log('⚠️ Application not found in the fetched list');
      return false;
    }
  } catch (err) {
    console.error('❌ Failed to fetch specific application:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Application Flow Tests...\n');

  let results = [];

  // Run tests sequentially
  results.push({ test: 'User Login', passed: await testUserLogin() });
  results.push({ test: 'Get Available Jobs', passed: await testGetJobs() });
  results.push({ test: 'User Submit Application', passed: await testUserSubmitApplication() });
  results.push({ test: 'Admin Login', passed: await testAdminLogin() });
  results.push({ test: 'Admin Fetch Applications', passed: await testAdminFetchApplications() });
  results.push({ test: 'Fetch Specific Application', passed: await testFetchSpecificApplication() });

  // Print summary
  console.log('\n\n=== TEST SUMMARY ===');
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  console.log(`\nTotal: ${totalPassed}/${results.length} tests passed`);

  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
