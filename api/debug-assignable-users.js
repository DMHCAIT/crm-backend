// 🔍 DEBUG ASSIGNABLE USERS - Simple Test Endpoint
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Debug Assignable Users: Supabase initialized');
  } else {
    console.log('❌ Debug Assignable Users: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Debug Assignable Users: Supabase initialization failed:', error.message);
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
    console.log(`🔍 Debug API: Request from ${user.username} (${user.email})`);

    if (req.method === 'GET') {
      try {
        // Get all active users from database
        const { data: allUsers, error } = await supabase
          .from('users')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (error) {
          console.error('❌ Error fetching users:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
          });
        }

        // Find current user
        const currentUser = allUsers.find(u => u.username === user.username || u.email === user.email);
        
        // Debug information
        const debugInfo = {
          success: true,
          debug: {
            totalUsersInDatabase: allUsers.length,
            currentUserFound: !!currentUser,
            currentUser: currentUser ? {
              id: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              email: currentUser.email,
              role: currentUser.role,
              reports_to: currentUser.reports_to
            } : null,
            allUsers: allUsers.map(u => ({
              id: u.id,
              name: u.name,
              username: u.username,
              email: u.email,
              role: u.role,
              reports_to: u.reports_to,
              department: u.department,
              status: u.status
            })),
            hierarchyAnalysis: {
              usersWithSupervisor: allUsers.filter(u => u.reports_to !== null).length,
              usersWithoutSupervisor: allUsers.filter(u => u.reports_to === null).length,
              superAdmins: allUsers.filter(u => u.role === 'super_admin').length,
              teamLeaders: allUsers.filter(u => u.role === 'team_leader').length,
              counselors: allUsers.filter(u => u.role === 'counselor').length
            }
          }
        };

        if (currentUser) {
          // Find subordinates
          const subordinates = allUsers.filter(u => u.reports_to === currentUser.id);
          debugInfo.debug.directSubordinates = subordinates.map(s => ({
            name: s.name,
            username: s.username,
            role: s.role
          }));
          debugInfo.debug.directSubordinatesCount = subordinates.length;
        }

        return res.json(debugInfo);

      } catch (error) {
        console.error('❌ Database error:', error.message);
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
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: error.message
    });
  }
};