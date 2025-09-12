// Simple users API with fallback data
const { createClient } = require('@supabase/supabase-js');

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

module.exports = async (req, res) => {
  // CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app',
    'https://crm-frontend-final.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle GET - Retrieve users
    if (req.method === 'GET') {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Return sample user data if table doesn't exist
          const sampleUsers = [
            {
              id: 'user-1',
              name: 'Santhosh DMHCA',
              email: 'santhosh@dmhca.in',
              role: 'admin',
              department: 'Admissions',
              status: 'active',
              created_at: new Date().toISOString()
            }
          ];

          return res.json({
            success: true,
            data: sampleUsers,
            count: sampleUsers.length,
            message: 'Using sample data - database tables need setup'
          });
        }

        return res.json({
          success: true,
          data: users || [],
          count: users?.length || 0
        });
      } catch (dbError) {
        // Return sample data as fallback
        const sampleUsers = [
          {
            id: 'user-1',
            name: 'Santhosh DMHCA',
            email: 'santhosh@dmhca.in',
            role: 'admin',
            department: 'Admissions',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ];

        return res.json({
          success: true,
          data: sampleUsers,
          count: sampleUsers.length,
          message: 'Using sample data - database tables need setup'
        });
      }
    }

    // Handle POST - Create new user
    if (req.method === 'POST') {
      const { name, email, phone, role = 'counselor', department, designation } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
      }

      try {
        const userData = {
          name,
          email,
          phone,
          role,
          department,
          designation,
          status: 'active',
          permissions: role === 'admin' ? ['*'] : ['read', 'write']
        };

        const { data: user, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create user'
          });
        }

        return res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: user
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during user creation'
        });
      }
    }

    // Handle PUT - Update user
    if (req.method === 'PUT') {
      const userId = req.query.id || req.params?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for update'
        });
      }

      const updateData = req.body;
      delete updateData.id;
      updateData.updated_at = new Date().toISOString();

      try {
        const { data: updatedUser, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          return res.status(404).json({
            success: false,
            error: 'User not found or update failed'
          });
        }

        return res.json({
          success: true,
          message: 'User updated successfully',
          data: updatedUser
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during update'
        });
      }
    }

    // Handle DELETE - Delete user
    if (req.method === 'DELETE') {
      const userId = req.query.id || req.params?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required for deletion'
        });
      }

      try {
        const { data: deletedUser, error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          return res.status(404).json({
            success: false,
            error: 'User not found or deletion failed'
          });
        }

        return res.json({
          success: true,
          message: 'User deleted successfully',
          data: deletedUser
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during deletion'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Please check database configuration'
    });
  }
};
