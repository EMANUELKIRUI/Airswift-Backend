const axios = require('axios');

async function testUsersStatusEndpoint() {
  console.log('Testing /api/users/status endpoint...');

  try {
    // Test without auth token (should fail)
    const response = await axios.get('http://localhost:5000/api/users/status');
    console.log('❌ Expected 401 but got:', response.status);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly returns 401 for unauthenticated request');
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.message);
    }
  }

  console.log('Endpoint test completed.');
}

testUsersStatusEndpoint();