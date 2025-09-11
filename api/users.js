// Simple users API with fallback data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
