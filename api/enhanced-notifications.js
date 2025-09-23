// Enhanced Notifications System API with Real-time Alerts
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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
  console.log('Notifications module: Supabase initialization failed:', error.message);
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
    // Parse URL to determine action
    const urlParts = req.url.split('/').filter(part => part);
    const action = urlParts[urlParts.length - 1];
    const id = urlParts[urlParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (action === 'unread-count') {
          await handleGetUnreadCount(req, res);
        } else if (action === 'preferences') {
          await handleGetPreferences(req, res);
        } else {
          await handleGetNotifications(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'broadcast') {
          await handleBroadcastNotification(req, res);
        } else if (action === 'mark-all-read') {
          await handleMarkAllRead(req, res);
        } else if (action === 'test') {
          await handleTestNotification(req, res);
        } else {
          await handleCreateNotification(req, res);
        }
        break;
      
      case 'PUT':
        if (action === 'read') {
          const notificationId = urlParts[urlParts.length - 2];
          await handleMarkAsRead(req, res, notificationId);
        } else if (action === 'preferences') {
          await handleUpdatePreferences(req, res);
        } else {
          await handleUpdateNotification(req, res, id);
        }
        break;
      
      case 'DELETE':
        if (action === 'clear-all') {
          await handleClearAllNotifications(req, res);
        } else {
          await handleDeleteNotification(req, res, id);
        }
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get notifications for user
async function handleGetNotifications(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      is_read,
      type,
      priority,
      limit = 50,
      offset = 0,
      include_expired = false
    } = req.query;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        created_by:created_by_id(name, email)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (is_read !== undefined) query = query.eq('is_read', is_read === 'true');
    if (type) query = query.eq('type', type);
    if (priority) query = query.eq('priority', priority);
    
    // Filter out expired notifications by default
    if (!include_expired || include_expired === 'false') {
      query = query.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Mark notifications as delivered if they haven't been
    const undeliveredIds = notifications
      ?.filter(n => !n.delivered_at)
      ?.map(n => n.id) || [];

    if (undeliveredIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ 
          delivered_at: new Date().toISOString(),
          status: 'delivered'
        })
        .in('id', undeliveredIds);
    }

    res.json({
      success: true,
      notifications: notifications || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: notifications?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create single notification
async function handleCreateNotification(req, res) {
  try {
    const user = verifyToken(req);
    const {
      title,
      message,
      type = 'info',
      user_id,
      lead_id,
      student_id,
      action_url,
      action_label,
      priority = 'normal',
      metadata = {},
      expires_at,
      send_email = false,
      send_push = false
    } = req.body;

    if (!title || !message || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Title, message, and user_id are required'
      });
    }

    // Validate notification type
    const validTypes = ['info', 'success', 'warning', 'error', 'reminder'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        title,
        message,
        type,
        user_id,
        lead_id: lead_id || null,
        student_id: student_id || null,
        action_url: action_url || null,
        action_label: action_label || null,
        priority,
        metadata,
        expires_at: expires_at || null,
        status: 'pending',
        is_read: false,
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        lead:lead_id(fullName, email),
        student:student_id(name, email),
        recipient:user_id(name, email)
      `)
      .single();

    if (error) throw error;

    // Send additional notifications if requested
    if (send_email) {
      await sendEmailNotification(notification);
    }

    if (send_push) {
      await sendPushNotification(notification);
    }

    res.json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Broadcast notification to multiple users
async function handleBroadcastNotification(req, res) {
  try {
    const user = verifyToken(req);
    const {
      title,
      message,
      type = 'info',
      user_ids = [],
      all_users = false,
      role_filter,
      priority = 'normal',
      metadata = {},
      expires_at,
      send_email = false,
      send_push = false
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    let targetUserIds = user_ids;

    // Get all users if broadcast to all
    if (all_users) {
      let userQuery = supabase.from('users').select('id');
      
      if (role_filter) {
        userQuery = userQuery.eq('role', role_filter);
      }

      const { data: allUsers, error: usersError } = await userQuery;
      
      if (usersError) throw usersError;
      
      targetUserIds = allUsers?.map(u => u.id) || [];
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No target users specified'
      });
    }

    // Create notifications for all target users
    const notifications = targetUserIds.map(userId => ({
      title,
      message,
      type,
      user_id: userId,
      priority,
      metadata: { ...metadata, broadcast: true, broadcast_id: uuidv4() },
      expires_at: expires_at || null,
      status: 'pending',
      is_read: false,
      created_by_id: user.id,
      created_at: new Date().toISOString()
    }));

    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select(`
        *,
        recipient:user_id(name, email)
      `);

    if (error) throw error;

    // Send additional notifications if requested
    if (send_email || send_push) {
      for (const notification of createdNotifications || []) {
        if (send_email) {
          await sendEmailNotification(notification);
        }
        if (send_push) {
          await sendPushNotification(notification);
        }
      }
    }

    res.json({
      success: true,
      message: `Notification broadcast to ${targetUserIds.length} users`,
      notifications: createdNotifications,
      broadcast_summary: {
        total_recipients: targetUserIds.length,
        broadcast_id: notifications[0]?.metadata?.broadcast_id
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Mark notification as read
async function handleMarkAsRead(req, res, notificationId) {
  try {
    const user = verifyToken(req);

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Mark as read
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        status: 'read'
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: updatedNotification
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Mark all notifications as read for user
async function handleMarkAllRead(req, res) {
  try {
    const user = verifyToken(req);

    const { data: updatedNotifications, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        status: 'read'
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: `Marked ${updatedNotifications?.length || 0} notifications as read`,
      updated_count: updatedNotifications?.length || 0
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get unread notification count
async function handleGetUnreadCount(req, res) {
  try {
    const user = verifyToken(req);

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, priority, type')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());

    if (error) throw error;

    const count = notifications?.length || 0;
    const byPriority = notifications?.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {}) || {};

    const byType = notifications?.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      unread_count: count,
      by_priority: byPriority,
      by_type: byType
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get user notification preferences
async function handleGetPreferences(req, res) {
  try {
    const user = verifyToken(req);

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Not found is OK

    // Return default preferences if none exist
    const defaultPreferences = {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      notification_types: {
        lead_assigned: true,
        payment_received: true,
        document_uploaded: true,
        system_alerts: true,
        reminders: true
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00'
      }
    };

    res.json({
      success: true,
      preferences: preferences || defaultPreferences
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Update notification preferences
async function handleUpdatePreferences(req, res) {
  try {
    const user = verifyToken(req);
    const {
      email_notifications,
      push_notifications,
      sms_notifications,
      notification_types,
      quiet_hours
    } = req.body;

    const preferencesData = {
      user_id: user.id,
      email_notifications: email_notifications !== undefined ? email_notifications : true,
      push_notifications: push_notifications !== undefined ? push_notifications : true,
      sms_notifications: sms_notifications !== undefined ? sms_notifications : false,
      notification_types: notification_types || {},
      quiet_hours: quiet_hours || { enabled: false },
      updated_at: new Date().toISOString()
    };

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .upsert(preferencesData)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Delete notification
async function handleDeleteNotification(req, res, notificationId) {
  try {
    const user = verifyToken(req);

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Clear all notifications for user
async function handleClearAllNotifications(req, res) {
  try {
    const user = verifyToken(req);
    const { read_only = false } = req.query;

    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (read_only === 'true') {
      query = query.eq('is_read', true);
    }

    const { data: deletedNotifications, error } = await query.select();

    if (error) throw error;

    res.json({
      success: true,
      message: `Cleared ${deletedNotifications?.length || 0} notifications`,
      deleted_count: deletedNotifications?.length || 0
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Test notification (for development/debugging)
async function handleTestNotification(req, res) {
  try {
    const user = verifyToken(req);
    const { notification_type = 'info' } = req.body;

    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      type: notification_type,
      user_id: user.id,
      priority: 'normal',
      metadata: { test: true, created_by: 'test_endpoint' },
      is_read: false,
      created_by_id: user.id,
      created_at: new Date().toISOString()
    };

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Test notification created successfully',
      notification
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper functions for external notifications
async function sendEmailNotification(notification) {
  try {
    // Implement email notification logic
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Email notification sent:', notification.title);
    
    // Update notification status
    await supabase
      .from('notifications')
      .update({ 
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    return { success: true };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return { success: false, error: error.message };
  }
}

async function sendPushNotification(notification) {
  try {
    // Implement push notification logic
    // This would integrate with FCM, APNS, or other push services
    console.log('Push notification sent:', notification.title);
    
    // Update notification status
    await supabase
      .from('notifications')
      .update({ 
        push_sent: true,
        push_sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    return { success: true };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { success: false, error: error.message };
  }
}

// Cleanup expired notifications (can be called via cron job)
async function cleanupExpiredNotifications() {
  try {
    const { data: expiredNotifications, error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;

    console.log(`Cleaned up ${expiredNotifications?.length || 0} expired notifications`);
    return expiredNotifications?.length || 0;
  } catch (error) {
    console.error('Failed to cleanup expired notifications:', error);
    return 0;
  }
}