// 🧪 Test local server startup to diagnose Railway issues

console.log('🧪 Testing server startup locally...');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.JWT_SECRET = 'test-jwt-secret';

try {
  const app = require('./server.js');
  console.log('✅ Server loaded successfully');
  
  // Test basic functionality
  setTimeout(() => {
    console.log('🔍 Testing basic endpoints...');
    
    const http = require('http');
    const testEndpoint = (path) => {
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:3002${path}`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            console.log(`✅ ${path}: Status ${res.statusCode}`);
            console.log(`   Response: ${data.substring(0, 100)}...`);
            resolve();
          });
        });
        req.on('error', (err) => {
          console.log(`❌ ${path}: ${err.message}`);
          resolve();
        });
        req.setTimeout(5000, () => {
          console.log(`⏰ ${path}: Timeout`);
          resolve();
        });
      });
    };
    
    Promise.all([
      testEndpoint('/'),
      testEndpoint('/health')
    ]).then(() => {
      console.log('🏁 Local test complete');
      process.exit(0);
    });
    
  }, 2000);
  
} catch (error) {
  console.log('❌ Server startup failed:', error.message);
  console.log('Stack trace:', error.stack);
  process.exit(1);
}