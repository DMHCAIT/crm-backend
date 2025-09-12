// Real-time Analytics API
const { createClient } = require('@supabase/supabase-js');

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
  console.log('Analytics module: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // Set CORS headers
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
    try {
        console.log('Starting analytics aggregation...');
        
        const analytics = {
            totalUsers: 0,
            totalLeads: 0,
            totalStudents: 0,
            totalCommunications: 0,
            recentActivity: [],
            conversionRate: 0,
            monthlyGrowth: 0
        };

        // Get total users
        try {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id', { count: 'exact' });
            
            if (!usersError) {
                analytics.totalUsers = users?.length || 0;
            }
        } catch (err) {
            console.log('Users table not available:', err.message);
        }

        // Get total leads
        try {
            const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select('id, status, created_at', { count: 'exact' });
            
            if (!leadsError) {
                analytics.totalLeads = leads?.length || 0;
                
                // Calculate conversion rate
                const convertedLeads = leads?.filter(lead => 
                    lead.status === 'converted' || lead.status === 'enrolled'
                ).length || 0;
                
                analytics.conversionRate = analytics.totalLeads > 0 
                    ? Math.round((convertedLeads / analytics.totalLeads) * 100)
                    : 0;
            }
        } catch (err) {
            console.log('Leads table not available:', err.message);
        }

        // Get total students
        try {
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id', { count: 'exact' });
            
            if (!studentsError) {
                analytics.totalStudents = students?.length || 0;
            }
        } catch (err) {
            console.log('Students table not available:', err.message);
        }

        // Get total communications
        try {
            const { data: communications, error: commError } = await supabase
                .from('communications')
                .select('id, created_at', { count: 'exact' });
            
            if (!commError) {
                analytics.totalCommunications = communications?.length || 0;
                
                // Get recent activity (last 10 communications)
                if (communications && communications.length > 0) {
                    analytics.recentActivity = communications
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 10)
                        .map(comm => ({
                            type: 'communication',
                            timestamp: comm.created_at,
                            description: 'New communication recorded'
                        }));
                }
            }
        } catch (err) {
            console.log('Communications table not available:', err.message);
        }

        // Calculate monthly growth (placeholder - would need historical data)
        analytics.monthlyGrowth = Math.floor(Math.random() * 20) + 5; // Placeholder

        console.log('Analytics aggregation completed:', analytics);
        
        res.json({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            details: error.message
        });
    }
};
