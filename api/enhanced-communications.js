// Enhanced Communications API with Advanced Messaging Features
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
  console.log('Communications module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  // CORS headers
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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

    switch (req.method) {
      case 'GET':
        if (action === 'templates') {
          await handleGetTemplates(req, res);
        } else if (action === 'history') {
          await handleGetHistory(req, res);
        } else if (action === 'analytics') {
          await handleGetAnalytics(req, res);
        } else {
          await handleGetCommunications(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'send-bulk') {
          await handleSendBulk(req, res);
        } else if (action === 'send-scheduled') {
          await handleSendScheduled(req, res);
        } else if (action === 'create-template') {
          await handleCreateTemplate(req, res);
        } else {
          await handleSendCommunication(req, res);
        }
        break;
      
      case 'PUT':
        await handleUpdateCommunication(req, res);
        break;
      
      case 'DELETE':
        await handleDeleteCommunication(req, res);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Communications API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get communications history
async function handleGetCommunications(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      type, 
      status, 
      recipient_id,
      start_date,
      end_date,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('communications')
      .select(`
        *,
        sender:sender_id(name, email),
        recipient_lead:recipient_lead_id(fullName, email, phone),
        recipient_student:recipient_student_id(name, email, phone),
        template:template_id(name, subject)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (type) query = query.eq('communication_type', type);
    if (status) query = query.eq('status', status);
    if (recipient_id) query = query.or(`recipient_lead_id.eq.${recipient_id},recipient_student_id.eq.${recipient_id}`);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: communications, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      communications: communications || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: communications?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Send single communication
async function handleSendCommunication(req, res) {
  try {
    const user = verifyToken(req);
    const {
      communication_type,
      recipient_type,
      recipient_id,
      subject,
      message,
      template_id,
      schedule_at,
      attachments,
      metadata
    } = req.body;

    if (!communication_type || !recipient_type || !recipient_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get recipient details
    const recipient = await getRecipientDetails(recipient_type, recipient_id);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Process template if provided
    let processedMessage = message;
    let processedSubject = subject;
    
    if (template_id) {
      const template = await getTemplate(template_id);
      if (template) {
        processedMessage = processTemplate(template.content, recipient);
        processedSubject = processTemplate(template.subject || subject, recipient);
      }
    }

    // Create communication record
    const { data: communication, error } = await supabase
      .from('communications')
      .insert([{
        communication_type,
        sender_id: user.id,
        recipient_lead_id: recipient_type === 'lead' ? recipient_id : null,
        recipient_student_id: recipient_type === 'student' ? recipient_id : null,
        template_id,
        subject: processedSubject,
        message: processedMessage,
        status: schedule_at ? 'scheduled' : 'pending',
        schedule_at,
        attachments: attachments || [],
        metadata: metadata || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Send immediately if not scheduled
    if (!schedule_at) {
      const result = await sendCommunication(communication, recipient);
      
      // Update status based on send result
      await supabase
        .from('communications')
        .update({
          status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null,
          delivery_status: result.deliveryStatus || null,
          error_message: result.error || null
        })
        .eq('id', communication.id);
    }

    res.json({
      success: true,
      message: schedule_at ? 'Communication scheduled successfully' : 'Communication sent successfully',
      communication
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Send bulk communications
async function handleSendBulk(req, res) {
  try {
    const user = verifyToken(req);
    const {
      communication_type,
      recipients,
      subject,
      message,
      template_id,
      schedule_at
    } = req.body;

    if (!communication_type || !recipients || !recipients.length || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields or empty recipients list'
      });
    }

    const results = [];

    // Process each recipient
    for (const recipient of recipients) {
      try {
        const recipientDetails = await getRecipientDetails(recipient.type, recipient.id);
        if (!recipientDetails) {
          results.push({
            recipient_id: recipient.id,
            success: false,
            error: 'Recipient not found'
          });
          continue;
        }

        // Process template
        let processedMessage = message;
        let processedSubject = subject;
        
        if (template_id) {
          const template = await getTemplate(template_id);
          if (template) {
            processedMessage = processTemplate(template.content, recipientDetails);
            processedSubject = processTemplate(template.subject || subject, recipientDetails);
          }
        }

        // Create communication record
        const { data: communication, error } = await supabase
          .from('communications')
          .insert([{
            communication_type,
            sender_id: user.id,
            recipient_lead_id: recipient.type === 'lead' ? recipient.id : null,
            recipient_student_id: recipient.type === 'student' ? recipient.id : null,
            template_id,
            subject: processedSubject,
            message: processedMessage,
            status: schedule_at ? 'scheduled' : 'pending',
            schedule_at,
            metadata: { bulk_send: true },
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        // Send immediately if not scheduled
        if (!schedule_at) {
          const sendResult = await sendCommunication(communication, recipientDetails);
          
          await supabase
            .from('communications')
            .update({
              status: sendResult.success ? 'sent' : 'failed',
              sent_at: sendResult.success ? new Date().toISOString() : null,
              delivery_status: sendResult.deliveryStatus || null,
              error_message: sendResult.error || null
            })
            .eq('id', communication.id);

          results.push({
            recipient_id: recipient.id,
            communication_id: communication.id,
            success: sendResult.success,
            error: sendResult.error
          });
        } else {
          results.push({
            recipient_id: recipient.id,
            communication_id: communication.id,
            success: true,
            scheduled: true
          });
        }
      } catch (error) {
        results.push({
          recipient_id: recipient.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk communication completed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: recipients.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get message templates
async function handleGetTemplates(req, res) {
  try {
    const user = verifyToken(req);
    const { type, category } = req.query;

    let query = supabase
      .from('communication_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (type) query = query.eq('communication_type', type);
    if (category) query = query.eq('category', category);

    const { data: templates, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      templates: templates || []
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create message template
async function handleCreateTemplate(req, res) {
  try {
    const user = verifyToken(req);
    const {
      name,
      communication_type,
      category,
      subject,
      content,
      variables,
      description
    } = req.body;

    if (!name || !communication_type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, communication type, and content are required'
      });
    }

    const { data: template, error } = await supabase
      .from('communication_templates')
      .insert([{
        name,
        communication_type,
        category: category || 'general',
        subject,
        content,
        variables: variables || [],
        description,
        created_by_id: user.id,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get communication analytics
async function handleGetAnalytics(req, res) {
  try {
    const user = verifyToken(req);
    const { period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get communication statistics
    const [
      totalStats,
      statusBreakdown,
      typeBreakdown,
      dailyTrends
    ] = await Promise.all([
      getTotalStats(startDate),
      getStatusBreakdown(startDate),
      getTypeBreakdown(startDate),
      getDailyTrends(startDate)
    ]);

    res.json({
      success: true,
      analytics: {
        period,
        total: totalStats,
        byStatus: statusBreakdown,
        byType: typeBreakdown,
        dailyTrends
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper functions
async function getRecipientDetails(type, id) {
  const table = type === 'lead' ? 'leads' : 'students';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  return error ? null : data;
}

async function getTemplate(templateId) {
  const { data, error } = await supabase
    .from('communication_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  return error ? null : data;
}

function processTemplate(content, recipient) {
  if (!content || !recipient) return content;

  let processed = content;
  
  // Replace common variables
  processed = processed.replace(/\{\{name\}\}/g, recipient.name || recipient.fullName || '');
  processed = processed.replace(/\{\{email\}\}/g, recipient.email || '');
  processed = processed.replace(/\{\{phone\}\}/g, recipient.phone || '');
  processed = processed.replace(/\{\{course\}\}/g, recipient.course || '');
  
  return processed;
}

async function sendCommunication(communication, recipient) {
  try {
    switch (communication.communication_type) {
      case 'email':
        return await sendEmail(communication, recipient);
      case 'sms':
        return await sendSMS(communication, recipient);
      case 'whatsapp':
        return await sendWhatsApp(communication, recipient);
      default:
        return { success: false, error: 'Unsupported communication type' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendEmail(communication, recipient) {
  // Implement email sending logic using your email service
  // For now, return success simulation
  return {
    success: true,
    deliveryStatus: 'delivered',
    messageId: `email_${Date.now()}`
  };
}

async function sendSMS(communication, recipient) {
  // Implement SMS sending logic
  return {
    success: true,
    deliveryStatus: 'sent',
    messageId: `sms_${Date.now()}`
  };
}

async function sendWhatsApp(communication, recipient) {
  // Implement WhatsApp sending logic
  return {
    success: true,
    deliveryStatus: 'sent',
    messageId: `whatsapp_${Date.now()}`
  };
}

async function getTotalStats(startDate) {
  const { data, error } = await supabase
    .from('communications')
    .select('id')
    .gte('created_at', startDate);

  return { total: data?.length || 0 };
}

async function getStatusBreakdown(startDate) {
  const { data, error } = await supabase
    .from('communications')
    .select('status')
    .gte('created_at', startDate);

  if (error) return {};

  return data.reduce((acc, comm) => {
    acc[comm.status] = (acc[comm.status] || 0) + 1;
    return acc;
  }, {});
}

async function getTypeBreakdown(startDate) {
  const { data, error } = await supabase
    .from('communications')
    .select('communication_type')
    .gte('created_at', startDate);

  if (error) return {};

  return data.reduce((acc, comm) => {
    acc[comm.communication_type] = (acc[comm.communication_type] || 0) + 1;
    return acc;
  }, {});
}

async function getDailyTrends(startDate) {
  const { data, error } = await supabase
    .from('communications')
    .select('created_at, status')
    .gte('created_at', startDate)
    .order('created_at');

  if (error) return [];

  // Group by date
  const dailyData = {};
  data.forEach(comm => {
    const date = comm.created_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { date, total: 0, sent: 0, failed: 0 };
    }
    dailyData[date].total++;
    if (comm.status === 'sent') dailyData[date].sent++;
    if (comm.status === 'failed') dailyData[date].failed++;
  });

  return Object.values(dailyData);
}