// 🚀 Simple Railway Deployment Test Server
// Minimal version to test Railway deployment without heavy dependencies

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Simple CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DMHCA CRM Backend API - Simple Test Version',
    version: '2.1.1-simple',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.1-simple',
    environment: process.env.NODE_ENV || 'production',
    port: PORT
  });
});

app.get('/api/debug/env', (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not-set',
      PORT: process.env.PORT || 'not-set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'not-set',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'not-set',
      JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not-set'
    },
    timestamp: new Date().toISOString()
  });
});

// Catch all
app.use('*', (req, res) => {
  res.json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple CRM Backend Started Successfully!');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('✅ Ready to handle requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;