#!/usr/bin/env node
/**
 * Test script to verify job seeding and API endpoint
 */

const http = require('http');

// Fetch from the endpoint
function testJobsEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/job-options',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('\n✅ API Response Received\n');
        console.log('Total jobs:', jsonData.total);
        console.log('\nJobs grouped by category (A-Z):\n');
        
        Object.entries(jsonData.jobs).forEach(([category, jobs]) => {
          console.log(`📁 ${category}:`);
          jobs.forEach(job => {
            console.log(`   - ${job.title} (ID: ${job.id})`);
          });
          console.log();
        });
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
      }
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to fetch jobs:', error.message);
    process.exit(1);
  });

  req.end();
}

// Start test
console.log('🔍 Testing /api/applications/job-options endpoint...\n');
setTimeout(() => {
  testJobsEndpoint();
}, 1000);
