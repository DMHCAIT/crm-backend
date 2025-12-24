// Dashboard Stats API with Hierarchical Access Control
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');
const { measureQuery, QueryPatterns } = require('../utils/queryOptimizer');


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

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
  logger.info('Dashboard module: Supabase initialization failed:', error.message);
}

// JWT verification function
function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

// Get all subordinate users (same as in leads.js)
async function getSubordinateUsers(userId) {
  if (!supabase) return [];
  
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, email, name, reports_to, role');
    
    if (error) {
      logger.error('Error fetching users for hierarchy:', error);
      return [];
    }
    
    const subordinates = [];
    const visited = new Set();
    
    function findSubordinates(supervisorId) {
      if (visited.has(supervisorId)) return;
      visited.add(supervisorId);
      
      allUsers.forEach(user => {
        if (user.reports_to === supervisorId && !subordinates.includes(user.id)) {
          subordinates.push(user.id);
          findSubordinates(user.id);
        }
      });
    }
    
    findSubordinates(userId);
    return subordinates;
    
  } catch (error) {
    logger.error('Error getting subordinate users:', error);
    return [];
  }
}

// Get all subordinate usernames (username-only approach)
async function getSubordinateUsernames(userId) {
  if (!supabase) return [];
  
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, username, reports_to');
    
    if (error) {
      logger.error('Error fetching users for hierarchy:', error);
      return [];
    }
    
    const subordinateUsernames = [];
    const visited = new Set();
    
    function findSubordinates(supervisorId) {
      if (visited.has(supervisorId)) return;
      visited.add(supervisorId);
      
      allUsers.forEach(user => {
        if (user.reports_to === supervisorId && user.username) {
          if (!subordinateUsernames.includes(user.username)) {
            subordinateUsernames.push(user.username);
          }
          findSubordinates(user.id);
        }
      });
    }
    
    findSubordinates(userId);
    return subordinateUsernames;
    
  } catch (error) {
    logger.error('Error getting subordinate usernames:', error);
    return [];
  }
}

module.exports = async (req, res) => {
    // Set CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
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
    // Verify authentication
    const user = verifyToken(req);
    logger.info(`📊 Dashboard data requested by user ${user.email} (${user.role})`);

    // Try to get from cache first
    const cacheKey = cacheService.generateKey('dashboard', 'stats', user.userId);
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.info('Serving dashboard from cache');
      return res.status(200).json(cachedData);
    }

    // Get subordinate users for hierarchical filtering
    const subordinates = await measureQuery('getSubordinateUsers', () => 
      getSubordinateUsers(user.id)
    );
    const accessibleUserIds = [user.id, ...subordinates];
    
    logger.info(`🏢 User ${user.email} can access data for ${accessibleUserIds.length} users (self + ${subordinates.length} subordinates)`);

    // Get dashboard statistics with hierarchical filtering
    let leadsResult, studentsResult, communicationsResult, documentsResult;
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Apply hierarchical filtering to leads and other data - OVERRIDE SUPABASE 1000 DEFAULT LIMIT
    let leadsQuery = supabase.from('leads').select('id, status, assignedTo, assignedcounselor, assigned_to, created_at', { count: 'exact' }).limit(50000);
    // Override Supabase default 1000 limit - fetch up to 50,000 records
    
    // Username-only filtering approach with DEBUGGING
    if (user.role !== 'super_admin') {
      // Get subordinate usernames for hierarchical access
      const subordinateUsernames = await getSubordinateUsernames(user.id);
      const accessibleUsernames = [user.username, ...subordinateUsernames].filter(Boolean);
      
      logger.info(`🔍 Dashboard Stats: User ${user.username} (${user.email}) accessing dashboard`);
      logger.info(`🔍 Dashboard Stats: Accessible usernames: [${accessibleUsernames.join(', ')}]`);
      
      if (accessibleUsernames.length > 0) {
        leadsQuery = leadsQuery.or(`assigned_to.in.(${accessibleUsernames.join(',')}),assignedTo.in.(${accessibleUsernames.join(',')}),assignedcounselor.in.(${accessibleUsernames.join(',')})`);
        logger.info(`🔍 Dashboard Stats: Applied username filter for leads`);
      }
    } else {
      logger.info(`🔍 Dashboard Stats: Super admin ${user.username} accessing all leads`);
    }
    
    [leadsResult, studentsResult, communicationsResult, documentsResult] = await Promise.all([
      leadsQuery,
      supabase.from('students').select('id, status', { count: 'exact' }),
      supabase.from('communications').select('id', { count: 'exact' }),
      supabase.from('documents').select('id', { count: 'exact' })
    ]);

    // Calculate lead statistics
    const totalLeads = leadsResult.count || 0;
    const activeLeads = leadsResult.data?.filter(lead => 
      ['Hot', 'Follow Up', 'Warm', 'Fresh'].includes(lead.status)
    ).length || 0;
    const hotLeads = leadsResult.data?.filter(lead => 
      lead.status === 'Hot'
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
      lead.status === 'Enrolled'
    ).length || 0;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Get today's date for filtering
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    
    // Get recent leads (last 7 days) with proper filtering
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let recentLeadsQuery = supabase
      .from('leads')
      .select('id, assignedTo, assignedcounselor, assigned_to')
      .gte('created_at', sevenDaysAgo);
    
    // Get leads updated today with user-specific filtering
    let updatedTodayQuery = supabase
      .from('leads')
      .select('id, assignedTo, assignedcounselor, assigned_to, updated_at')
      .gte('updated_at', todayStart)
      .lt('updated_at', todayEnd);
    
    // Apply same username-only filtering as main leads query
    if (user.role !== 'super_admin') {
      const subordinateUsernames = await getSubordinateUsernames(user.id);
      const accessibleUsernames = [user.username, ...subordinateUsernames].filter(Boolean);
      
      logger.info(`🔍 Dashboard Stats: Filtering recent activity for usernames: [${accessibleUsernames.join(', ')}]`);
      
      if (accessibleUsernames.length > 0) {
        const usernameFilter = `assigned_to.in.(${accessibleUsernames.join(',')}),assignedTo.in.(${accessibleUsernames.join(',')}),assignedcounselor.in.(${accessibleUsernames.join(',')})`;
        recentLeadsQuery = recentLeadsQuery.or(usernameFilter);
        updatedTodayQuery = updatedTodayQuery.or(usernameFilter);
        logger.info(`🔍 Dashboard Stats: Applied user-specific filtering for recent activity`);
      }
    } else {
      logger.info(`🔍 Dashboard Stats: Super admin accessing all recent activity`);
    }
    
    const [recentLeadsResult, updatedTodayResult] = await Promise.all([
      recentLeadsQuery,
      updatedTodayQuery
    ]);

    const newLeadsThisWeek = recentLeadsResult.data?.length || 0;
    const leadsUpdatedToday = updatedTodayResult.data?.length || 0;
    
    logger.info(`📊 Dashboard Stats for ${user.username}: ${totalLeads} total leads, ${newLeadsThisWeek} new this week, ${leadsUpdatedToday} updated today`);

    const stats = {
      totalLeads,
      activeLeads,
      hotLeads,
      newLeadsThisWeek,
      leadsUpdatedToday,
      totalStudents,
      activeStudents,
      totalCommunications,
      totalDocuments,
      conversionRate: parseFloat(conversionRate),
      responseTime: '2.4h', // This could be calculated from communications data
      lastUpdated: new Date().toISOString(),
      userSpecific: {
        username: user.username,
        role: user.role,
        isUserSpecificData: user.role !== 'super_admin'
      }
    };

    // Cache the dashboard stats for 5 minutes
    await cacheService.set(cacheKey, { success: true, data: stats }, 300);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
};
