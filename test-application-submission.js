#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Test data
const testConfig = {
  job_id: 1,
  phone: '+1234567890',
  national_id: 'TEST123',
  cover_letter: 'I am interested in this role'
};

async function createTestPDF() {
  // Create a simple PDF-like file for testing
  const testFilePath = '/tmp/test-document.pdf';
  
  // Create a minimal PDF file for testing
  const pdfContent = Buffer.from([
    0x25, 0x50, 0x44, 0x46, // %PDF
    0x2d, 0x31, 0x2e, 0x34, // -1.4
    0x0a, 0x25, 0x45, 0x4f, // \n%EO
    0x46, // F
  ]);
  
  fs.writeFileSync(testFilePath, pdfContent);
  return testFilePath;
}

async function testApplicationSubmission() {
  console.log('🧪 Testing Application Submission...\n');

  // Validate token
  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: AUTH_TOKEN environment variable not set');
    console.log('   Usage: AUTH_TOKEN=your_token node test-application-submission.js');
    process.exit(1);
  }

  console.log('📋 Test Configuration:');
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log(`   Job ID: ${testConfig.job_id}`);
  console.log(`   Phone: ${testConfig.phone}`);
  console.log(`   National ID: ${testConfig.national_id}\n`);

  try {
    // Create test PDF files
    console.log('📄 Creating test PDF files...');
    const testPDF = await createTestPDF();
    console.log(`   ✅ Test PDF created at: ${testPDF}\n`);

    // Prepare FormData
    const formData = new FormData();
    formData.append('cv', fs.createReadStream(testPDF));
    formData.append('nationalId', fs.createReadStream(testPDF));
    formData.append('passport', fs.createReadStream(testPDF));
    formData.append('job_id', testConfig.job_id);
    formData.append('phone', testConfig.phone);
    formData.append('national_id', testConfig.national_id);
    formData.append('cover_letter', testConfig.cover_letter);

    console.log('📤 Sending application submission request...');
    console.log(`   Endpoint: POST ${API_BASE_URL}/applications/apply`);
    console.log(`   Auth: Bearer ${AUTH_TOKEN.substring(0, 20)}...\n`);

    // Make the request
    const response = await axios.post(
      `${API_BASE_URL}/applications/apply`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    console.log('✅ SUCCESS! Application submitted.\n');
    console.log('📊 Response Status:', response.status);
    console.log('📝 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Clean up
    fs.unlinkSync(testPDF);

  } catch (error) {
    console.error('❌ ERROR: Application submission failed\n');

    if (error.response) {
      console.log('📊 Response Status:', error.response.status);
      console.log('📝 Response Data:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log('\n🔍 Common Issues:');

      switch (error.response.status) {
        case 400:
          console.log('   • Bad Request: Check file formats and required fields');
          console.log('   • Ensure files are valid PDF documents');
          console.log('   • Check required fields: job_id, phone, national_id');
          break;
        case 401:
          console.log('   • Unauthorized: Authentication token is missing or invalid');
          console.log('   • Set AUTH_TOKEN environment variable');
          console.log('   • Verify token is still valid (not expired)');
          break;
        case 413:
          console.log('   • Payload Too Large: File size exceeds 5MB limit');
          console.log('   • Reduce file sizes and try again');
          break;
        case 404:
          console.log('   • Not Found: Job not found or inactive');
          console.log('   • Verify job_id exists and is active');
          break;
        case 500:
          console.log('   • Server Error: Check backend logs for details');
          console.log('   • Verify Cloudinary configuration');
          console.log('   • Check file encryption utility');
          break;
      }
    } else {
      console.log('📡 Network Error:');
      console.log('   Message:', error.message);
      console.log('\n🔍 Troubleshooting:');
      console.log('   • Is the backend server running?');
      console.log(`   • Is the server accessible at ${API_BASE_URL}?`);
      console.log('   • Check firewall and network connectivity');
    }

    process.exit(1);
  }
}

// Run test
testApplicationSubmission().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});

// Show usage information
console.log('\n📚 Usage Examples:\n');
console.log('1. Get auth token (login first):');
console.log('   npm run test:auth\n');

console.log('2. Run this test with valid token:');
console.log('   AUTH_TOKEN=<token> node test-application-submission.js\n');

console.log('3. Debug with verbose output:');
console.log('   DEBUG=* AUTH_TOKEN=<token> node test-application-submission.js\n');
