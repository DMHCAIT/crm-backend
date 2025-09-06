// Real-tmodule.exports = async (req, res) => {
  // Set CORS headers for production domain
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [leadsCount, studentsCount, communicationsCount, paymentsSum] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('communications').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('amount').eq('status', 'completed')
    ]);

    const totalRevenue = paymentsSum.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get lead sources breakdown
    const { data: leadSources } = await supabase
      .from('leads')
      .select('source')
      .order('created_at', { ascending: false })
      .limit(100);

    const sourceBreakdown = leadSources?.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        summary: {
          leads: leadsCount.count || 0,
          students: studentsCount.count || 0,
          communications: communicationsCount.count || 0,
          revenue: totalRevenue
        },
        recentActivity: recentActivity || [],
        leadSources: sourceBreakdown,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
};
