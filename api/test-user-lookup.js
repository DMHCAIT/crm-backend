// 🧪 SIMPLE USER LOOKUP TEST - Test if current user can be found
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Test User Lookup: Supabase initialized');
  } else {
    logger.info('❌ Test User Lookup: Supabase credentials missing');
  }
} catch (error) {
  logger.info('❌ Test User Lookup: Supabase initialization failed:', error.message);
}

// Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify Supabase connection
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available',
      message: 'Supabase not initialized'
    });
  }

  try {
    const user = verifyToken(req);
    logger.info(`🧪 Test User Lookup: Request from ${user.username} (${user.email})`);

    if (req.method === 'GET') {
      try {
        // Get all active users from database
        const { data: allUsers, error } = await supabase
          .from('users')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) {
          logger.error('❌ Error fetching users:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
          });
        }

        // Try all possible user lookup methods
        const userLookupResults = {
          byUsername: allUsers.find(u => u.username === user.username),
          byEmail: allUsers.find(u => u.email === user.email),
          byUsernameInsensitive: allUsers.find(u => u.username?.toLowerCase() === user.username?.toLowerCase()),
          byEmailInsensitive: allUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase()),
        };

        // Find subordinates for each match
        const subordinateResults = {};
        Object.keys(userLookupResults).forEach(method => {
          const foundUser = userLookupResults[method];
          if (foundUser) {
            const directSubordinates = allUsers.filter(u => u.reports_to === foundUser.id);
            subordinateResults[method] = {
              user: {
                id: foundUser.id,
                name: foundUser.name,
                username: foundUser.username,
                email: foundUser.email,
                role: foundUser.role
              },
              directSubordinates: directSubordinates.map(s => ({
                id: s.id,
                name: s.name,
                username: s.username,
                role: s.role,
                reports_to: s.reports_to
              })),
              subordinateCount: directSubordinates.length
            };
          }
        });

        return res.json({
          success: true,
          testResults: {
            jwtToken: {
              username: user.username,
              email: user.email,
              role: user.role
            },
            totalUsersInDB: allUsers.length,
            userLookupAttempts: Object.keys(userLookupResults).map(method => ({
              method,
              found: !!userLookupResults[method],
              user: userLookupResults[method] ? {
                id: userLookupResults[method].id,
                name: userLookupResults[method].name,
                username: userLookupResults[method].username,
                email: userLookupResults[method].email,
                role: userLookupResults[method].role
              } : null
            })),
            subordinateResults,
            allUsersInDB: allUsers.map(u => ({
              id: u.id,
              name: u.name,
              username: u.username,
              email: u.email,
              role: u.role,
              reports_to: u.reports_to,
              status: u.status
            }))
          }
        });

      } catch (error) {
        logger.error('❌ Database error:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    logger.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: error.message
    });
  }
};