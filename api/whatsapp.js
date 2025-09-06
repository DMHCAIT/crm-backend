// WhatsApp API Integration
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
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

  if (req.method === 'GET') {
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
    return;
  }

  if (req.method === 'POST') {
    const body = req.body;

    // Handle incoming WhatsApp messages
    if (body.object === 'whatsapp_business_account') {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        const messages = body.entry[0].changes[0].value.messages;
        const contacts = body.entry[0].changes[0].value.contacts;

        for (const message of messages) {
          const contact = contacts?.find(c => c.wa_id === message.from);
          
          // Log incoming message
          await supabase
            .from('communications')
            .insert([{
              type: 'whatsapp',
              direction: 'inbound',
              content: message.text?.body || message.type,
              sender: message.from,
              status: 'received'
            }]);

          // Auto-respond based on keywords
          if (message.text?.body) {
            await handleAutoResponse(message.from, message.text.body);
          }
        }
      }

      res.status(200).send('OK');
    } else {
      res.status(404).send('Not found');
    }
  }
};

async function handleAutoResponse(phone, message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('info') || lowerMessage.includes('course')) {
    await sendWhatsAppMessage(
      phone,
      "Thank you for your interest! 🎓\n\nWe offer courses in:\n• Medical Coding\n• Healthcare Administration\n• Clinical Research\n\nReply with 'CALLBACK' for a consultation call!"
    );
  } else if (lowerMessage.includes('callback')) {
    await sendWhatsAppMessage(
      phone,
      "Perfect! 📞 Our counselor will call you within 2 hours. Please share your preferred time or say 'NOW' for immediate callback."
    );
  }
}

async function sendWhatsAppMessage(phone, message) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log('WhatsApp not configured, skipping message');
    return;
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
