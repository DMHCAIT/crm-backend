// User Activity Stats API
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';

let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
} catch (e) {
  console.error('user-activity-stats: Supabase init failed:', e.message);
}

function verifyToken(req) {
  try {
    const auth = req.headers['authorization'];
    if (!auth) return null;
    const token = auth.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const allowedOrigins = [
    'https://www.crmdmhca.com',
    'https://crmdmhca.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

  if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, name, role, email')
      .order('username');

    if (usersError) throw usersError;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const userStats = await Promise.all(
      (users || []).map(async (u) => {
        const username = u.username;

        const [
          { count: totalLeads },
          { count: updatedToday },
          { count: updatedThisWeek },
          { count: updatedThisMonth },
          { count: hotLeads },
          { count: warmLeads },
          { count: enrolledLeads }
        ] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).gte('updatedAt', startOfToday.toISOString()),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).gte('updatedAt', startOfWeek.toISOString()),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).gte('updatedAt', startOfMonth.toISOString()),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).eq('status', 'Hot'),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).eq('status', 'Warm'),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assignedTo', username).eq('status', 'Enrolled')
        ]);

        return {
          userId: u.id,
          username,
          name: u.name || username,
          role: u.role || 'counselor',
          totalLeads: totalLeads || 0,
          updatedToday: updatedToday || 0,
          updatedThisWeek: updatedThisWeek || 0,
          updatedThisMonth: updatedThisMonth || 0,
          hotLeads: hotLeads || 0,
          warmLeads: warmLeads || 0,
          enrolledLeads: enrolledLeads || 0,
          totalRevenue: 0,
          estimatedRevenue: 0
        };
      })
    );

    return res.json({
      success: true,
      data: { userStats },
      count: userStats.length
    });
  } catch (err) {
    console.error('user-activity-stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user activity stats', message: err.message });
  }
};
