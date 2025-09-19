// 🚀 SUPER ADMIN API - USER MANAGEMENT SYSTEM
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'simple-secret-key';

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
    return handleGetUsers(req, res);
  }
  
  if (req.method === 'POST') {
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