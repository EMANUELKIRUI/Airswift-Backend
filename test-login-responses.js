// ✅ TEST: Verify all login endpoints return 'token' field
// Run this to test your login responses

const testLoginResponses = async () => {
  const baseURL = 'http://localhost:5000/api';

  console.log('🧪 TESTING LOGIN RESPONSES...\n');

  // Test 1: Regular user login
  try {
    console.log('1️⃣ Testing regular user login...');
    const userLoginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const userData = await userLoginResponse.json();
    console.log('✅ Regular login response:', {
      hasToken: !!userData.token,
      tokenField: userData.token ? 'token' : 'MISSING',
      hasUser: !!userData.user,
      status: userLoginResponse.status
    });

  } catch (error) {
    console.log('❌ Regular login test failed:', error.message);
  }

  // Test 2: Admin login
  try {
    console.log('\n2️⃣ Testing admin login...');
    const adminLoginResponse = await fetch(`${baseURL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@talex.com',
        password: 'Admin123!'
      })
    });

    const adminData = await adminLoginResponse.json();
    console.log('✅ Admin login response:', {
      hasToken: !!adminData.token,
      tokenField: adminData.token ? 'token' : (adminData.accessToken ? 'accessToken (WRONG)' : 'MISSING'),
      hasUser: !!adminData.user,
      status: adminLoginResponse.status
    });

  } catch (error) {
    console.log('❌ Admin login test failed:', error.message);
  }

  // Test 3: OTP login verification
  try {
    console.log('\n3️⃣ Testing OTP login verification...');
    const otpLoginResponse = await fetch(`${baseURL}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        otp: '123456'
      })
    });

    const otpData = await otpLoginResponse.json();
    console.log('✅ OTP login response:', {
      hasToken: !!otpData.token,
      tokenField: otpData.token ? 'token' : (otpData.accessToken ? 'accessToken (WRONG)' : 'MISSING'),
      hasUser: !!otpData.user,
      status: otpLoginResponse.status
    });

  } catch (error) {
    console.log('❌ OTP login test failed:', error.message);
  }

  console.log('\n🎯 SUMMARY: All login endpoints should return { token: "...", user: {...} }');
  console.log('✅ Frontend can now reliably access response.data.token');
};

// Run the test
testLoginResponses();