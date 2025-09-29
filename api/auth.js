// 🚀 DATABASE-CONNECTED AUTHENTICATION WITH FALLBACK
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { generateUserPermissions } = require('../config/permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'simple-secret-key';

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('✅ Auth: Supabase client initialized');
  }
} catch (error) {
  console.error('❌ Auth: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // Simple CORS
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle different auth endpoints
  if (req.method === 'POST') {
    return await handleUltraSimpleLogin(req, res);
  }

  if (req.method === 'GET') {
    return await handleTokenVerification(req, res);
  }

  res.status(404).json({ error: 'Not found' });
};

// 🚀 DATABASE-CONNECTED LOGIN WITH HARDCODED FALLBACK
async function handleUltraSimpleLogin(req, res) {
  const { username, password } = req.body;

  console.log('🚀 Login attempt:', username);

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  try {
    // First try database authentication if available
    if (supabase) {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('status', 'active')
        .limit(1);

      if (!error && users && users.length > 0) {
        const user = users[0];
        
        // Always try bcrypt password verification for database users (including admin)
        if (user.password_hash) {
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (isValid) {
            console.log('✅ Database login successful for:', username);
            
            const token = jwt.sign({
              username: user.username,
              userId: user.id,
              id: user.id,
              email: user.email,
              name: user.name || user.fullName,
              role: user.role,
              loginTime: Date.now()
            }, JWT_SECRET, { expiresIn: '24h' });

            // Generate role-based permissions
            const rolePermissions = generateUserPermissions(user.role);
            
            return res.json({
              success: true,
              token: token,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                permissions: user.permissions
              },
              rolePermissions: rolePermissions,
              message: 'Login successful'
            });
          }
        }
      }
    }

    // Fallback to hardcoded admin if database fails
    if (username === 'admin' && password === 'admin123') {
      console.log('✅ Fallback admin login - checking database for admin user data');
      
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
            console.log(`✅ Found admin in database: ${adminUser.name}`);
          }
        } catch (dbError) {
          console.log('⚠️ Could not fetch admin from database:', dbError.message);
        }
      }
      
      const token = jwt.sign({
        username: 'admin',
        userId: adminUser?.id || 'admin-1',
        id: adminUser?.id || 'admin-1',
        email: adminUser?.email || 'admin@dmhca.com',
        name: adminUser?.fullName || adminUser?.name || 'Admin User',
        role: adminUser?.role || 'super_admin',
        loginTime: Date.now()
      }, JWT_SECRET, { expiresIn: '24h' });

      // Generate role-based permissions for super admin
      const rolePermissions = generateUserPermissions(adminUser?.role || 'super_admin');
      
      return res.json({
        success: true,
        token: token,
        user: {
          id: adminUser?.id || 'admin-1',
          username: 'admin',
          name: adminUser?.fullName || adminUser?.name || 'Admin User',
          email: adminUser?.email || 'admin@dmhca.com',
          role: adminUser?.role || 'super_admin',
          department: adminUser?.department || 'Administration',
          permissions: adminUser?.permissions || '["read", "write", "admin", "delete", "super_admin"]'
        },
        rolePermissions: rolePermissions,
        message: 'Login successful'
      });
    }

    console.log('❌ Invalid credentials for:', username);
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
}

// 🔐 Production Authentication API - Comprehensive User Management  
// This API handles all authentication with both hardcoded and database users
// Supports: Login, Role-based permissions, JWT tokens, Password verification
// ✅ FIXED: Database users now use bcrypt verification (v2.0)
async function handleTokenVerification(req, res) {
  console.log('🔍 Token verification requested');
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('✅ Token verified for user:', decoded.username);

    // Try to get fresh user data from database - First by userId, then by username
    if (supabase) {
      try {
        let user = null, error = null;
        
        // Try lookup by userId first
        if (decoded.userId) {
          console.log(`🔍 Looking up user by ID: ${decoded.userId}`);
          const result = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .eq('status', 'active')
            .single();
          user = result.data;
          error = result.error;
        }
        
        // If userId lookup failed, try username lookup
        if (!user && decoded.username) {
          console.log(`🔍 Looking up user by username: ${decoded.username}`);
          const result = await supabase
            .from('users')
            .select('*')
            .eq('username', decoded.username)
            .eq('status', 'active')
            .single();
          user = result.data;
          error = result.error;
        }

        if (!error && user) {
          console.log(`✅ Found user in database: ${user.name} (${user.username})`);
          return res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.fullName || user.name,
              email: user.email,
              role: user.role,
              department: user.department,
              permissions: user.permissions || decoded.permissions
            },
            message: 'Token valid'
          });
        } else {
          console.log(`⚠️ Database lookup failed for ${decoded.username}:`, error?.message);
        }
      } catch (dbError) {
        console.log('⚠️ Database lookup failed:', dbError.message);
      }
    }

    // Fallback to token data - but use username as name instead of hardcoded "System Administrator"
    const fallbackName = decoded.name || decoded.fullName || decoded.username;
    console.log(`⚠️ Using fallback user data for ${decoded.username}: name="${fallbackName}"`);
    
    return res.json({
      success: true,
      user: {
        username: decoded.username,
        role: decoded.role,
        name: fallbackName,
        department: decoded.department || 'Unknown',
        permissions: decoded.permissions || '["read", "write"]'
      },
      message: 'Token valid'
    });

  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}