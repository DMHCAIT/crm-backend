// 🚀 LEAD ACTIVITIES API - ACTIVITY TRACKING AND AUDIT TRAIL
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Lead Activities API: Supabase initialized');
  } else {
    console.log('❌ Lead Activities API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Lead Activities API: Supabase initialization failed:', error.message);
}

// Activity types
const ACTIVITY_TYPES = [
  'lead_created',
  'status_change',
  'assignment_change',
  'priority_change',
  'note_added',
  'note_updated',
  'note_deleted',
  'communication_sent',
  'communication_received',
  'meeting_scheduled',
  'meeting_completed',
  'follow_up_scheduled',
  'follow_up_completed',
  'score_updated',
  'qualification_updated',
  'course_changed',
  'contact_updated',
  'lead_converted',
  'lead_lost',
  'payment_received',
  'enrollment_completed',
  'manual_update',
  'bulk_update',
  'system_update'
];

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database connection not available',
        message: 'Supabase not initialized'
      });
    }

    // GET /api/lead-activities - Get activities
    if (req.method === 'GET') {
      const { 
        leadId, 
        activityType, 
        performedBy,
        limit = 50, 
        offset = 0,
        startDate,
        endDate 
      } = req.query;

      try {
        let query = supabase
          .from('lead_activities')
          .select(`
            id,
            lead_id,
            activity_type,
            description,
            old_value,
            new_value,
            performed_by,
            timestamp,
            created_at,
            leads:lead_id(fullName, name, email, status)
          `)
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1);

        // Apply filters
        if (leadId) {
          query = query.eq('lead_id', leadId);
        }

        if (activityType) {
          query = query.eq('activity_type', activityType);
        }

        if (performedBy) {
          query = query.eq('performed_by', performedBy);
        }

        if (startDate) {
          query = query.gte('timestamp', startDate);
        }

        if (endDate) {
          query = query.lte('timestamp', endDate);
        }

        const { data: activities, error } = await query;

        if (error) {
          console.error('❌ Error fetching activities:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch activities',
            details: error.message
          });
        }

        // Get activity statistics
        const { data: stats, error: statsError } = await supabase
          .from('lead_activities')
          .select('activity_type, performed_by', { count: 'exact' });

        let activityStats = {};
        if (!statsError && stats) {
          activityStats = stats.reduce((acc, activity) => {
            acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
            return acc;
          }, {});
        }

        return res.json({
          success: true,
          activities: activities || [],
          totalCount: activities?.length || 0,
          activityTypes: ACTIVITY_TYPES,
          stats: activityStats,
          message: `Found ${activities?.length || 0} activities`
        });

      } catch (error) {
        console.error('❌ Database error:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // POST /api/lead-activities - Create new activity
    if (req.method === 'POST') {
      const { 
        leadId, 
        activityType, 
        description,
        oldValue = null,
        newValue = null
      } = req.body;

      // Validate required fields
      if (!leadId || !activityType || !description) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID, activity type, and description are required'
        });
      }

      // Validate activity type
      if (!ACTIVITY_TYPES.includes(activityType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid activity type. Allowed types: ${ACTIVITY_TYPES.join(', ')}`
        });
      }

      try {
        // Check if lead exists
        const { data: leadExists, error: leadError } = await supabase
          .from('leads')
          .select('id, fullName, name')
          .eq('id', leadId)
          .single();

        if (leadError || !leadExists) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }

        // Create activity
        const activityData = {
          lead_id: leadId,
          activity_type: activityType,
          description: description.trim(),
          old_value: oldValue,
          new_value: newValue,
          performed_by: user.username || user.name || 'Unknown',
          timestamp: new Date().toISOString()
        };

        const { data: insertedActivity, error } = await supabase
          .from('lead_activities')
          .insert(activityData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating activity:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create activity',
            details: error.message
          });
        }

        console.log(`✅ Created activity for lead ${leadId}: ${activityType} by ${user.username}`);

        return res.json({
          success: true,
          data: {
            id: insertedActivity.id,
            leadId: insertedActivity.lead_id,
            activityType: insertedActivity.activity_type,
            description: insertedActivity.description,
            oldValue: insertedActivity.old_value,
            newValue: insertedActivity.new_value,
            performedBy: insertedActivity.performed_by,
            timestamp: insertedActivity.timestamp
          },
          message: 'Activity logged successfully'
        });

      } catch (error) {
        console.error('❌ Database error creating activity:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // DELETE /api/lead-activities - Delete activity (admin only)
    if (req.method === 'DELETE') {
      const { activityId } = req.query;

      if (!activityId) {
        return res.status(400).json({
          success: false,
          error: 'Activity ID is required'
        });
      }

      try {
        // Check if user has permission to delete activities (admin only)
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions to delete activities'
          });
        }

        // Get activity info before deletion for logging
        const { data: existingActivity } = await supabase
          .from('lead_activities')
          .select('lead_id, description, activity_type')
          .eq('id', activityId)
          .single();

        // Delete activity
        const { error } = await supabase
          .from('lead_activities')
          .delete()
          .eq('id', activityId);

        if (error) {
          console.error('❌ Error deleting activity:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete activity',
            details: error.message
          });
        }

        console.log(`✅ Deleted activity ${activityId} by ${user.username}`);

        // Log the deletion activity
        if (existingActivity) {
          try {
            await supabase
              .from('lead_activities')
              .insert({
                lead_id: existingActivity.lead_id,
                activity_type: 'system_update',
                description: `Activity deleted: ${existingActivity.activity_type} - ${existingActivity.description.substring(0, 50)}...`,
                performed_by: user.username || 'Admin'
              });
          } catch (logError) {
            console.error('Error logging activity deletion:', logError);
          }
        }

        return res.json({
          success: true,
          message: 'Activity deleted successfully'
        });

      } catch (error) {
        console.error('❌ Database error deleting activity:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // GET /api/lead-activities/stats - Get activity statistics
    if (req.method === 'GET' && req.url.includes('/stats')) {
      try {
        // Get activity counts by type
        const { data: activityCounts, error: countsError } = await supabase
          .from('lead_activities')
          .select('activity_type')
          .then(({ data, error }) => {
            if (error) throw error;
            const counts = {};
            data.forEach(activity => {
              counts[activity.activity_type] = (counts[activity.activity_type] || 0) + 1;
            });
            return { data: counts, error: null };
          });

        // Get recent activities
        const { data: recentActivities, error: recentError } = await supabase
          .from('lead_activities')
          .select(`
            id,
            activity_type,
            description,
            performed_by,
            timestamp,
            leads:lead_id(fullName, name, email)
          `)
          .order('timestamp', { ascending: false })
          .limit(10);

        // Get most active users
        const { data: activeUsers, error: usersError } = await supabase
          .from('lead_activities')
          .select('performed_by')
          .then(({ data, error }) => {
            if (error) throw error;
            const userCounts = {};
            data.forEach(activity => {
              userCounts[activity.performed_by] = (userCounts[activity.performed_by] || 0) + 1;
            });
            return { 
              data: Object.entries(userCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([user, count]) => ({ user, count })),
              error: null 
            };
          });

        return res.json({
          success: true,
          stats: {
            activityCounts: activityCounts || {},
            recentActivities: recentActivities || [],
            activeUsers: activeUsers || []
          },
          message: 'Activity statistics retrieved successfully'
        });

      } catch (error) {
        console.error('❌ Error fetching activity stats:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch activity statistics',
          details: error.message
        });
      }
    }

    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};