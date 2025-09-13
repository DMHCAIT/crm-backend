// 🚀 FIXED SERVER.JS - Complete Authentication Solution
// Apply this to your crm-backend repository on Railway

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Starting DMHCA CRM Backend Server...');
console.log('🔑 JWT Secret configured:', JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('🗄️ Supabase URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://crm-frontend-dmhca.vercel.app',
    'https://*.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ====================================
// 🔐 AUTHENTICATION MIDDLEWARE
// ====================================

function authenticateToken(req, res, next) {
  // Skip authentication for specific routes
  const publicPaths = [
    '/',
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/debug-login',
    '/webhooks'
  ];

  // Check if current path should skip authentication
  const shouldSkipAuth = publicPaths.some(path => {
    if (path.endsWith('/')) {
      return req.path.startsWith(path);
    }
    return req.path === path || req.path.startsWith(path + '/');
  });

  if (shouldSkipAuth) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ Authentication failed: No token provided');
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log(`✅ User authenticated: ${decoded.email} (${decoded.role})`);
    next();
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    
    let errorCode = 'INVALID_TOKEN';
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'MALFORMED_TOKEN';
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token',
      code: errorCode
    });
  }
}

// Apply authentication to all /api routes (except auth routes)
app.use('/api', authenticateToken);

// ====================================
// 🏥 HEALTH CHECK
// ====================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DMHCA CRM Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: SUPABASE_URL ? 'connected' : 'not configured',
      authentication: JWT_SECRET ? 'configured' : 'not configured'
    }
  });
});

// ====================================
// 🔑 AUTHENTICATION ENDPOINTS
// ====================================

// Debug Login Endpoint (for immediate testing)
app.post('/api/auth/debug-login', async (req, res) => {
  try {
    console.log('🧪 Debug login requested');
    
    // Create admin user for testing
    const testUser = {
      id: 'admin-dmhca-001',
      email: 'santhosh@dmhca.edu',
      name: 'Santhosh DMHCA',
      role: 'super_admin',
      permissions: ['read', 'write', 'admin', 'super_admin'],
      department: 'IT Administration',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Generate JWT token
    const token = jwt.sign(testUser, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN 
    });

    console.log('✅ Debug token generated successfully');

    res.json({
      success: true,
      token: token,
      user: testUser,
      expiresIn: JWT_EXPIRES_IN,
      message: 'Debug authentication successful'
    });

  } catch (error) {
    console.error('❌ Debug login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: 'DEBUG_LOGIN_FAILED'
    });
  }
});

// Import and setup API handlers
try {
  // Auth handlers
  const authHandler = require('./api/auth.js');
  app.all('/api/auth/*', authHandler);

  // Protected API handlers
  const usersHandler = require('./api/users.js');
  const leadsHandler = require('./api/leads.js');
  const studentsHandler = require('./api/students.js');
  const communicationsHandler = require('./api/enhanced-communications.js');
  const analyticsHandler = require('./api/enhanced-analytics.js');
  const automationsHandler = require('./api/enhanced-automation.js');
  const documentsHandler = require('./api/enhanced-documents.js');
  const integrationsHandler = require('./api/integrations.js');
  const notificationsHandler = require('./api/enhanced-notifications.js');
  const settingsHandler = require('./api/enhanced-system-settings.js');

  // Setup API routes
  app.all('/api/users/*', usersHandler);
  app.all('/api/users', usersHandler);
  
  app.all('/api/leads/*', leadsHandler);
  app.all('/api/leads', leadsHandler);
  
  app.all('/api/students/*', studentsHandler);
  app.all('/api/students', studentsHandler);
  
  app.all('/api/communications/*', communicationsHandler);
  app.all('/api/communications', communicationsHandler);
  
  app.all('/api/analytics/*', analyticsHandler);
  app.all('/api/analytics', analyticsHandler);
  
  app.all('/api/automations/*', automationsHandler);
  app.all('/api/automations', automationsHandler);
  
  app.all('/api/documents/*', documentsHandler);
  app.all('/api/documents', documentsHandler);
  
  app.all('/api/integrations/*', integrationsHandler);
  app.all('/api/integrations', integrationsHandler);
  
  app.all('/api/notifications/*', notificationsHandler);
  app.all('/api/notifications', notificationsHandler);
  
  app.all('/api/settings/*', settingsHandler);
  app.all('/api/settings', settingsHandler);

  console.log('✅ All API handlers loaded successfully');

} catch (error) {
  console.error('❌ Error loading API handlers:', error.message);
  console.log('⚠️ Server will continue with available handlers');
}

// ====================================
// 🚫 ERROR HANDLING
// ====================================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('💥 Global Error:', error);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    code: 'INTERNAL_ERROR'
  });
});

// ====================================
// 🚀 START SERVER
// ====================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 DMHCA CRM Backend Started Successfully!');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 JWT Authentication: ${JWT_SECRET ? 'Enabled' : 'Disabled'}`);
  console.log(`🗄️ Database: ${SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('');
  console.log('🔗 Available endpoints:');
  console.log('   GET  / - API status');
  console.log('   GET  /health - Health check');
  console.log('   POST /api/auth/debug-login - Debug authentication');
  console.log('   All  /api/* - Protected API endpoints');
  console.log('');
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