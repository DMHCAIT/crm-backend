const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { supabase } = require('../config/supabaseClient');

// JWT Secret - MUST be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET environment variable is required');
}

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

      // Check database connection
      if (!supabase) {
        console.error('❌ Simple Auth: Database connection not available');
        return res.status(500).json({
          success: false,
          message: 'Database connection not available'
        });
      }

      // Look up user by email or username
      console.log('🔍 Simple Auth - looking up user in database');
      const { data: users, error: lookupError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${username},username.eq.${username}`)
        .limit(1);

      if (lookupError) {
        console.error('❌ Database lookup error:', lookupError);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      if (!users || users.length === 0) {
        console.log('❌ Simple Auth Failed: User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      const user = users[0];

      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.log('❌ Simple Auth Failed: Invalid password');
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username || user.email,
          role: user.role,
          name: user.fullName || user.name,
          fullName: user.fullName || user.name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ Simple Auth Success for user:', user.email);

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
          id: user.id,
          username: user.username || user.email,
          email: user.email,
          role: user.role,
          name: user.fullName || user.name,
          firstName: (user.fullName || user.name || '').split(' ')[0] || 'User',
          lastName: (user.fullName || user.name || '').split(' ').slice(1).join(' ') || ''
        }
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