const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabaseClient');

// Simple authentication endpoint
const simpleAuthHandler = async (req, res) => {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://crm-frontend-final-git-master-dmhca.vercel.app',
      'https://www.crmdmhca.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { username, password } = req.body;

      console.log('🔐 Simple Auth Login attempt:', { username: username || 'undefined' });

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Simple hardcoded authentication
      if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
          { 
            userId: 'admin-001',
            username: 'admin',
            role: 'admin'
          },
          process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024',
          { expiresIn: '24h' }
        );

        console.log('✅ Simple Auth Success for admin');

        // Set CORS headers for successful response
        const origin = req.headers.origin;
        const allowedOrigins = [
          'https://crm-frontend-final-git-master-dmhca.vercel.app',
          'https://www.crmdmhca.com',
          'http://localhost:5173',
          'http://localhost:3000'
        ];

        if (allowedOrigins.includes(origin)) {
          res.header('Access-Control-Allow-Origin', origin);
        }
        res.header('Access-Control-Allow-Credentials', 'true');

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          token: token,
          user: {
            id: 'admin-001',
            username: 'admin',
            email: 'admin@dmhca.com',
            role: 'admin',
            firstName: 'System',
            lastName: 'Administrator'
          }
        });
      }

      // Invalid credentials
      console.log('❌ Simple Auth Failed: Invalid credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });

    } catch (error) {
      console.error('❌ Simple Auth Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

module.exports = simpleAuthHandler;