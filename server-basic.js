const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase with safe error handling
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase initialized');
  } else {
    console.log('⚠️  Supabase not configured');
  }
} catch (error) {
  console.error('❌ Supabase error:', error.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DMHCA CRM Backend is running',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    database: supabase ? 'connected' : 'not configured'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: supabase ? 'ready' : 'offline'
  });
});

// Simple auth endpoint for testing
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      message: 'Database not available'
    });
  }

  try {
    // Check for admin user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (user && user.password_hash) {
      // For now, just check if it's the admin email (we'll add bcrypt check later)
      if (email === 'santhoshapplications@dmhca.in' && password === 'Santhu@123') {
        return res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            role: user.role
          },
          token: 'temp-token-' + Date.now() // Temporary token
        });
      }
    }

    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Basic users endpoint
app.get('/api/users', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, username, role, status')
      .limit(10);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 DMHCA CRM Server v2.1.0 running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📤 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📤 SIGINT received, shutting down gracefully');  
  process.exit(0);
});