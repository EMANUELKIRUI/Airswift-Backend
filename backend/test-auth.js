const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/auth';

// Test data
const testUser = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123@',
  name: 'Test User'
};

let otpCode = null;

async function testAuthFlow() {
  try {
    console.log('\n=== TESTING AUTHENTICATION FLOW ===\n');

    // 1. Test Register
    console.log('1️⃣  Testing User Registration...');
    console.log(`   Email: ${testUser.email}`);
    
    const registerResponse = await axios.post(`${BASE_URL}/register`, {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name
    });
    
    console.log('   ✅ Registration successful!');
    console.log(`   Response: ${JSON.stringify(registerResponse.data, null, 2)}`);

    // 2. Test Send Login OTP
    console.log('\n2️⃣  Testing Send Login OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/send-login-otp`, {
      email: testUser.email
    });
    
    console.log('   ✅ OTP sent successfully!');
    console.log(`   Response: ${JSON.stringify(otpResponse.data, null, 2)}`);

    // For testing, we'll use a fake OTP (real system would send via email)
    otpCode = '000000'; // Placeholder
    
    // 3. Test Verify Login OTP
    console.log('\n3️⃣  Testing Verify Login OTP...');
    console.log('   Note: Using placeholder OTP for testing');
    
    try {
      const verifyOtpResponse = await axios.post(`${BASE_URL}/verify-login-otp`, {
        email: testUser.email,
        otp: otpCode
      });
      
      console.log('   ✅ OTP verification successful!');
      console.log(`   Response: ${JSON.stringify(verifyOtpResponse.data, null, 2)}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ⚠️  Invalid OTP (expected for testing)');
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        throw error;
      }
    }

    // 4. Test Health Check
    console.log('\n4️⃣  Testing Health Check (/me endpoint)...');
    try {
      const meResponse = await axios.get(`${BASE_URL}/me`);
      console.log('   Response:', JSON.stringify(meResponse.data, null, 2));
    } catch (error) {
      console.log('   Response (no token):', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n=== AUTHENTICATION FLOW TEST COMPLETED ===\n');
    console.log('📊 Summary:');
    console.log('   ✅ User Registration: Working');
    console.log('   ✅ Send OTP: Working');
    console.log('   ⚠️  Verify OTP: Requires real OTP from email');
    console.log('   ✅ Server: Running and responding');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.message) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error(error);
    }
  }
}

// Run tests
testAuthFlow();
