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
        console.log('✅ Simple Auth - looking up admin user in database');
        
        let adminUser = null;
        
        // Try to get admin user data from database
        if (supabase) {
          try {
            const { data: dbAdmin, error } = await supabase
              .from('users')
              .select('*')
              .eq('username', 'admin')
              .single();
            
            if (!error && dbAdmin) {
              adminUser = dbAdmin;
              console.log(`✅ Simple Auth: Found admin in database: ${adminUser.name}`);
            } else {
              console.log('⚠️ Simple Auth: Admin not found in database, using fallback');
            }
          } catch (dbError) {
            console.log('⚠️ Simple Auth: Database lookup failed:', dbError.message);
          }
        }
        
        const token = jwt.sign(
          { 
            userId: adminUser?.id || 'admin-001',
            username: 'admin',
            role: adminUser?.role || 'admin',
            name: adminUser?.fullName || adminUser?.name
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
            id: adminUser?.id || 'admin-001',
            username: 'admin',
            email: adminUser?.email || 'admin@dmhca.com',
            role: adminUser?.role || 'admin',
            name: adminUser?.fullName || adminUser?.name || 'Admin User',
            firstName: (adminUser?.fullName || adminUser?.name || 'Admin User').split(' ')[0],
            lastName: (adminUser?.fullName || adminUser?.name || 'Admin User').split(' ').slice(1).join(' ') || 'User'
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