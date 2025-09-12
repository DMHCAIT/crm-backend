// Test script to verify all endpoints are working
const https = require('https');
const http = require('http');

const baseUrl = 'http://localhost:3001';

const testEndpoints = [
  { path: '/', name: 'Root endpoint' },
  { path: '/health', name: 'Health check' },
  { path: '/dashboard/stats', name: 'Dashboard stats' },
  { path: '/api/analytics/realtime', name: 'Analytics' },
  { path: '/leads', name: 'Leads (GET)' },
  { path: '/students', name: 'Students (GET)' },
  { path: '/users', name: 'Users (GET)' },
  { path: '/communications', name: 'Communications (GET)' },
  { path: '/payments', name: 'Payments (GET)' },
  { path: '/integrations', name: 'Integrations (GET)' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl}${endpoint.path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${endpoint.name}: Status ${res.statusCode}`);
          resolve({ success: true, status: res.statusCode, data: json });
        } catch (e) {
          console.log(`⚠️  ${endpoint.name}: Status ${res.statusCode} (Non-JSON response)`);
          resolve({ success: true, status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${endpoint.name}: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⏱️  ${endpoint.name}: Timeout`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing CRM Backend Endpoints');
  console.log('================================');
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✨ Endpoint testing completed!');
}

runTests();