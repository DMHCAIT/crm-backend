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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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

  // Route sub-paths before the main switch
  const urlPath = req.path || req.url || '';

  // GET /api/users/me  — return current authenticated user
  if (req.method === 'GET' && (urlPath === '/me' || urlPath.endsWith('/me'))) {
    return handleGetCurrentUser(req, res);
  }

  // GET /api/users/:id/subordinates
  if (req.method === 'GET' && urlPath.includes('/subordinates')) {
    return handleGetSubordinates(req, res);
  }

  // GET /api/users/:id/leads
  if (req.method === 'GET' && urlPath.includes('/leads')) {
    return handleGetUserLeads(req, res);
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

// ── GET /api/users/me ── return current user from JWT ──
async function handleGetCurrentUser(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Optionally enrich from DB
    let userData = { id: decoded.id, email: decoded.email, username: decoded.username, role: decoded.role };
    if (supabase && decoded.id) {
      const { data } = await supabase.from('users').select('id, email, name, username, role, status, department').eq('id', decoded.id).single();
      if (data) userData = { ...userData, ...data };
    }
    return res.json({ success: true, data: userData, user: userData });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token', message: err.message });
  }
}

// ── GET /api/users/:id/subordinates ── return users managed by userId ──
async function handleGetSubordinates(req, res) {
  try {
    const urlPath = req.path || req.url || '';
    const match = urlPath.match(/\/([^/]+)\/subordinates/);
    const userId = match ? match[1] : null;

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });

    // Get the target user to find their username
    const { data: targetUser } = await supabase.from('users').select('id, username, role').eq('id', userId).single();
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

    // Find users whose manager_id matches this user, or get all if super_admin/admin
    let query = supabase.from('users').select('id, email, name, username, role, status');
    if (targetUser.role === 'super_admin' || targetUser.role === 'admin') {
      // Admin sees all
    } else {
      query = query.eq('manager_id', userId);
    }
    const { data: subordinates, error } = await query.limit(500);
    if (error) throw error;

    return res.json({ success: true, data: subordinates || [], count: (subordinates || []).length });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get subordinates', message: err.message });
  }
}

// ── GET /api/users/:id/leads?includeTeam=true ── return leads for a user ──
async function handleGetUserLeads(req, res) {
  try {
    const urlPath = req.path || req.url || '';
    const match = urlPath.match(/\/([^/]+)\/leads/);
    const userId = match ? match[1] : null;
    const includeTeam = req.query.includeTeam === 'true';

    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });

    // Resolve username for the user
    const { data: targetUser } = await supabase.from('users').select('id, username, role').eq('id', userId).single();
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

    let usernames = [targetUser.username];

    if (includeTeam && (targetUser.role === 'team_leader' || targetUser.role === 'manager' || targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      // Get subordinate usernames
      const { data: subs } = await supabase.from('users').select('username').eq('manager_id', userId);
      if (subs && subs.length > 0) {
        usernames = [...usernames, ...subs.map(s => s.username)];
      }
      if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
        usernames = null; // All leads
      }
    }

    let leadsQuery = supabase.from('leads').select('*').order('createdAt', { ascending: false }).limit(1000);
    if (usernames !== null) {
      leadsQuery = leadsQuery.in('assignedTo', usernames);
    }
    const { data: leads, error } = await leadsQuery;
    if (error) throw error;

    return res.json({ success: true, leads: leads || [], count: (leads || []).length });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to get user leads', message: err.message });
  }
}

async function handleGetUsers(req, res) {
  try {
    // Verify admin role
    await verifyAdminRole(req);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, username, role, status, department, designation, join_date, created_at, last_login, login_count')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    // Fetch lead counts for each user
    const usersWithLeads = await Promise.all(
      (users || []).map(async (user) => {
        // Get total leads assigned to this user
        const { count: totalLeads, error: leadsError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assignedTo', user.username);

        // Get leads by status for this user
        const { data: leadsData, error: statusError } = await supabase
          .from('leads')
          .select('status')
          .eq('assignedTo', user.username);

        // Count leads by status
        const leadsByStatus = {
          fresh: 0,
          contacted: 0,
          qualified: 0,
          negotiation: 0,
          won: 0,
          lost: 0,
          enrolled: 0,
          hot: 0,
          warm: 0,
          cold: 0
        };

        if (leadsData && !statusError) {
          leadsData.forEach(lead => {
            const status = (lead.status || '').toLowerCase();
            if (leadsByStatus.hasOwnProperty(status)) {
              leadsByStatus[status]++;
            }
          });
        }

        return {
          ...user,
          totalLeads: totalLeads || 0,
          leadsByStatus: leadsByStatus,
          activeLeads: (leadsData || []).filter(l => 
            ['fresh', 'contacted', 'qualified', 'negotiation', 'hot', 'warm'].includes((l.status || '').toLowerCase())
          ).length
        };
      })
    );

    res.json({
      success: true,
      users: usersWithLeads
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
