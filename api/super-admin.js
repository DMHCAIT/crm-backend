// 🚀 SUPER ADMIN API - USER MANAGEMENT SYSTEM & ANALYTICS
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'simple-secret-key';

// Initialize Supabase for activity tracking
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Super Admin API: Supabase initialized');
  } else {
    console.log('❌ Super Admin API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Super Admin API: Supabase initialization failed:', error.message);
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
  // CORS Headers
  const origin = req.headers.origin;  
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
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
    
    if (decoded.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
}

// 📋 Get all users
async function handleGetUsers(req, res) {
  try {
    console.log('🔍 Super Admin: Getting all users');
    
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
    console.error('❌ Error getting users:', error);
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

    console.log('➕ Super Admin: Creating new user:', username);

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

    console.log('✅ User created successfully:', username);

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
    console.error('❌ Error creating user:', error);
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

    console.log('✏️ Super Admin: Updating user:', userId);

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

    console.log('✅ User updated successfully:', userId);

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
    console.error('❌ Error updating user:', error);
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

    console.log('🗑️ Super Admin: Deleting user:', userId);

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

    console.log('✅ User deleted successfully:', userId);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
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
    
    console.log('📊 Super Admin: Getting user activity analytics', { user_id, username, start_date, end_date });

    // Build the query
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

    if (limit && limit <= 1000) {
      query = query.limit(parseInt(limit));
    }

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

    // Calculate user activity statistics
    const userStats = {};
    const dailyStats = {};

    allUpdates.forEach(update => {
      const user = update.updated_by || 'Unknown';
      const date = update.updated_at.split('T')[0]; // Get date part only

      // User stats
      if (!userStats[user]) {
        userStats[user] = {
          username: user,
          totalUpdates: 0,
          lastUpdate: null
        };
      }
      userStats[user].totalUpdates++;
      
      if (!userStats[user].lastUpdate || update.updated_at > userStats[user].lastUpdate) {
        userStats[user].lastUpdate = update.updated_at;
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
      dailyStats[date].users.add(user);
    });

    // Convert sets to arrays for JSON serialization
    Object.keys(dailyStats).forEach(date => {
      dailyStats[date].activeUsers = dailyStats[date].users.size;
      dailyStats[date].users = Array.from(dailyStats[date].users);
    });

    const response = {
      success: true,
      data: {
        leadUpdates: leadUpdates || [],
        userStats: Object.values(userStats).sort((a, b) => b.totalUpdates - a.totalUpdates),
        dailyStats: Object.values(dailyStats).sort((a, b) => new Date(b.date) - new Date(a.date)),
        summary: {
          totalUpdates: leadUpdates?.length || 0,
          dateRange: {
            start: start_date || 'All time',
            end: end_date || 'Now'
          },
          filteredUser: username || user_id || 'All users'
        }
      },
      message: `Found ${leadUpdates?.length || 0} lead updates`
    };

    console.log('✅ User activity data retrieved successfully');
    return res.json(response);

  } catch (error) {
    console.error('❌ Error getting user activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user activity data',
      error: error.message
    });
  }
}