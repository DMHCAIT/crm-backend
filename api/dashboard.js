// Dashboard Stats API
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
  console.log('Dashboard module: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // Set CORS headers for production domain
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get dashboard statistics
    const [
      leadsResult,
      studentsResult,
      communicationsResult,
      documentsResult
    ] = await Promise.all([
      supabase.from('leads').select('id, status', { count: 'exact' }),
      supabase.from('students').select('id, status', { count: 'exact' }),
      supabase.from('communications').select('id', { count: 'exact' }),
      supabase.from('documents').select('id', { count: 'exact' })
    ]);

    // Calculate lead statistics
    const totalLeads = leadsResult.count || 0;
    const activeLeads = leadsResult.data?.filter(lead => 
      ['new', 'contacted', 'qualified', 'proposal'].includes(lead.status)
    ).length || 0;

    // Calculate student statistics
    const totalStudents = studentsResult.count || 0;
    const activeStudents = studentsResult.data?.filter(student => 
      student.status === 'active'
    ).length || 0;

    // Recent activity count
    const totalCommunications = communicationsResult.count || 0;
    const totalDocuments = documentsResult.count || 0;

    // Calculate conversion rate
    const convertedLeads = leadsResult.data?.filter(lead => 
      lead.status === 'closed_won'
    ).length || 0;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Get recent leads (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id')
      .gte('created_at', sevenDaysAgo);

    const newLeadsThisWeek = recentLeads?.length || 0;

    const stats = {
      totalLeads,
      activeLeads,
      newLeadsThisWeek,
      totalStudents,
      activeStudents,
      totalCommunications,
      totalDocuments,
      conversionRate: parseFloat(conversionRate),
      responseTime: '2.4h', // This could be calculated from communications data
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
};
