// Users API - Full CRUD operations
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Set CORS headers for production domain
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

  try {
    // Handle GET /profile - Get current user profile
    if (req.method === 'GET' && req.url?.includes('/profile')) {
      // In a real implementation, you would get user ID from JWT token
      // For now, return sample profile data
      const userProfile = {
        id: 'USR-2024-001',
        name: 'Demo User',
        email: 'demo@dmhca.in',
        phone: '+91 9876543210',
        role: 'Senior DMHCA Admissions Counselor',
        department: 'MBBS Admissions',
        location: 'New Delhi',
        joinDate: '2023-01-15',
        avatar: null,
        status: 'active',
        permissions: ['leads.view', 'leads.edit', 'students.view', 'communications.send'],
        preferences: {
          notifications: {
            email: true,
            whatsapp: true,
            sms: false,
            push: true
          },
          autoAssignment: true,
          followUpReminders: true,
          workingHours: {
            start: '09:00',
            end: '18:00'
          }
        }
      };

      return res.json({
        success: true,
        data: userProfile
      });
    }

    // Handle GET - Retrieve users
    if (req.method === 'GET') {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, created_at, updated_at, last_login')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.json({
        success: true,
        data: users || [],
        count: users?.length || 0
      });
    }

    // Handle POST - Create new user
    if (req.method === 'POST') {
      const { 
        name, 
        email, 
        password,
        role = 'user',
        status = 'active',
        phone,
        department
      } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          error: 'Name, email, and password are required' 
        });
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          phone,
          department
        }
      });

      if (authError) throw authError;

      // Create user record in users table
      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id,
          name,
          email,
          role,
          status,
          phone,
          department
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'user_created',
          description: `New user created: ${name}`,
          entity_type: 'user',
          entity_id: user.id,
          data: { role, email }
        }]);

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    }

    // Handle PUT - Update user
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Remove sensitive fields from update
      delete updateData.password;
      delete updateData.id;

      const { data: user, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'user_updated',
          description: `User updated: ${user.name}`,
          entity_type: 'user',
          entity_id: user.id,
          data: updateData
        }]);

      return res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    }

    // Handle DELETE - Delete user
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user info before deletion
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', id)
        .single();

      // Delete from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete from Supabase Auth
      try {
        await supabase.auth.admin.deleteUser(id);
      } catch (authError) {
        console.warn('Auth user deletion failed:', authError);
      }

      // Log activity
      if (user) {
        await supabase
          .from('activities')
          .insert([{
            type: 'user_deleted',
            description: `User deleted: ${user.name} (${user.email})`,
            entity_type: 'user',
            entity_id: id
          }]);
      }

      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
