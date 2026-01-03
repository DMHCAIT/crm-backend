// 🔐 USER RESTRICTIONS API - Admin Control over Super Admins
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
    logger.info('✅ User Restrictions API: Supabase initialized');
  } else {
    logger.info('❌ User Restrictions API: Supabase credentials missing');
  }
} catch (error) {
  logger.info('❌ User Restrictions API: Supabase initialization failed:', error.message);
}

// Verify JWT token and get user
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
    res.setHeader('Access-Control-Allow-Origin', 'https://www.crmdmhca.com');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify Supabase connection
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    const user = verifyToken(req);
    
    // Only admins can manage user restrictions
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.',
        userRole: user.role
      });
    }

    const adminId = user.userId;

    // GET - List all restrictions for this admin
    if (req.method === 'GET') {
      const { data: restrictions, error } = await supabase
        .from('user_restrictions')
        .select(`
          id,
          restricted_user_id,
          restriction_type,
          restriction_scope,
          notes,
          created_at,
          updated_at,
          is_active,
          users!user_restrictions_restricted_user_id_fkey (
            id,
            fullName,
            username,
            email,
            role,
            department,
            location
          )
        `)
        .eq('admin_id', adminId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching restrictions:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch restrictions',
          details: error.message
        });
      }

      return res.json({
        success: true,
        data: restrictions || [],
        total: restrictions?.length || 0,
        message: 'User restrictions retrieved successfully'
      });
    }

    // POST - Create new restriction
    if (req.method === 'POST') {
      const {
        restricted_user_id,
        restriction_type,
        restriction_scope,
        notes
      } = req.body;

      if (!restricted_user_id) {
        return res.status(400).json({
          success: false,
          error: 'Restricted user ID is required'
        });
      }

      // Verify the restricted user exists and is super_admin
      const { data: restrictedUser, error: userError } = await supabase
        .from('users')
        .select('id, role, fullName, username')
        .eq('id', restricted_user_id)
        .single();

      if (userError || !restrictedUser) {
        return res.status(400).json({
          success: false,
          error: 'Restricted user not found'
        });
      }

      if (restrictedUser.role !== 'super_admin') {
        return res.status(400).json({
          success: false,
          error: 'Can only restrict super_admin users'
        });
      }

      const restrictionData = {
        admin_id: adminId,
        restricted_user_id,
        restricted_by: adminId,
        restriction_type: restriction_type || 'user_access',
        restriction_scope: restriction_scope || {},
        notes: notes || null,
        is_active: true
      };

      const { data: newRestriction, error } = await supabase
        .from('user_restrictions')
        .insert(restrictionData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({
            success: false,
            error: 'Restriction already exists for this user'
          });
        }
        
        logger.error('❌ Error creating restriction:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to create restriction',
          details: error.message
        });
      }

      logger.info(`✅ Admin ${user.username} restricted user ${restrictedUser.username}`);

      return res.json({
        success: true,
        data: newRestriction,
        message: `Successfully restricted ${restrictedUser.fullName}`
      });
    }

    // PUT - Update restriction
    if (req.method === 'PUT') {
      const { id } = req.query;
      const {
        restriction_type,
        restriction_scope,
        notes,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Restriction ID is required'
        });
      }

      const updateData = { updated_at: new Date().toISOString() };
      
      if (restriction_type !== undefined) updateData.restriction_type = restriction_type;
      if (restriction_scope !== undefined) updateData.restriction_scope = restriction_scope;
      if (notes !== undefined) updateData.notes = notes;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: updatedRestriction, error } = await supabase
        .from('user_restrictions')
        .update(updateData)
        .eq('id', id)
        .eq('admin_id', adminId) // Ensure admin owns this restriction
        .select()
        .single();

      if (error || !updatedRestriction) {
        return res.status(404).json({
          success: false,
          error: 'Restriction not found or access denied'
        });
      }

      return res.json({
        success: true,
        data: updatedRestriction,
        message: 'Restriction updated successfully'
      });
    }

    // DELETE - Remove restriction
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Restriction ID is required'
        });
      }

      // Soft delete by setting is_active to false
      const { data: deletedRestriction, error } = await supabase
        .from('user_restrictions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('admin_id', adminId) // Ensure admin owns this restriction
        .select()
        .single();

      if (error || !deletedRestriction) {
        return res.status(404).json({
          success: false,
          error: 'Restriction not found or access denied'
        });
      }

      return res.json({
        success: true,
        data: deletedRestriction,
        message: 'Restriction removed successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    logger.error('❌ User Restrictions API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};