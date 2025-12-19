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
const CUNNEKT_API_KEY = process.env.CUNNEKT_API_KEY || '4d776c1d10d186e225f1985095d201eb9cc41ad4';

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
      
      default:
        res.status(400).json({ 
          success: false, 
          error: 'Invalid action. Use: send-message, send-bulk, send-template, get-status, webhook, test-connection' 
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
    // Clean phone number (remove spaces, dashes, etc)
    const cleanPhone = phone.replace(/\D/g, '');

    const response = await axios.post(
      `${CUNNEKT_BASE_URL}/messages`,
      {
        phone: cleanPhone,
        message: message,
        type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

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

          const response = await axios.post(
            `${CUNNEKT_BASE_URL}/messages`,
            {
              phone: cleanPhone,
              message: personalizedMessage,
              type: 'text'
            },
            {
              headers: {
                'Authorization': `Bearer ${CUNNEKT_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );

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
          results.failed++;
          results.details.push({
            leadId: lead.id,
            name: lead.name,
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
