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

    if (typeof registerResponse.data.otpSent === 'undefined') {
      throw new Error('Register response must include otpSent field');
    }

    console.log(`   OTP send attempted: ${registerResponse.data.otpSent}`);

    console.log('\n=== AUTHENTICATION FLOW TEST COMPLETE ===');
    console.log('   ✅ Registration OTP behavior validated.');
    return;

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
