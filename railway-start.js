// Railway Startup Wrapper
// This script helps handle Railway-specific startup issues

console.log('🚀 Starting DMHCA CRM Backend for Railway...');
console.log('📅 Startup Time:', new Date().toISOString());

// Environment check
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set (will use 3001)');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'configured' : 'missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'configured' : 'missing');

// Memory check
const used = process.memoryUsage();
console.log('💾 Memory Usage:');
for (let key in used) {
  console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, try to log more info
  setTimeout(() => {
    console.log('🔚 Exiting due to uncaught exception');
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the main server
console.log('🎬 Loading main server...');
try {
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}