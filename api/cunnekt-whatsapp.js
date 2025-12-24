// Cunnekt WhatsApp API Integration
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Cunnekt WhatsApp: Supabase initialization failed:', error.message);
}

// Cunnekt API Configuration
const CUNNEKT_BASE_URL = 'https://app2.cunnekt.com/v1';
const CUNNEKT_API_KEY = process.env.CUNNEKT_API_KEY;
if (!CUNNEKT_API_KEY) {
  console.error('CRITICAL: CUNNEKT_API_KEY environment variable is not set');
}

module.exports = async (req, res) => {
  // CORS headers
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

  try {
    const { action } = req.query;

    switch (action) {
      case 'send-message':
        return await sendMessage(req, res);
      
      case 'send-bulk':
        return await sendBulkMessages(req, res);
      
      case 'send-template':
        return await sendTemplate(req, res);
      
      case 'get-status':
        return await getMessageStatus(req, res);
      
      case 'webhook':
        return await handleWebhook(req, res);
      
      case 'test-connection':
        return await testConnection(req, res);
      
      case 'get-campaigns':
        return await getCampaigns(req, res);
      
      case 'get-responses':
        return await getResponses(req, res);
      
      case 'save-campaign':
        return await saveCampaign(req, res);
      
      case 'delete-campaign':
        return await deleteCampaign(req, res);
      
      case 'update-campaign-status':
        return await updateCampaignStatus(req, res);
      
      default:
        res.status(400).json({ 
          success: false, 
          error: 'Invalid action. Use: send-message, send-bulk, send-template, get-status, webhook, test-connection, get-campaigns, get-responses, save-campaign, delete-campaign, update-campaign-status' 
        });
    }
  } catch (error) {
    console.error('Cunnekt WhatsApp API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data 
    });
  }
};

// Send single WhatsApp message
async function sendMessage(req, res) {
  const { phone, message, leadId } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Phone number and message are required' 
    });
  }

  try {
    console.log('🔵 Cunnekt: Sending single message to:', phone);
    
    // Clean phone number (remove spaces, dashes, etc)
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log('📱 Cleaned phone:', cleanPhone);
    console.log('💬 Message:', message.substring(0, 50) + '...');
    console.log('🔑 API Key:', CUNNEKT_API_KEY ? 'Set' : 'Missing');

    const requestData = {
      phone: cleanPhone,
      message: message,
      type: 'text'
    };
    
    console.log('📤 Sending to Cunnekt:', requestData);

    const response = await axios.post(
      `${CUNNEKT_BASE_URL}/messages`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Cunnekt response:', response.data);

    // Log to communications table
    if (supabase && leadId) {
      await supabase
        .from('communications')
        .insert([{
          lead_id: leadId,
          type: 'whatsapp',
          direction: 'outbound',
          content: message,
          recipient: cleanPhone,
          status: 'sent',
          message_id: response.data.messageId,
          sent_at: new Date().toISOString()
        }]);
    }

    res.json({ 
      success: true, 
      messageId: response.data.messageId,
      status: response.data.status,
      phone: cleanPhone
    });
  } catch (error) {
    console.error('Send message error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
}

// Send bulk WhatsApp messages
async function sendBulkMessages(req, res) {
  const { leads, message, campaignId } = req.body;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Leads array is required' 
    });
  }

  if (!message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message is required' 
    });
  }

  const results = {
    total: leads.length,
    success: 0,
    failed: 0,
    details: []
  };

  // Process in batches of 10 to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (lead) => {
        try {
          // Get best phone number
          const phone = lead.whatsapp || lead.phone || lead.alternatePhone;
          if (!phone) {
            results.failed++;
            results.details.push({
              leadId: lead.id,
              name: lead.name,
              status: 'failed',
              error: 'No phone number'
            });
            return;
          }

          const cleanPhone = phone.replace(/\D/g, '');

          // Personalize message
          let personalizedMessage = message;
          personalizedMessage = personalizedMessage.replace(/\{name\}/g, lead.name || lead.fullName || 'there');
          personalizedMessage = personalizedMessage.replace(/\{course\}/g, lead.course || 'our courses');
          personalizedMessage = personalizedMessage.replace(/\{qualification\}/g, lead.qualification || 'your qualification');
          personalizedMessage = personalizedMessage.replace(/\{country\}/g, lead.country || '');

          console.log(`📤 [${i + batch.indexOf(lead) + 1}/${leads.length}] Sending to ${cleanPhone}`);
          
          const requestData = {
            phone: cleanPhone,
            message: personalizedMessage,
            type: 'text'
          };

          const response = await axios.post(
            `${CUNNEKT_BASE_URL}/messages`,
            requestData,
            {
              headers: {
                'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          
          console.log(`✅ [${i + batch.indexOf(lead) + 1}/${leads.length}] Sent:`, response.data);

          // Log to communications
          if (supabase) {
            await supabase
              .from('communications')
              .insert([{
                lead_id: lead.id,
                type: 'whatsapp',
                direction: 'outbound',
                content: personalizedMessage,
                recipient: cleanPhone,
                status: 'sent',
                message_id: response.data.messageId,
                campaign_id: campaignId,
                sent_at: new Date().toISOString()
              }]);
          }

          results.success++;
          results.details.push({
            leadId: lead.id,
            name: lead.name,
            phone: cleanPhone,
            status: 'sent',
            messageId: response.data.messageId
          });

        } catch (error) {
          console.error(`❌ [${i + batch.indexOf(lead) + 1}/${leads.length}] Failed:`, error.response?.data || error.message);
          results.failed++;
          results.details.push({
            leadId: lead.id,
            name: lead.name,
            phone: cleanPhone || phone,
            status: 'failed',
            error: error.response?.data?.message || error.message
          });
        }
      })
    );

    // Add delay between batches to respect rate limits
    if (i + batchSize < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  res.json({ 
    success: true, 
    results 
  });
}

// Send WhatsApp template message
async function sendTemplate(req, res) {
  const { phone, templateName, parameters, leadId } = req.body;

  if (!phone || !templateName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Phone number and template name are required' 
    });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');

    const response = await axios.post(
      `${CUNNEKT_BASE_URL}/messages/template`,
      {
        phone: cleanPhone,
        template: templateName,
        parameters: parameters || []
      },
      {
        headers: {
          'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Log to communications
    if (supabase && leadId) {
      await supabase
        .from('communications')
        .insert([{
          lead_id: leadId,
          type: 'whatsapp',
          direction: 'outbound',
          content: `Template: ${templateName}`,
          recipient: cleanPhone,
          status: 'sent',
          message_id: response.data.messageId,
          sent_at: new Date().toISOString()
        }]);
    }

    res.json({ 
      success: true, 
      messageId: response.data.messageId,
      status: response.data.status
    });
  } catch (error) {
    console.error('Send template error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
}

// Get message delivery status
async function getMessageStatus(req, res) {
  const { messageId } = req.query;

  if (!messageId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message ID is required' 
    });
  }

  try {
    const response = await axios.get(
      `${CUNNEKT_BASE_URL}/messages/${messageId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${CUNNEKT_API_KEY}`
        }
      }
    );

    res.json({ 
      success: true, 
      status: response.data
    });
  } catch (error) {
    console.error('Get status error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
}

// Handle Cunnekt webhooks (incoming messages, status updates)
async function handleWebhook(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookData = req.body;
  console.log('Cunnekt webhook received:', JSON.stringify(webhookData, null, 2));

  try {
    // Handle different webhook types
    if (webhookData.type === 'message.received') {
      // Incoming message from lead
      const { from, message, messageId } = webhookData.data;

      // Find lead by phone number
      if (supabase) {
        const { data: leads } = await supabase
          .from('leads')
          .or(`phone.eq.${from},whatsapp.eq.${from},alternatePhone.eq.${from}`)
          .limit(1);

        const leadId = leads?.[0]?.id;

        // Log incoming message
        await supabase
          .from('communications')
          .insert([{
            lead_id: leadId,
            type: 'whatsapp',
            direction: 'inbound',
            content: message,
            sender: from,
            status: 'received',
            message_id: messageId,
            received_at: new Date().toISOString()
          }]);

        // Auto-respond based on keywords
        await handleAutoResponse(from, message, leadId);
      }
    } 
    else if (webhookData.type === 'message.status') {
      // Message status update (sent, delivered, read, failed)
      const { messageId, status } = webhookData.data;

      if (supabase) {
        await supabase
          .from('communications')
          .update({ status: status.toLowerCase() })
          .eq('message_id', messageId);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Auto-respond to common keywords
async function handleAutoResponse(phone, message, leadId) {
  const lowerMessage = message.toLowerCase();
  let responseMessage = null;

  if (lowerMessage.includes('info') || lowerMessage.includes('course') || lowerMessage.includes('details')) {
    responseMessage = "Thank you for your interest! 🎓\n\nWe offer courses in:\n• Medical Coding\n• Healthcare Administration\n• Clinical Research\n\nReply 'CALLBACK' for a free consultation!";
  } 
  else if (lowerMessage.includes('callback') || lowerMessage.includes('call me') || lowerMessage.includes('contact')) {
    responseMessage = "Perfect! 📞 Our counselor will call you within 2 hours.\n\nPlease share your preferred time or say 'NOW' for immediate callback.";
  }
  else if (lowerMessage.includes('fee') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    responseMessage = "Great question! 💰\n\nOur course fees vary by program. Let us connect you with our admissions team for detailed pricing and payment plans.\n\nReply 'CALLBACK' to schedule a call.";
  }
  else if (lowerMessage.includes('admission') || lowerMessage.includes('enroll') || lowerMessage.includes('join')) {
    responseMessage = "Excellent! We'd love to have you join us! 🎉\n\nOur next batch starts soon. Reply 'CALLBACK' and our team will guide you through the admission process.";
  }

  if (responseMessage) {
    try {
      await axios.post(
        `${CUNNEKT_BASE_URL}/messages`,
        {
          phone: phone,
          message: responseMessage,
          type: 'text'
        },
        {
          headers: {
            'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log auto-response
      if (supabase && leadId) {
        await supabase
          .from('communications')
          .insert([{
            lead_id: leadId,
            type: 'whatsapp',
            direction: 'outbound',
            content: responseMessage,
            recipient: phone,
            status: 'sent',
            is_auto_response: true,
            sent_at: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error('Auto-response error:', error);
    }
  }
}

// Test Cunnekt API connection
async function testConnection(req, res) {
  try {
    const response = await axios.get(
      `${CUNNEKT_BASE_URL}/account/info`,
      {
        headers: {
          'Authorization': `Bearer ${CUNNEKT_API_KEY}`
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'Cunnekt WhatsApp API connected successfully',
      account: response.data
    });
  } catch (error) {
    console.error('Connection test failed:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Connection failed',
      details: error.response?.data?.message || error.message
    });
  }
}

// Save campaign to database
async function saveCampaign(req, res) {
  try {
    const { name, template, segmentFilters, leadCount, userId } = req.body;

    if (!name || !template) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campaign name and template are required' 
      });
    }

    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .insert([{
        name,
        template,
        segment_filters: segmentFilters || {},
        lead_count: leadCount || 0,
        status: 'draft',
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ 
      success: true, 
      message: 'Campaign saved successfully',
      campaign: data
    });
  } catch (error) {
    console.error('Save campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get all campaigns
async function getCampaigns(req, res) {
  try {
    const { userId, status } = req.query;

    let query = supabase
      .from('whatsapp_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('created_by', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ 
      success: true, 
      campaigns: data || []
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      campaigns: []
    });
  }
}

// Get WhatsApp responses
async function getResponses(req, res) {
  try {
    const { leadId, campaignId, limit = 50 } = req.query;

    let query = supabase
      .from('communications')
      .select('*')
      .eq('type', 'whatsapp')
      .eq('direction', 'inbound')
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit));

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ 
      success: true, 
      responses: data || []
    });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      responses: []
    });
  }
}

// Delete campaign
async function deleteCampaign(req, res) {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campaign ID is required' 
      });
    }

    console.log('🗑️ Deleting campaign:', campaignId);

    const { error } = await supabase
      .from('whatsapp_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      throw error;
    }

    console.log('✅ Campaign deleted successfully');

    res.json({ 
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
}

// Update campaign status
async function updateCampaignStatus(req, res) {
  try {
    const { campaignId, status, stats } = req.body;

    if (!campaignId || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campaign ID and status are required' 
      });
    }

    console.log('📊 Updating campaign status:', { campaignId, status, stats });

    const updateData = { status };
    
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      updateData.completed_at = new Date().toISOString();
    }

    if (stats) {
      if (stats.success !== undefined) updateData.total_sent = stats.success;
      if (stats.failed !== undefined) updateData.total_failed = stats.failed;
      if (stats.delivered !== undefined) updateData.total_delivered = stats.delivered;
    }

    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Campaign status updated:', data);

    res.json({ 
      success: true,
      campaign: data[0]
    });
  } catch (error) {
    console.error('❌ Update campaign status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
}
