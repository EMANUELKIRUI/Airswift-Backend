/**
 * System Health Monitoring Test & Debugging Utility
 * Run various tests to ensure health monitoring is working properly
 */

// ============================================================
// TEST 1: Check if Health Endpoints Exist
// ============================================================

async function testHealthEndpoints() {
  console.log('\n🧪 Testing Health Endpoints...\n');

  const endpoints = [
    { url: '/health', auth: false, name: 'Basic Health Check' },
    { url: '/api/health', auth: false, name: 'API Health Check' },
    { url: '/api/system-health', auth: true, name: 'System Health (Admin)' },
    { url: '/api/system-health/quick', auth: true, name: 'Quick Health Check' },
    { url: '/api/system-health/server', auth: true, name: 'Server Health' },
    { url: '/api/system-health/db', auth: true, name: 'Database Health' },
    { url: '/api/system-health/services', auth: true, name: 'Services Health' },
    { url: '/api/system-health/alerts', auth: true, name: 'Health Alerts' },
    { url: '/api/system-health/history', auth: true, name: 'Health History' },
  ];

  const token = localStorage.getItem('token');

  for (const endpoint of endpoints) {
    try {
      console.log(`📍 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);

      const headers = {};
      if (endpoint.auth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint.url, { headers });
      const status = response.status;
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Success (${status})`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.warn(`⚠️  Error (${status}): ${data.message || data.error}`);
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
    console.log();
  }
}

// ============================================================
// TEST 2: Check Authentication
// ============================================================

function testAuthentication() {
  console.log('\n🔐 Authentication Status\n');

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const adminToken = localStorage.getItem('adminToken');

  if (!token) {
    console.warn('❌ No JWT token in localStorage');
    console.log('   → Need to login first');
    return false;
  }

  console.log('✅ JWT Token found:', token.substring(0, 30) + '...');

  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('✅ User data found:', userData);
      console.log('   Role:', userData.role);
      
      if (userData.role !== 'admin') {
        console.warn('⚠️  User is not admin - health endpoints require admin role');
        return false;
      }
    } catch (e) {
      console.warn('⚠️  Could not parse user data');
    }
  }

  return true;
}

// ============================================================
// TEST 3: Detailed Health Data Fetch
// ============================================================

async function testDetailedHealthFetch() {
  console.log('\n📊 Fetching Detailed Health Data\n');

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No token - please login first');
    return;
  }

  try {
    console.log('⏳ Fetching /api/system-health...');
    const response = await fetch('/api/system-health', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error(`❌ Error ${response.status}: ${response.statusText}`);
      const error = await response.json();
      console.error('Error details:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Health data received!');
    console.log('\n--- SYSTEM HEALTH DATA ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('---------------------------\n');

    // Analyze health
    analyzeHealth(data);

  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
  }
}

// ============================================================
// TEST 4: Analyze Health Data
// ============================================================

function analyzeHealth(data) {
  console.log('📈 Health Analysis\n');

  // Overall status
  console.log(`Overall Status: ${data.status}`);

  // Server status
  if (data.server) {
    console.log(`\nServer: ${data.server.status}`);
    console.log(`  Uptime: ${formatUptime(data.server.uptime)}`);
  }

  // CPU
  if (data.cpu) {
    console.log(`\nCPU Usage: ${data.cpu.usage || 'N/A'}%`);
    console.log(`  Cores: ${data.cpu.cores}`);
    console.log(`  Load Average: ${data.cpu.loadAverage}`);
    if (data.cpu.usage > 80) {
      console.warn('  ⚠️  High CPU usage!');
    }
  }

  // Memory
  if (data.memory) {
    const percentUsed = data.memory.percentUsed || 0;
    console.log(`\nMemory: ${percentUsed.toFixed(1)}% used`);
    console.log(`  Used: ${formatBytes(data.memory.used)}`);
    console.log(`  Total: ${formatBytes(data.memory.total)}`);
    if (percentUsed > 80) {
      console.warn('  ⚠️  High memory usage!');
    }
  }

  // Disk
  if (data.disk) {
    const percentUsed = data.disk.percentUsed || 0;
    console.log(`\nDisk: ${percentUsed.toFixed(1)}% used`);
    console.log(`  Used: ${formatBytes(data.disk.used)}`);
    console.log(`  Total: ${formatBytes(data.disk.total)}`);
    if (percentUsed > 85) {
      console.warn('  ⚠️  High disk usage!');
    }
  }

  // Database
  if (data.database) {
    console.log(`\nDatabase: ${data.database.status}`);
    console.log(`  Type: ${data.database.type}`);
    console.log(`  Response Time: ${data.database.responseTime}ms`);
  }

  // Application
  if (data.application) {
    console.log(`\nApplication: ${data.application.status}`);
    console.log(`  Version: ${data.application.version}`);
    console.log(`  Environment: ${data.application.environment}`);
  }

  // Alerts
  if (data.alerts && data.alerts.length > 0) {
    console.log(`\n⚠️  Alerts: ${data.alerts.length}`);
    data.alerts.forEach((alert, i) => {
      console.log(`  ${i + 1}. [${alert.type}] ${alert.title}`);
      console.log(`     ${alert.message}`);
    });
  } else {
    console.log('\n✅ No active alerts');
  }
}

// ============================================================
// TEST 5: Monitor Health Changes
// ============================================================

async function monitorHealthChanges(durationSeconds = 60) {
  console.log(`\n🔄 Monitoring health for ${durationSeconds} seconds...\n`);

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No token - please login first');
    return;
  }

  let previousHealth = null;
  const startTime = Date.now();

  while (Date.now() - startTime < durationSeconds * 1000) {
    try {
      const response = await fetch('/api/system-health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const health = await response.json();
        const timestamp = new Date().toLocaleTimeString();

        if (!previousHealth) {
          console.log(`[${timestamp}] Initial health: ${health.status}`);
        } else {
          // Check for changes
          if (health.status !== previousHealth.status) {
            console.warn(`[${timestamp}] ⚠️  Status changed: ${previousHealth.status} -> ${health.status}`);
          }
          if (health.cpu?.usage && previousHealth.cpu?.usage) {
            const cpuDiff = health.cpu.usage - previousHealth.cpu.usage;
            if (Math.abs(cpuDiff) > 10) {
              console.log(`[${timestamp}] CPU changed: ${previousHealth.cpu.usage}% -> ${health.cpu.usage}%`);
            }
          }
          if (health.memory?.percentUsed && previousHealth.memory?.percentUsed) {
            const memDiff = health.memory.percentUsed - previousHealth.memory.percentUsed;
            if (Math.abs(memDiff) > 5) {
              console.log(`[${timestamp}] Memory changed: ${previousHealth.memory.percentUsed}% -> ${health.memory.percentUsed}%`);
            }
          }
        }

        previousHealth = health;
      } else {
        console.error(`Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
    }

    // Wait 5 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n✅ Monitoring complete');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatBytes(bytes) {
  if (!bytes) return 'N/A';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// ============================================================
// QUICK TEST FUNCTION
// ============================================================

async function quickHealthTest() {
  console.clear();
  console.log('╔════════════════════════════════════════╗');
  console.log('║   System Health Monitoring Test Suite  ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Test 1: Auth
  const hasAuth = testAuthentication();
  
  if (!hasAuth) {
    console.log('\n⚠️  Must be logged in as admin to test protected endpoints');
    console.log('Run these tests after logging in:\n');
    console.log('  1. testHealthEndpoints()  - Test all endpoints');
    console.log('  2. testDetailedHealthFetch() - Fetch & analyze health');
    console.log('  3. monitorHealthChanges(30) - Monitor for 30 seconds');
    return;
  }

  // Test 2: Endpoints
  await testHealthEndpoints();

  // Test 3: Detailed fetch
  await testDetailedHealthFetch();

  console.log('\n✅ Tests complete!\n');
  console.log('Additional commands:');
  console.log('  - monitorHealthChanges(60)  Monitor for 60 seconds');
  console.log('  - testDetailedHealthFetch()  Get latest health snapshot');
  console.log('  - analyzeHealth(data)        Analyze specific health data');
}

// ============================================================
// EXPORT FOR BROWSER CONSOLE
// ============================================================

console.log(`
╔════════════════════════════════════════════════════════════╗
║     System Health Monitoring - Testing & Debugging         ║
║                                                            ║
║  Run this in browser console after logging in as admin:   ║
║                                                            ║
║    quickHealthTest()              Full health test suite   ║
║    testHealthEndpoints()          Test all endpoints       ║
║    testDetailedHealthFetch()      Fetch health data        ║
║    monitorHealthChanges(30)       Monitor for 30 seconds   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Export for global use in browser
if (typeof window !== 'undefined') {
  window.healthTests = {
    quickTest: quickHealthTest,
    testEndpoints: testHealthEndpoints,
    testAuth: testAuthentication,
    testFetch: testDetailedHealthFetch,
    analyze: analyzeHealth,
    monitor: monitorHealthChanges,
    formatBytes,
    formatUptime
  };
}

// For Node.js usage
if (typeof module !== 'undefined') {
  module.exports = {
    quickHealthTest,
    testHealthEndpoints,
    testAuthentication,
    testDetailedHealthFetch,
    analyzeHealth,
    monitorHealthChanges,
    formatBytes,
    formatUptime
  };
}
