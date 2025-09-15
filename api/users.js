// Users API Handler for Admin User Management
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase conditionally
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Users module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';

// Middleware to verify admin role
async function verifyAdminRole(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user has admin role
    if (!decoded.role || (decoded.role !== 'super_admin' && decoded.role !== 'admin')) {
      throw new Error('Admin access required');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token or insufficient permissions');
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetUsers(req, res);
        break;
      
      case 'POST':
        await handleCreateUser(req, res);
        break;
      
      case 'PUT':
        await handleUpdateUser(req, res);
        break;
      
      case 'DELETE':
        await handleDeleteUser(req, res);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

async function handleGetUsers(req, res) {
  try {
    // Verify admin role
    await verifyAdminRole(req);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, username, role, status, department, designation, join_date, created_at, last_login, login_count')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    res.status(error.message.includes('Admin access') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleCreateUser(req, res) {
  try {
    // Verify admin role
    await verifyAdminRole(req);

    const { email, password, name, username, role, department, designation, phone } = req.body;

    if (!email || !password || !name || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and username are required'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email,
          name,
          username,
          password_hash: hashedPassword,
          role: role || 'user',
          status: 'active',
          department: department || null,
          designation: designation || null,
          phone: phone || null,
          join_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id, email, name, username, role, status, department, designation, join_date')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    res.status(error.message.includes('Admin access') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleUpdateUser(req, res) {
  try {
    // Verify admin role
    await verifyAdminRole(req);

    const userId = req.query.id || req.body.id;
    const { name, username, role, department, designation, phone, status, password } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;

    // If password is provided, hash it
    if (password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, username, role, status, department, designation, join_date')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(error.message.includes('Admin access') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleDeleteUser(req, res) {
  try {
    // Verify admin role
    await verifyAdminRole(req);

    const userId = req.query.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(error.message.includes('Admin access') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
}
