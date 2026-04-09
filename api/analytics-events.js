// =====================================================
// ANALYTICS EVENTS API - Activity Tracking System
// Tracks all user interactions and system events
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');


// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Analytics Events API: Supabase initialized');
  }
} catch (error) {
  logger.info('❌ Analytics Events API: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

// Track event helper function
async function trackEvent(eventData) {
  if (!supabase) {
    logger.error('❌ Cannot track event: Supabase not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: eventData.type || eventData.event_type,
        user_id: eventData.userId || eventData.user_id,
        lead_id: eventData.leadId || eventData.lead_id,
        student_id: eventData.studentId || eventData.student_id,
        duration_seconds: eventData.duration || eventData.duration_seconds || 0,
        metadata: eventData.metadata || {},
        session_id: eventData.sessionId || eventData.session_id,
        ip_address: eventData.ipAddress || eventData.ip_address,
        user_agent: eventData.userAgent || eventData.user_agent,
        timestamp: eventData.timestamp || new Date().toISOString()
      })
      .select();

    if (error) {
      logger.error('❌ Error tracking event:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    logger.error('❌ Exception tracking event:', error);
    return null;
  }
}

// Get IP address from request
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

module.exports = async (req, res) => {
  // CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com',
    'https://crmdmhca.com',
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Verify authentication
    let userId;
    try {
      const decoded = verifyToken(req);
      userId = decoded.userId || decoded.id || decoded.sub;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid or missing token'
      });
    }

    const urlPath = req.url.split('?')[0];

    // =====================================================
    // POST /api/analytics-events - Track a new event
    // =====================================================
    if (req.method === 'POST' && urlPath === '/api/analytics-events') {
      const eventData = req.body;

      // Validate required fields
      if (!eventData.type && !eventData.event_type) {
        return res.status(400).json({
          success: false,
          error: 'Event type is required'
        });
      }

      // Enrich event data with request metadata
      const enrichedData = {
        ...eventData,
        userId: eventData.userId || userId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      const result = await trackEvent(enrichedData);

      if (!result) {
        return res.status(500).json({
          success: false,
          error: 'Failed to track event'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Event tracked successfully',
        data: result
      });
    }

    // =====================================================
    // POST /api/analytics-events/batch - Track multiple events
    // =====================================================
    if (req.method === 'POST' && urlPath === '/api/analytics-events/batch') {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Events array is required'
        });
      }

      // Track all events
      const results = await Promise.all(
        events.map(event => trackEvent({
          ...event,
          userId: event.userId || userId,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'unknown'
        }))
      );

      const successCount = results.filter(r => r !== null).length;

      return res.status(201).json({
        success: true,
        message: `${successCount} of ${events.length} events tracked successfully`,
        data: {
          total: events.length,
          successful: successCount,
          failed: events.length - successCount
        }
      });
    }

    // =====================================================
    // GET /api/analytics-events - Get events with filters
    // =====================================================
    if (req.method === 'GET' && urlPath === '/api/analytics-events') {
      const {
        event_type,
        user_id,
        lead_id,
        from_date,
        to_date,
        limit = 100,
        offset = 0
      } = req.query;

      let query = supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Apply filters
      if (event_type) {
        query = query.eq('event_type', event_type);
      }
      if (user_id) {
        query = query.eq('user_id', user_id);
      }
      if (lead_id) {
        query = query.eq('lead_id', lead_id);
      }
      if (from_date) {
        query = query.gte('timestamp', from_date);
      }
      if (to_date) {
        query = query.lte('timestamp', to_date);
      }

      // Pagination
      query = query.range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: (count || 0) > (parseInt(offset as string) + parseInt(limit as string))
        }
      });
    }

    // =====================================================
    // GET /api/analytics-events/summary - Get event statistics
    // =====================================================
    if (req.method === 'GET' && urlPath === '/api/analytics-events/summary') {
      const { days = 30 } = req.query;
      
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(days as string));

      // Get event counts by type
      const { data: eventCounts, error: countError } = await supabase
        .from('analytics_events')
        .select('event_type')
        .gte('timestamp', fromDate.toISOString());

      if (countError) throw countError;

      // Calculate statistics
      const eventStats: { [key: string]: number } = {};
      eventCounts?.forEach((event: any) => {
        eventStats[event.event_type] = (eventStats[event.event_type] || 0) + 1;
      });

      const totalEvents = eventCounts?.length || 0;
      const uniqueEventTypes = Object.keys(eventStats).length;

      return res.status(200).json({
        success: true,
        data: {
          totalEvents,
          uniqueEventTypes,
          eventsByType: eventStats,
          dateRange: {
            from: fromDate.toISOString(),
            to: new Date().toISOString(),
            days: parseInt(days as string)
          }
        }
      });
    }

    // =====================================================
    // GET /api/analytics-events/recent - Get recent activities
    // =====================================================
    if (req.method === 'GET' && urlPath === '/api/analytics-events/recent') {
      const { limit = 50 } = req.query;

      const { data, error } = await supabase
        .from('vw_recent_activities')
        .select('*')
        .limit(parseInt(limit as string));

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || []
      });
    }

    // =====================================================
    // GET /api/analytics-events/user-activity - User activity timeline
    // =====================================================
    if (req.method === 'GET' && urlPath.startsWith('/api/analytics-events/user-activity')) {
      const targetUserId = req.query.user_id || userId;
      const { days = 7, limit = 100 } = req.query;

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(days as string));

      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('timestamp', fromDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) throw error;

      // Group by date
      const activityByDate: { [key: string]: any[] } = {};
      data?.forEach((event: any) => {
        const date = event.timestamp.split('T')[0];
        if (!activityByDate[date]) {
          activityByDate[date] = [];
        }
        activityByDate[date].push(event);
      });

      return res.status(200).json({
        success: true,
        data: {
          events: data || [],
          byDate: activityByDate,
          stats: {
            totalEvents: data?.length || 0,
            activeDays: Object.keys(activityByDate).length,
            avgEventsPerDay: (data?.length || 0) / Math.max(Object.keys(activityByDate).length, 1)
          }
        }
      });
    }

    // Invalid endpoint
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });

  } catch (error: any) {
    logger.error('❌ Analytics Events API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

// Export trackEvent for use in other APIs
module.exports.trackEvent = trackEvent;
