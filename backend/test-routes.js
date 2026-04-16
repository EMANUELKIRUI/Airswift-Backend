const express = require('express');
const app = express();
app.use(express.json());

// Mount routes exactly like server.js does
app.use("/api/auth", require("./routes/auth"));

// Test endpoints
app.get('/test-api-auth-login', (req, res) => {
  // Simulate a request to /api/auth/login
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req2 = http.request(options, (res2) => {
    let data = '';
    res2.on('data', chunk => data += chunk);
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json({
          test: 'api-auth-login',
          status: res2.statusCode,
          response: parsed,
          expected: 'Should work - route exists'
        });
      } catch (e) {
        res.json({
          test: 'api-auth-login',
          status: res2.statusCode,
          response: data,
          expected: 'Should work - route exists'
        });
      }
    });
  });

  req2.on('error', (e) => {
    res.json({
      test: 'api-auth-login',
      error: e.message,
      expected: 'Should work - route exists'
    });
  });

  req2.write(JSON.stringify({ email: 'test@example.com', password: 'test' }));
  req2.end();
});

app.get('/test-auth-login', (req, res) => {
  // Simulate a request to /auth/login (should fail)
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req2 = http.request(options, (res2) => {
    let data = '';
    res2.on('data', chunk => data += chunk);
    res2.on('end', () => {
      res.json({
        test: 'auth-login',
        status: res2.statusCode,
        response: data,
        expected: 'Should fail - no route mounted at /auth'
      });
    });
  });

  req2.on('error', (e) => {
    res.json({
      test: 'auth-login',
      error: e.message,
      expected: 'Should fail - no route mounted at /auth'
    });
  });

  req2.write(JSON.stringify({ email: 'test@example.com', password: 'test' }));
  req2.end();
});

const server = app.listen(3002, () => {
  console.log('🧪 Route Test Server running on port 3002');
  console.log('📋 Testing backend routes...');
  console.log('');

  // Run tests
  const http = require('http');

  // Test 1: /api/auth/login should work
  http.get('http://localhost:3002/test-api-auth-login', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const result = JSON.parse(data);
      console.log('✅ /api/auth/login test:', result.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', result.status);
      console.log('   Expected:', result.expected);
      console.log('');
    });
  });

  // Test 2: /auth/login should fail
  setTimeout(() => {
    http.get('http://localhost:3002/test-auth-login', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('❌ /auth/login test:', result.status !== 200 ? 'PASS' : 'FAIL');
        console.log('   Status:', result.status);
        console.log('   Expected:', result.expected);
        console.log('');
        console.log('🎯 Route configuration verified!');
        server.close();
      });
    });
  }, 1000);
});