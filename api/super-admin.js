// 🚀 SUPER ADMIN API - USER MANAGEMENT SYSTEM & ANALYTICS
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Initialize Supabase for activity tracking
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Super Admin API: Supabase initialized');
  } else {
    logger.info('❌ Super Admin API: Supabase credentials missing');
  }
} catch (error) {
  logger.info('❌ Super Admin API: Supabase initialization failed:', error.message);
}

// In-memory user storage (replace with database in production)
let USERS_DATABASE = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    email: 'admin@crm.com',
    fullName: 'System Administrator',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    username: 'counselor1',
    password: 'counselor123',
    role: 'counselor',
    email: 'counselor@crm.com',
    fullName: 'John Counselor',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    username: 'manager1',
    password: 'manager123',
    role: 'manager',
    email: 'manager@crm.com',
    fullName: 'Sarah Manager',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

module.exports = async (req, res) => {
  // Enhanced CORS Headers
  const origin = req.headers.origin;
  logger.info('🌐 Super Admin API - Origin:', origin);
  
  // Allow specific origins
  const allowedOrigins = [
    'https://www.crmdmhca.com',
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (origin && allowedOrigins.some(allowed => origin === allowed || origin.includes('vercel.app') || origin.includes('crmdmhca.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for production
    res.setHeader('Access-Control-Allow-Origin', 'https://www.crmdmhca.com');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    logger.info('🔧 Super Admin API - Handling preflight request');
    return res.status(200).end();
  }

  // Verify super admin token
  const authResult = verifyAdminToken(req);
  if (!authResult.success) {
    return res.status(401).json(authResult);
  }

  // Route handling
  if (req.method === 'GET') {
    // Check if requesting user activity analytics
    if (req.query.action === 'user-activity') {
      return handleGetUserActivity(req, res);
    }
    return handleGetUsers(req, res);
  }  if (req.method === 'POST') {
    return handleCreateUser(req, res);
  }
  
  if (req.method === 'PUT') {
    return handleUpdateUser(req, res);
  }
  
  if (req.method === 'DELETE') {
    return handleDeleteUser(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
};

// 🔐 Verify admin token
function verifyAdminToken(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return { success: false, message: 'No token provided' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Allow both 'admin' and 'super_admin' roles to access super admin features
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(decoded.role)) {
      logger.info('🚨 Access denied for role:', decoded.role);
      return { success: false, message: `Super admin access required. Current role: ${decoded.role}` };
    }

    logger.info('✅ Super admin access granted for role:', decoded.role);
    return { success: true, user: decoded };
  } catch (error) {
    logger.error('🚨 Token verification failed:', error.message);
    return { success: false, message: 'Invalid token' };
  }
}

// 📋 Get all users
async function handleGetUsers(req, res) {
  try {
    logger.info('🔍 Super Admin: Getting all users');
    
    const safeUsers = USERS_DATABASE.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt
    }));

    return res.json({
      success: true,
      users: safeUsers,
      message: `Found ${safeUsers.length} users`
    });
  } catch (error) {
    logger.error('❌ Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
}

// ➕ Create new user
async function handleCreateUser(req, res) {
  try {
    const { username, password, role, email, fullName } = req.body;

    logger.info('➕ Super Admin: Creating new user:', username);

    // Validation
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and role are required'
      });
    }

    // Check if username exists
    if (USERS_DATABASE.find(u => u.username === username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new user
    const newUser = {
      id: Math.max(...USERS_DATABASE.map(u => u.id)) + 1,
      username,
      password,
      role,
      email: email || `${username}@crm.com`,
      fullName: fullName || username,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    USERS_DATABASE.push(newUser);

    logger.info('✅ User created successfully:', username);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email,
        fullName: newUser.fullName,
        status: newUser.status
      },
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('❌ Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
}

// ✏️ Update user
async function handleUpdateUser(req, res) {
  try {
    const userId = req.query.id || req.body.id;
    const { username, password, role, email, fullName, status } = req.body;

    logger.info('✏️ Super Admin: Updating user:', userId);

    const userIndex = USERS_DATABASE.findIndex(u => u.id == userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    const user = USERS_DATABASE[userIndex];
    if (username) user.username = username;
    if (password) user.password = password;
    if (role) user.role = role;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (status) user.status = status;

    logger.info('✅ User updated successfully:', userId);

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
        status: user.status
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('❌ Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
}

// 🗑️ Delete user
async function handleDeleteUser(req, res) {
  try {
    const userId = req.query.id;

    logger.info('🗑️ Super Admin: Deleting user:', userId);

    const userIndex = USERS_DATABASE.findIndex(u => u.id == userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting the main admin
    if (USERS_DATABASE[userIndex].username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete main admin user'
      });
    }

    USERS_DATABASE.splice(userIndex, 1);

    logger.info('✅ User deleted successfully:', userId);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('❌ Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
}

// 📊 Get user activity analytics
async function handleGetUserActivity(req, res) {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { user_id, username, start_date, end_date, limit = 100 } = req.query;
    
    logger.info('📊 Super Admin: Getting user activity analytics', { user_id, username, start_date, end_date });

    // Build the query with user information lookup
    let query = supabase
      .from('leads')
      .select(`
        id,
        "fullName",
        status,
        updated_at,
        updated_by,
        created_at,
        assigned_to
      `);

    // Filter by user if specified
    if (user_id || username) {
      if (username) {
        query = query.eq('updated_by', username);
      } else if (user_id) {
        // If user_id is provided, we might need to map it to username
        // For now, we'll use updated_by field which stores username
        query = query.eq('updated_by', user_id);
      }
    }

    // Filter by date range
    if (start_date) {
      query = query.gte('updated_at', start_date);
    }
    if (end_date) {
      // Add end of day to include full end date
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte('updated_at', endDateTime.toISOString());
    }

    // Order by most recent updates first
    query = query.order('updated_at', { ascending: false });

    // Increase default limit and allow higher limits for super admin
    const actualLimit = limit ? Math.min(parseInt(limit), 2000) : 1000;
    query = query.limit(actualLimit);

    const { data: leadUpdates, error } = await query;

    if (error) throw error;

    // Also get user statistics
    let statsQuery = supabase
      .from('leads')
      .select('updated_by, updated_at', { count: 'exact' });

    if (start_date) {
      statsQuery = statsQuery.gte('updated_at', start_date);
    }
    if (end_date) {
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);
      statsQuery = statsQuery.lte('updated_at', endDateTime.toISOString());
    }

    const { data: allUpdates, error: statsError } = await statsQuery;

    if (statsError) throw statsError;

    // Get all unique user IDs for username lookup
    const userIds = new Set();
    allUpdates.forEach(update => {
      if (update.updated_by && update.updated_by !== 'Unknown' && update.updated_by !== 'System') {
        userIds.add(update.updated_by);
      }
    });

    // Lookup actual usernames from users table
    let userIdToUsername = {};
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, name, email')
        .in('id', Array.from(userIds));

      if (!usersError && users) {
        users.forEach(user => {
          userIdToUsername[user.id] = user.username || user.name || user.email?.split('@')[0] || 'Unknown';
        });
        
        logger.info(`✅ Resolved ${users.length} user IDs to usernames`);
      } else {
        logger.error('❌ Error fetching users for ID resolution:', usersError);
      }
      
      // For user IDs that don't have corresponding users, use the ID itself (truncated for readability)
      Array.from(userIds).forEach(userId => {
        if (!userIdToUsername[userId]) {
          // If it looks like a UUID, use first 8 characters + ... for display
          if (userId.length > 10 && userId.includes('-')) {
            userIdToUsername[userId] = `User-${userId.substring(0, 8)}...`;
          } else {
            userIdToUsername[userId] = userId;
          }
        }
      });
    }

    // Calculate user activity statistics with resolved usernames
    const userStats = {};
    const dailyStats = {};

    allUpdates.forEach(update => {
      const userId = update.updated_by || 'Unknown';
      const username = userIdToUsername[userId] || userId || 'Unknown';
      const date = update.updated_at.split('T')[0]; // Get date part only

      // User stats
      if (!userStats[username]) {
        userStats[username] = {
          username: username,
          userId: userId,
          totalUpdates: 0,
          lastUpdate: null
        };
      }
      userStats[username].totalUpdates++;
      
      if (!userStats[username].lastUpdate || update.updated_at > userStats[username].lastUpdate) {
        userStats[username].lastUpdate = update.updated_at;
      }

      // Daily stats
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: date,
          totalUpdates: 0,
          users: new Set()
        };
      }
      dailyStats[date].totalUpdates++;
      dailyStats[date].users.add(username);
    });

    // Convert sets to arrays for JSON serialization
    Object.keys(dailyStats).forEach(date => {
      dailyStats[date].activeUsers = dailyStats[date].users.size;
      dailyStats[date].users = Array.from(dailyStats[date].users);
    });

    // Enhance lead updates with resolved usernames
    const enhancedLeadUpdates = leadUpdates?.map(update => ({
      ...update,
      updated_by_username: userIdToUsername[update.updated_by] || update.updated_by || 'Unknown',
      assigned_to_username: userIdToUsername[update.assigned_to] || update.assigned_to || 'Unassigned'
    })) || [];

    const response = {
      success: true,
      data: {
        leadUpdates: enhancedLeadUpdates,
        userStats: Object.values(userStats).sort((a, b) => b.totalUpdates - a.totalUpdates),
        dailyStats: Object.values(dailyStats).sort((a, b) => new Date(b.date) - new Date(a.date)),
        userIdToUsername: userIdToUsername, // Include mapping for frontend use
        summary: {
          totalUpdates: allUpdates?.length || 0, // Use allUpdates count, not just displayed updates
          totalDisplayed: leadUpdates?.length || 0, // Show how many are displayed
          dateRange: {
            start: start_date || 'All time',
            end: end_date || 'Now'
          },
          filteredUser: username || user_id || 'All users'
        }
      },
      message: `Found ${allUpdates?.length || 0} total updates, displaying ${leadUpdates?.length || 0}`
    };

    logger.info('✅ User activity data retrieved successfully');
    return res.json(response);

  } catch (error) {
    logger.error('❌ Error getting user activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user activity data',
      error: error.message
    });
  }
}