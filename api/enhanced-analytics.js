// Enhanced Analytics API with Events and Campaign Management
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

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

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

// Get all subordinate users (same as in leads.js and dashboard.js)
async function getSubordinateUsers(userId) {
  if (!supabase) return [];
  
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, email, name, reports_to, role');
    
    if (error) {
      console.error('Error fetching users for hierarchy:', error);
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
    console.error('Error getting subordinate users:', error);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Parse URL to determine endpoint (remove query parameters)
    const urlWithoutQuery = req.url.split('?')[0];
    
    // Extract endpoint after /api/analytics/ or /api/enhanced-analytics/
    let endpoint = urlWithoutQuery.replace(/^\/api\/(enhanced-)?analytics\//, '');
    
    // If no specific endpoint, default to the full path for debugging
    if (!endpoint) {
      endpoint = urlWithoutQuery;
    }

    console.log(`📊 Enhanced Analytics - Raw URL: ${req.url}`);
    console.log(`📊 Enhanced Analytics - URL without query: ${urlWithoutQuery}`);
    console.log(`📊 Enhanced Analytics - Extracted endpoint: ${endpoint}`);

    // Show debug info for any request
    console.log(`🔍 DEBUG - Final endpoint value: "${endpoint}"`);
    console.log(`🔍 DEBUG - Endpoint === 'realtime': ${endpoint === 'realtime'}`);
    console.log(`🔍 DEBUG - Endpoint === 'test': ${endpoint === 'test'}`);

    switch (endpoint) {
      case 'realtime':
        await handleRealtimeAnalytics(req, res);
        break;
      case 'test':
        res.status(200).json({ 
          success: true, 
          message: 'Analytics handler is working', 
          debug: {
            originalUrl: req.url,
            extractedEndpoint: endpoint,
            endpointLength: endpoint.length,
            endpointType: typeof endpoint,
            endpointEqualsRealtime: endpoint === 'realtime',
            endpointEqualsTest: endpoint === 'test'
          }
        });
        break;
      case 'analytics/events':
        await handleEvents(req, res);
        break;
      case 'analytics/dashboard/campaigns':
        await handleCampaigns(req, res);
        break;
      case 'analytics/dashboard/stats':
        await handleDashboardStats(req, res);
        break;
      case 'analytics/realtime':
        await handleRealtimeAnalytics(req, res);
        break;
      default:
        // Return debug info for unmatched endpoints
        res.status(404).json({ 
          error: 'Analytics endpoint not found',
          debug: {
            originalUrl: req.url,
            extractedEndpoint: endpoint,
            endpointLength: endpoint.length,
            endpointType: typeof endpoint,
            endpointBytes: [...endpoint].map(c => c.charCodeAt(0)),
            availableEndpoints: ['realtime', 'test', 'analytics/events', 'analytics/dashboard/campaigns', 'analytics/dashboard/stats'],
            fallback: req.url.includes('realtime') ? 'Would trigger realtime fallback' : 'No fallback available'
          }
        });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Events Analytics Handler
async function handleEvents(req, res) {
  try {
    const user = verifyToken(req);

    switch (req.method) {
      case 'GET':
        await getEvents(req, res, user);
        break;
      case 'POST':
        await createEvent(req, res, user);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

async function getEvents(req, res, user) {
  try {
    const { 
      startDate, 
      endDate, 
      eventType, 
      userId,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('analytics_events')
      .select(`
        *,
        user:user_id(name, email),
        lead:lead_id(fullName, email),
        student:student_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Get event statistics
    const { data: stats, error: statsError } = await supabase
      .from('analytics_events')
      .select('event_type, count(*)')
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .group('event_type');

    res.json({
      success: true,
      events: events || [],
      stats: stats || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: events?.length || 0
      }
    });
  } catch (error) {
    throw error;
  }
}

async function createEvent(req, res, user) {
  try {
    const {
      event_type,
      event_data,
      lead_id,
      student_id,
      metadata
    } = req.body;

    if (!event_type) {
      return res.status(400).json({
        success: false,
        error: 'event_type is required'
      });
    }

    const { data: event, error } = await supabase
      .from('analytics_events')
      .insert([{
        event_type,
        event_data: event_data || {},
        user_id: user.id,
        lead_id: lead_id || null,
        student_id: student_id || null,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Event recorded successfully',
      event
    });
  } catch (error) {
    throw error;
  }
}

// Campaigns Handler
async function handleCampaigns(req, res) {
  try {
    const user = verifyToken(req);

    switch (req.method) {
      case 'GET':
        await getCampaigns(req, res, user);
        break;
      case 'POST':
        await createCampaign(req, res, user);
        break;
      case 'PUT':
        await updateCampaign(req, res, user);
        break;
      case 'DELETE':
        await deleteCampaign(req, res, user);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

async function getCampaigns(req, res, user) {
  try {
    const { status, type, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        created_by:created_by_id(name, email),
        analytics_events!campaign_id(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('campaign_type', type);
    }

    const { data: campaigns, error } = await query;

    if (error) throw error;

    // Calculate campaign metrics
    const campaignsWithMetrics = await Promise.all(campaigns.map(async (campaign) => {
      const { data: metrics } = await supabase
        .from('analytics_events')
        .select('event_type, count(*)')
        .eq('campaign_id', campaign.id)
        .in('event_type', ['email_sent', 'email_opened', 'link_clicked', 'conversion']);

      return {
        ...campaign,
        metrics: metrics || []
      };
    }));

    res.json({
      success: true,
      campaigns: campaignsWithMetrics,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    throw error;
  }
}

async function createCampaign(req, res, user) {
  try {
    const {
      name,
      campaign_type,
      target_audience,
      content,
      schedule_date,
      settings
    } = req.body;

    if (!name || !campaign_type) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and type are required'
      });
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        name,
        campaign_type,
        target_audience: target_audience || {},
        content: content || {},
        schedule_date,
        settings: settings || {},
        status: 'draft',
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    throw error;
  }
}

async function updateCampaign(req, res, user) {
  try {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    throw error;
  }
}

async function deleteCampaign(req, res, user) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    throw error;
  }
}

// Dashboard Stats Handler
async function handleDashboardStats(req, res) {
  try {
    const user = verifyToken(req);
    
    // Get comprehensive dashboard statistics
    const [
      leadStats,
      studentStats,
      conversionStats,
      recentActivity
    ] = await Promise.all([
      getLeadStats(),
      getStudentStats(),
      getConversionStats(),
      getRecentActivity()
    ]);

    res.json({
      success: true,
      stats: {
        leads: leadStats,
        students: studentStats,
        conversions: conversionStats,
        recentActivity
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Realtime Analytics Handler - COMPREHENSIVE REAL DATA ANALYTICS
async function handleRealtimeAnalytics(req, res) {
  try {
    console.log('📊 handleRealtimeAnalytics called - Processing real-time analytics');
    
    // Verify authentication for hierarchical access control
    const user = verifyToken(req);
    console.log(`📊 Analytics requested by user ${user.email} (${user.role})`);
    
    // Get subordinate users for hierarchical filtering
    const subordinates = await getSubordinateUsers(user.id);
    const accessibleUserIds = [user.id, ...subordinates];
    
    console.log(`🏢 Analytics: User ${user.email} can access data for ${accessibleUserIds.length} users (self + ${subordinates.length} subordinates)`);
    
    // Get comprehensive real data from all tables
    const timeframe = req.query.timeframe || 'month';
    console.log(`📊 Analytics timeframe: ${timeframe}`);
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 1. GET REAL LEADS DATA WITH HIERARCHICAL FILTERING
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .gte('created_at', startDate.toISOString());
    
    // Apply hierarchical filtering - Super admins can see all leads
    if (user.role !== 'super_admin') {
      leadsQuery = leadsQuery.or(`assignedTo.in.(${accessibleUserIds.join(',')}),assignedcounselor.in.(${accessibleUserIds.join(',')}),assigned_to.in.(${accessibleUserIds.join(',')})`);
    }
    
    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Leads query error:', leadsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch leads data' });
    }

    // 2. GET REAL STUDENTS DATA
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (studentsError) {
      console.error('Students query error:', studentsError);
    }

    // 3. GET REAL COMMUNICATIONS DATA
    const { data: communications, error: commError } = await supabase
      .from('communications')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (commError) {
      console.error('Communications query error:', commError);
    }

    // 4. GET REAL PAYMENTS DATA
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (paymentsError) {
      console.error('Payments query error:', paymentsError);
    }

    // 5. CALCULATE REAL METRICS FROM ACTUAL DATA
    const totalLeads = leads?.length || 0;
    const totalStudents = students?.length || 0;
    const totalCommunications = communications?.length || 0;
    
    // Lead status distribution from real data
    const leadsByStatus = {};
    leads?.forEach(lead => {
      const status = lead.status || 'unknown';
      leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
    });

    // Lead source distribution from real data
    const leadsBySource = {};
    leads?.forEach(lead => {
      const source = lead.source || 'unknown';
      leadsBySource[source] = (leadsBySource[source] || 0) + 1;
    });

    // Student status distribution from real data
    const studentsByStatus = {};
    students?.forEach(student => {
      const status = student.status || 'unknown';
      studentsByStatus[status] = (studentsByStatus[status] || 0) + 1;
    });

    // Calculate real conversion rate
    const enrolledLeads = leadsByStatus['enrolled'] || 0;
    const conversionRate = totalLeads > 0 ? ((enrolledLeads / totalLeads) * 100).toFixed(2) : '0.00';

    // Calculate real revenue from payments
    const totalRevenue = payments?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0) || 0;

    // Average response time calculation from communications
    const avgResponseTime = communications?.length > 0 
      ? Math.round(communications.length / totalLeads * 24) || 24 
      : 24; // hours

    // Build comprehensive analytics response
    const analyticsData = {
      success: true,
      timeframe,
      summary: {
        totalLeads,
        totalStudents,
        totalCommunications,
        totalRevenue: totalRevenue.toFixed(2),
        conversionRate: `${conversionRate}%`,
        averageResponseTime: `${avgResponseTime}h`
      },
      leadMetrics: {
        total: totalLeads,
        byStatus: leadsByStatus,
        bySource: leadsBySource,
        statusBreakdown: Object.keys(leadsByStatus).map(status => ({
          status,
          count: leadsByStatus[status],
          percentage: totalLeads > 0 ? ((leadsByStatus[status] / totalLeads) * 100).toFixed(1) : '0.0'
        })),
        sourceBreakdown: Object.keys(leadsBySource).map(source => ({
          source,
          count: leadsBySource[source],
          percentage: totalLeads > 0 ? ((leadsBySource[source] / totalLeads) * 100).toFixed(1) : '0.0'
        }))
      },
      studentMetrics: {
        total: totalStudents,
        byStatus: studentsByStatus,
        statusBreakdown: Object.keys(studentsByStatus).map(status => ({
          status,
          count: studentsByStatus[status],
          percentage: totalStudents > 0 ? ((studentsByStatus[status] / totalStudents) * 100).toFixed(1) : '0.0'
        }))
      },
      communicationMetrics: {
        total: totalCommunications,
        averagePerLead: totalLeads > 0 ? (totalCommunications / totalLeads).toFixed(2) : '0.00'
      },
      revenueMetrics: {
        total: totalRevenue.toFixed(2),
        currency: 'INR',
        averagePerStudent: totalStudents > 0 ? (totalRevenue / totalStudents).toFixed(2) : '0.00'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(analyticsData);

  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper functions
async function getLeadStats() {
  const { data, error } = await supabase
    .from('leads')
    .select('status, createdAt')
    .gte('createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (error) return { total: 0, byStatus: {} };
  
  const byStatus = data.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  
  return { total: data.length, byStatus };
}

async function getStudentStats() {
  const { data, error } = await supabase
    .from('students')
    .select('status, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (error) return { total: 0, byStatus: {} };
  
  const byStatus = data.reduce((acc, student) => {
    acc[student.status] = (acc[student.status] || 0) + 1;
    return acc;
  }, {});
  
  return { total: data.length, byStatus };
}

async function getConversionStats() {
  // Calculate lead to student conversion rate
  const { data: conversions, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('event_type', 'lead_converted')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  return {
    conversions: conversions?.length || 0,
    rate: 0 // Calculate based on leads vs conversions
  };
}

async function getRecentActivity() {
  const { data, error } = await supabase
    .from('analytics_events')
    .select(`
      *,
      user:user_id(name),
      lead:lead_id(fullName),
      student:student_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return data || [];
}

function groupEventsByHour(events) {
  const hourGroups = {};
  events.forEach(event => {
    const hour = new Date(event.created_at).getHours();
    hourGroups[hour] = (hourGroups[hour] || 0) + 1;
  });
  return hourGroups;
}

function getTopEvents(events) {
  const eventCounts = {};
  events.forEach(event => {
    eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
  });
  return Object.entries(eventCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
}