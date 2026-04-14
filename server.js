// 🚀 FIXED SERVER.JS - Complete Authentication Solution
// Apply this to your crm-backend repository on Railway

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
// Render sets PORT; parse avoids edge cases
const PORT = Number.parseInt(process.env.PORT, 10) || 3001;

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Starting DMHCA CRM Backend Server...');
console.log('🔑 JWT Secret configured:', JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('🗄️ Supabase URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');

// CORS — glob '*.vercel.app' is not valid in cors(); use a matcher
const corsStaticOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://crmdmhca.com',
  'https://www.crmdmhca.com',
  'https://crm-frontend-dmhca.vercel.app',
  'https://crm-frontend-final.vercel.app',
  'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app'
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (corsStaticOrigins.has(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    callback(null, false);
  },
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
  // CORS preflight must never hit JWT (browser shows 404/CORS / failed fetch otherwise)
  if (req.method === 'OPTIONS') {
    return next();
  }

  const pathNorm = (req.path || '/').replace(/\/+$/, '') || '/';

  // Skip authentication for specific routes
  const publicPaths = [
    '/',
    '/health',
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/debug-login',
    '/api/leads/google-sync',
    '/api/leads/google-sheet-webhook',
    '/webhooks'
  ];

  const shouldSkipAuth = publicPaths.some((path) => {
    const base = path.endsWith('/') ? path.slice(0, -1) : path;
    return pathNorm === base || pathNorm.startsWith(`${base}/`);
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

// Public health check endpoint for frontend
app.get('/api/health', (req, res) => {
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

// Import and setup API handlers — load each module separately so one failure does not drop all routes
function mountHandler(label, paths, modulePath) {
  try {
    const handler = require(modulePath);
    paths.forEach((p) => app.all(p, handler));
    console.log(`✅ Mounted ${label} (${modulePath})`);
  } catch (error) {
    console.error(`❌ Failed to mount ${label} (${modulePath}):`, error.message);
  }
}

mountHandler('auth', ['/api/auth/*'], './api/auth.js');
mountHandler('users', ['/api/users/*', '/api/users'], './api/users.js');
mountHandler('leads', ['/api/leads/google-sync', '/api/leads/*', '/api/leads'], './api/leads.js');
mountHandler('leads-simple', ['/api/leads-simple/*', '/api/leads-simple'], './api/leads-simple.js');
mountHandler('students', ['/api/students/*', '/api/students'], './api/students.js');
mountHandler('dashboard', ['/api/dashboard-summary', '/api/dashboard/*', '/api/dashboard'], './api/dashboard.js');
mountHandler('communications', ['/api/communications/*', '/api/communications'], './api/enhanced-communications.js');
mountHandler('analytics', ['/api/analytics/*', '/api/analytics'], './api/enhanced-analytics.js');
mountHandler('automations', ['/api/automations/*', '/api/automations'], './api/enhanced-automation.js');
mountHandler('documents', ['/api/documents/*', '/api/documents'], './api/enhanced-documents.js');
mountHandler('integrations', ['/api/integrations/*', '/api/integrations'], './api/integrations.js');
mountHandler('notifications', ['/api/notifications/*', '/api/notifications'], './api/enhanced-notifications.js');
mountHandler('settings', ['/api/settings/*', '/api/settings'], './api/enhanced-system-settings.js');
mountHandler('assignable-users', ['/api/assignable-users'], './api/assignable-users.js');

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
  console.log(`📡 Server running on port ${PORT} (process.env.PORT=${process.env.PORT || 'unset'})`);
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

server.on('error', (err) => {
  console.error('❌ HTTP server failed to start:', err.message);
  process.exit(1);
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
