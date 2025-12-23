// Dashboard Summary API - Combines multiple endpoints into one
// Reduces network requests from 5-10 to 1

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set caching headers for better performance
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userEmail = userData.user.email;

    // Get user details
    const { data: userDetails, error: detailsError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (detailsError || !userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userDetails.id;
    const userRole = userDetails.role;

    // Parallel data fetching for better performance
    const [
      leadsResult,
      studentsResult,
      revenueResult,
      activitiesResult
    ] = await Promise.all([
      // Get leads summary
      supabase
        .from('leads')
        .select('id, status, source, created_at, updated_at, assigned_to, estimated_value, sale_price, company')
        .then(result => {
          if (result.error) return { data: [], error: result.error };
          const leads = result.data || [];
          
          // Calculate metrics
          const totalLeads = leads.length;
          const hotLeads = leads.filter(l => l.status === 'Hot').length;
          const warmLeads = leads.filter(l => l.status === 'Warm').length;
          const enrolledLeads = leads.filter(l => l.status === 'Enrolled').length;
          
          // Today's leads
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayLeads = leads.filter(l => new Date(l.created_at) >= today).length;
          
          // Revenue - use sale_price for enrolled leads
          const actualRevenue = leads
            .filter(l => l.status === 'Enrolled' && l.sale_price)
            .reduce((sum, l) => sum + (l.sale_price || 0), 0);
          
          const potentialRevenue = leads
            .filter(l => l.status !== 'Enrolled' && l.estimated_value)
            .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
          
          // By source
          const sourceBreakdown = leads.reduce((acc, l) => {
            acc[l.source] = (acc[l.source] || 0) + 1;
            return acc;
          }, {});
          
          // By company
          const companyBreakdown = leads.reduce((acc, l) => {
            acc[l.company] = (acc[l.company] || 0) + 1;
            return acc;
          }, {});
          
          return {
            data: {
              total: totalLeads,
              hot: hotLeads,
              warm: warmLeads,
              enrolled: enrolledLeads,
              todayLeads,
              actualRevenue,
              potentialRevenue,
              sourceBreakdown,
              companyBreakdown,
              recentLeads: leads.slice(0, 5) // Latest 5 for quick display
            },
            error: null
          };
        }),

      // Get students summary
      supabase
        .from('students')
        .select('id, status, created_at, course_start_date, course_end_date')
        .then(result => {
          if (result.error) return { data: {}, error: result.error };
          const students = result.data || [];
          
          const activeStudents = students.filter(s => s.status === 'Active').length;
          const completedStudents = students.filter(s => s.status === 'Completed').length;
          
          return {
            data: {
              total: students.length,
              active: activeStudents,
              completed: completedStudents
            },
            error: null
          };
        }),

      // Get revenue summary
      supabase
        .from('leads')
        .select('sale_price, estimated_value, status, company, created_at')
        .then(result => {
          if (result.error) return { data: {}, error: result.error };
          const leads = result.data || [];
          
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          
          const monthlyRevenue = leads
            .filter(l => l.status === 'Enrolled' && l.sale_price && new Date(l.created_at) >= thisMonth)
            .reduce((sum, l) => sum + (l.sale_price || 0), 0);
          
          return {
            data: {
              monthlyRevenue,
              totalRevenue: leads.filter(l => l.status === 'Enrolled').reduce((sum, l) => sum + (l.sale_price || 0), 0),
              pipeline: leads
                .filter(l => l.status !== 'Enrolled' && l.estimated_value)
                .reduce((sum, l) => sum + (l.estimated_value || 0), 0)
            },
            error: null
          };
        }),

      // Get recent activities
      supabase
        .from('lead_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(result => ({
          data: result.data || [],
          error: result.error
        }))
    ]);

    // Combine all data
    const dashboardSummary = {
      leads: leadsResult.data || {},
      students: studentsResult.data || {},
      revenue: revenueResult.data || {},
      recentActivities: activitiesResult.data || [],
      user: {
        id: userId,
        role: userRole,
        name: userDetails.name,
        email: userEmail
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(dashboardSummary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
