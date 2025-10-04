// 🚀 SUPABASE-CONNECTED USER MANAGEMENT API
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
    console.log('✅ User Management API: Supabase initialized');
  } else {
    console.log('❌ User Management API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ User Management API: Supabase initialization failed:', error.message);
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
  // Enhanced CORS Headers
  const origin = req.headers.origin;
  console.log('🌐 Users API - Origin:', origin);
  
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
    console.log('🔧 Users API - Handling preflight request');
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
    console.log(`🔍 User Management API: Request from ${user.username} (${user.email})`);

    // GET /api/users-supabase - Get all users
    if (req.method === 'GET') {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching users:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
          });
        }

        console.log(`✅ Fetched ${users?.length || 0} users from database`);

        return res.json({
          success: true,
          data: users || [],
          totalCount: users?.length || 0,
          message: `Found ${users?.length || 0} users`
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

    // POST /api/users-supabase - Create new user
    if (req.method === 'POST') {
      const {
        name,
        username,
        email,
        role,
        status,
        department,
        designation,
        phone,
        location,
        join_date,
        reports_to,
        company
      } = req.body;

      // Validate required fields
      if (!name || !username || !email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Name, username, email, and role are required'
        });
      }

      try {
        // Check if username or email already exists
        const { data: existingUsers } = await supabase
          .from('users')
          .select('username, email')
          .or(`username.eq.${username},email.eq.${email}`);

        if (existingUsers && existingUsers.length > 0) {
          const existing = existingUsers[0];
          if (existing.username === username) {
            return res.status(400).json({
              success: false,
              error: 'Username already exists'
            });
          }
          if (existing.email === email) {
            return res.status(400).json({
              success: false,
              error: 'Email already exists'
            });
          }
        }

        // Validate reports_to if provided
        if (reports_to) {
          const { data: supervisor } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', reports_to)
            .single();

          if (!supervisor) {
            return res.status(400).json({
              success: false,
              error: 'Invalid supervisor selected'
            });
          }
        }

        // Create new user
        const userData = {
          name,
          username,
          email,
          role,
          status: status || 'active',
          department: department || null,
          designation: designation || null,
          phone: phone || null,
          location: location || null,
          join_date: join_date || new Date().toISOString().split('T')[0],
          reports_to: reports_to === '' ? null : (reports_to || null),
          company: company || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Creating user:', userData);

        const { data: newUser, error } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating user:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create user',
            details: error.message
          });
        }

        console.log(`✅ Created user: ${newUser.name} (${newUser.username})`);

        return res.json({
          success: true,
          data: newUser,
          message: 'User created successfully'
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

    // PUT /api/users-supabase - Update user
    if (req.method === 'PUT') {
      const userId = req.query.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for update'
        });
      }

      const {
        name,
        email,
        role,
        status,
        department,
        designation,
        phone,
        location,
        join_date,
        reports_to,
        company
      } = req.body;

      try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError || !existingUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Validate reports_to if provided
        if (reports_to && reports_to !== existingUser.reports_to) {
          if (reports_to === userId) {
            return res.status(400).json({
              success: false,
              error: 'User cannot report to themselves'
            });
          }

          const { data: supervisor } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', reports_to)
            .single();

          if (!supervisor) {
            return res.status(400).json({
              success: false,
              error: 'Invalid supervisor selected'
            });
          }
        }

        // Prepare update data
        const updateData = {
          updated_at: new Date().toISOString()
        };

        // Only update fields that are provided
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (status !== undefined) updateData.status = status;
        if (department !== undefined) updateData.department = department;
        if (designation !== undefined) updateData.designation = designation;
        if (phone !== undefined) updateData.phone = phone;
        if (location !== undefined) updateData.location = location;
        if (join_date !== undefined) updateData.join_date = join_date;
        if (reports_to !== undefined) updateData.reports_to = reports_to === '' ? null : reports_to;
        if (company !== undefined) updateData.company = company;

        console.log(`📝 Updating user ${userId}:`, updateData);

        const { data: updatedUser, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating user:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to update user',
            details: error.message
          });
        }

        console.log(`✅ Updated user: ${updatedUser.name} (${updatedUser.username})`);

        return res.json({
          success: true,
          data: updatedUser,
          message: 'User updated successfully'
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

    // DELETE /api/users-supabase - Delete user
    if (req.method === 'DELETE') {
      const userId = req.query.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for deletion'
        });
      }

      try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError || !existingUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Instead of hard delete, soft delete by setting status to 'inactive'
        const { data: deletedUser, error } = await supabase
          .from('users')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error deleting user:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            details: error.message
          });
        }

        console.log(`✅ Soft deleted user: ${deletedUser.name} (${deletedUser.username})`);

        return res.json({
          success: true,
          data: deletedUser,
          message: 'User deactivated successfully'
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