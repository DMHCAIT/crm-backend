// 🚀 ASSIGNABLE USERS API - SUPABASE CONNECTED
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
    console.log('✅ Assignable Users API: Supabase initialized');
  } else {
    console.log('❌ Assignable Users API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Assignable Users API: Supabase initialization failed:', error.message);
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

// Get subordinate users recursively
async function getSubordinateUsers(userId, allUsers) {
  const subordinates = [];
  const visited = new Set();
  
  console.log(`🔍 Finding subordinates for user ID: ${userId}`);
  console.log(`🔍 Available users with reports_to:`, allUsers.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    reports_to: u.reports_to
  })));
  
  function findSubordinates(supervisorId) {
    if (visited.has(supervisorId)) return;
    visited.add(supervisorId);
    
    allUsers.forEach(user => {
      if (user.reports_to === supervisorId) {
        console.log(`📋 Found subordinate: ${user.name} (${user.role}) reports to ${supervisorId}`);
        subordinates.push(user);
        findSubordinates(user.id);
      }
    });
  }
  
  findSubordinates(userId);
  console.log(`✅ Total subordinates found: ${subordinates.length}`, subordinates.map(s => ({ name: s.name, role: s.role })));
  return subordinates;
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
    console.log(`🔍 Assignable Users API: Request from ${user.username} (${user.email})`);

    // GET /api/assignable-users - Get users that current user can assign leads to
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

        // Find current user - try multiple matching methods
        let currentUser = allUsers.find(u => u.username === user.username);
        if (!currentUser) {
          // Try matching by email
          currentUser = allUsers.find(u => u.email === user.email);
        }
        if (!currentUser) {
          // Try case-insensitive username matching
          currentUser = allUsers.find(u => u.username?.toLowerCase() === user.username?.toLowerCase());
        }
        
        console.log(`🔍 Current user lookup:`, {
          jwtUsername: user.username,
          jwtEmail: user.email,
          foundUser: currentUser ? {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            email: currentUser.email,
            role: currentUser.role
          } : null,
          totalUsersInDB: allUsers.length
        });
        
        if (!currentUser) {
          return res.status(404).json({
            success: false,
            error: 'Current user not found in database',
            details: {
              jwtUsername: user.username,
              jwtEmail: user.email,
              availableUsers: allUsers.map(u => ({ username: u.username, email: u.email, name: u.name }))
            }
          });
        }

        // Get subordinate users
        const subordinates = await getSubordinateUsers(currentUser.id, allUsers);
        
        // Build assignable users list
        const assignableUsers = [];
        
        // User can assign to themselves
        assignableUsers.push({
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          email: currentUser.email,
          role: currentUser.role,
          department: currentUser.department,
          display_name: `${currentUser.name} (${currentUser.role}) - You`
        });
        
        // User can assign to their subordinates
        subordinates.forEach(subordinate => {
          assignableUsers.push({
            id: subordinate.id,
            name: subordinate.name,
            username: subordinate.username,
            email: subordinate.email,
            role: subordinate.role,
            department: subordinate.department,
            display_name: `${subordinate.name} (${subordinate.role}) - ${subordinate.department || 'No Department'}`
          });
        });

        // Super admins can assign to everyone
        if (currentUser.role === 'super_admin') {
          console.log(`🔑 Super Admin Access: Adding all ${allUsers.length} users to assignable list`);
          allUsers.forEach(u => {
            if (!assignableUsers.find(au => au.id === u.id)) {
              assignableUsers.push({
                id: u.id,
                name: u.name,
                username: u.username,
                email: u.email,
                role: u.role,
                department: u.department,
                display_name: `${u.name} (${u.role}) - ${u.department || 'No Department'}`
              });
            }
          });
        }
        
        // Senior managers can assign to managers, team leaders, and counselors
        else if (currentUser.role === 'senior_manager') {
          const assignableRoles = ['manager', 'team_leader', 'counselor'];
          allUsers.filter(u => assignableRoles.includes(u.role)).forEach(u => {
            if (!assignableUsers.find(au => au.id === u.id)) {
              assignableUsers.push({
                id: u.id,
                name: u.name,
                username: u.username,
                email: u.email,
                role: u.role,
                department: u.department,
                display_name: `${u.name} (${u.role}) - ${u.department || 'No Department'}`
              });
            }
          });
        }
        
        // Managers can assign to team leaders and counselors
        else if (currentUser.role === 'manager') {
          const assignableRoles = ['team_leader', 'counselor'];
          allUsers.filter(u => assignableRoles.includes(u.role)).forEach(u => {
            if (!assignableUsers.find(au => au.id === u.id)) {
              assignableUsers.push({
                id: u.id,
                name: u.name,
                username: u.username,
                email: u.email,
                role: u.role,
                department: u.department,
                display_name: `${u.name} (${u.role}) - ${u.department || 'No Department'}`
              });
            }
          });
        }

        console.log(`✅ Found ${assignableUsers.length} assignable users for ${currentUser.name}`);

        return res.json({
          success: true,
          users: assignableUsers,
          data: assignableUsers,
          totalCount: assignableUsers.length,
          message: `Found ${assignableUsers.length} assignable users`
        });

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