const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.crmdmhca.com', 'https://crmdmhca.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Supabase with error handling
let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Supabase credentials not configured');
    console.warn('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.warn('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
  } else {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase initialized successfully');
  }
} catch (error) {
  console.error('❌ Supabase initialization failed:', error);
}

// Helper function to check if Supabase is initialized
function checkSupabaseInitialized(res) {
  if (!supabase) {
    res.status(503).json({ 
      error: 'Database service unavailable',
      message: 'Supabase is not properly initialized. Please check environment variables.'
    });
    return false;
  }
  return true;
}

// Import API handlers
const leadsHandler = require('./api/leads');
const dashboardHandler = require('./api/dashboard');
const healthHandler = require('./api/health');
const analyticsHandler = require('./api/analytics');
const studentsHandler = require('./api/students');
const usersHandler = require('./api/users');
const communicationsHandler = require('./api/communications');
const documentsHandler = require('./api/documents');
const paymentsHandler = require('./api/payments');
const integrationsHandler = require('./api/integrations');

// ===========================
// API ROUTES
// ===========================

// Health check endpoint
app.get('/health', healthHandler);

// Dashboard stats
app.get('/api/dashboard/stats', dashboardHandler);

// Core CRM APIs (full CRUD)
app.all('/api/leads', leadsHandler);
app.all('/api/students', studentsHandler);
app.all('/api/users', usersHandler);
app.all('/api/communications', communicationsHandler);
app.all('/api/documents', documentsHandler);
app.all('/api/payments', paymentsHandler);

// Analytics endpoint
app.get('/api/analytics/realtime', analyticsHandler);

// Integrations API
app.all('/api/integrations', integrationsHandler);

// Payment-specific routes (for backwards compatibility)
app.post('/api/payments/create-order', (req, res) => {
  req.query.action = 'create-order';
  paymentsHandler(req, res);
});

// Calendar appointments (using existing function)
app.post('/api/calendar/create-appointment', async (req, res) => {
  try {
    const { title, startTime, endTime, attendeeEmail, description, leadId } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Title, start time, and end time required'
      });
    }

    const event = await createGoogleCalendarEvent({
      summary: title,
      description,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : []
    });

    // Log communication
    if (supabase) {
      await supabase
        .from('communications')
        .insert([{
          type: 'meeting',
          direction: 'outbound',
          subject: title,
          content: description,
          recipient: attendeeEmail,
          status: 'scheduled',
          scheduled_at: startTime,
          lead_id: leadId
        }]);
    }

    res.json({
      success: true,
      eventId: event.id,
      meetLink: event.hangoutLink
    });

  } catch (error) {
    console.error('Calendar creation error:', error);
    res.status(500).json({
      error: 'Failed to create calendar appointment',
      details: error.message
    });
  }
});

// Facebook Lead Ads webhook
app.post('/webhooks/facebook', async (req, res) => {
  try {
    const { object, entry } = req.body;

    if (object === 'page') {
      for (const pageEntry of entry) {
        if (pageEntry.changes) {
          for (const change of pageEntry.changes) {
            if (change.field === 'leadgen') {
              const leadgenId = change.value.leadgen_id;
              await processFacebookLead(leadgenId);
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Facebook webhook error:', error);
    res.status(500).send('Error');
  }
});

// ===========================
// 2. WHATSAPP API INTEGRATION
// ===========================

// Send WhatsApp message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phone, message, templateName, templateParams } = req.body;

    if (!phone || (!message && !templateName)) {
      return res.status(400).json({
        error: 'Phone number and message/template required'
      });
    }

    const result = await sendWhatsAppMessage(phone, message, templateName, templateParams);

    // Log communication
    await supabase
      .from('communications')
      .insert([{
        type: 'whatsapp',
        direction: 'outbound',
        content: message || `Template: ${templateName}`,
        recipient: phone,
        status: result.success ? 'sent' : 'failed'
      }]);

    res.json(result);
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
});

// WhatsApp webhook for incoming messages
app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const { messages, contacts } = req.body.entry?.[0]?.changes?.[0]?.value || {};

    if (messages) {
      for (const message of messages) {
        const contact = contacts?.find(c => c.wa_id === message.from);
        
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
          await handleWhatsAppAutoResponse(message.from, message.text.body);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error');
  }
});

// ===========================
// 3. PAYMENT GATEWAY INTEGRATION
// ===========================

// Create payment order (Razorpay)
app.post('/api/payments/create-order', async (req, res) => {
  try {
    if (!checkSupabaseInitialized(res)) return;
    
    const { amount, currency = 'INR', studentId, courseId, description } = req.body;

    if (!amount || !studentId) {
      return res.status(400).json({
        error: 'Amount and student ID required'
      });
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(amount, currency, description);

    // Save payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        student_id: studentId,
        course_id: courseId,
        amount: amount / 100, // Convert paise to rupees
        currency,
        status: 'pending',
        gateway_order_id: order.id,
        description
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      error: 'Failed to create payment order',
      details: error.message
    });
  }
});

// Payment webhook (Razorpay)
app.post('/webhooks/razorpay', async (req, res) => {
  try {
    if (!checkSupabaseInitialized(res)) return;
    
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      
      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          gateway_payment_id: payment.id,
          paid_at: new Date().toISOString()
        })
        .eq('gateway_order_id', payment.order_id);

      // Update student enrollment status
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('student_id, course_id')
        .eq('gateway_order_id', payment.order_id)
        .single();

      if (paymentRecord) {
        await supabase
          .from('students')
          .update({
            payment_status: 'paid',
            status: 'active'
          })
          .eq('id', paymentRecord.student_id);

        // Send confirmation messages
        await sendPaymentConfirmation(paymentRecord.student_id, payment.amount / 100);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).send('Error');
  }
});

// ===========================
// 4. GOOGLE CALENDAR INTEGRATION
// ===========================

// Create calendar appointment
app.post('/api/calendar/create-appointment', async (req, res) => {
  try {
    const { title, startTime, endTime, attendeeEmail, description, leadId } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Title, start time, and end time required'
      });
    }

    const event = await createGoogleCalendarEvent({
      summary: title,
      description,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : []
    });

    // Log communication
    await supabase
      .from('communications')
      .insert([{
        type: 'meeting',
        direction: 'outbound',
        subject: title,
        content: description,
        recipient: attendeeEmail,
        status: 'scheduled',
        scheduled_at: startTime,
        lead_id: leadId
      }]);

    res.json({
      success: true,
      eventId: event.id,
      meetLink: event.hangoutLink
    });

  } catch (error) {
    console.error('Calendar creation error:', error);
    res.status(500).json({
      error: 'Failed to create calendar appointment',
      details: error.message
    });
  }
});

// ===========================
// 5. EMAIL INTEGRATION
// ===========================

// Send email
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, html, text, leadId, studentId } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        error: 'To, subject, and content required'
      });
    }

    const result = await sendEmail({ to, subject, html, text });

    // Log communication
    await supabase
      .from('communications')
      .insert([{
        type: 'email',
        direction: 'outbound',
        subject,
        content: text || html,
        recipient: to,
        status: result.success ? 'sent' : 'failed',
        lead_id: leadId,
        student_id: studentId
      }]);

    res.json(result);
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// ===========================
// 6. ANALYTICS ENDPOINTS
// ===========================

// Get real-time analytics
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    if (!checkSupabaseInitialized(res)) return;
    
    const [leadsCount, studentsCount, communicationsCount, paymentsSum] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('communications').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('amount').eq('status', 'completed')
    ]);

    const totalRevenue = paymentsSum.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    res.json({
      leads: leadsCount.count || 0,
      students: studentsCount.count || 0,
      communications: communicationsCount.count || 0,
      revenue: totalRevenue,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

// ===========================
// HELPER FUNCTIONS
// ===========================

async function sendWhatsAppMessage(phone, message, templateName, templateParams) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: templateName ? 'template' : 'text',
        ...(templateName ? {
          template: {
            name: templateName,
            language: { code: 'en' },
            components: templateParams ? [{ type: 'body', parameters: templateParams }] : []
          }
        } : {
          text: { body: message }
        })
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

async function sendWhatsAppNotification(phone, message) {
  return await sendWhatsAppMessage(phone, message);
}

async function handleWhatsAppAutoResponse(phone, message) {
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

async function processFacebookLead(leadgenId) {
  try {
    if (!supabase) {
      console.warn('Cannot process Facebook lead: Supabase not initialized');
      return;
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${leadgenId}?fields=field_data`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}`
        }
      }
    );

    const fieldData = response.data.field_data;
    const leadData = {};

    fieldData.forEach(field => {
      leadData[field.name] = field.values[0];
    });

    // Save to database
    await supabase
      .from('leads')
      .insert([{
        name: leadData.full_name || leadData.name,
        email: leadData.email,
        phone: leadData.phone_number,
        source: 'facebook_ads',
        status: 'new',
        score: 60,
        notes: `Facebook Lead Ad: ${leadData.course_interest || 'General inquiry'}`
      }]);

  } catch (error) {
    console.error('Facebook lead processing error:', error);
  }
}

async function createRazorpayOrder(amount, currency, description) {
  const response = await axios.post(
    'https://api.razorpay.com/v1/orders',
    {
      amount: amount, // in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: { description }
    },
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET
      }
    }
  );

  return response.data;
}

async function createGoogleCalendarEvent(eventDetails) {
  // Implement Google Calendar API integration
  // This requires Google OAuth setup
  console.log('Creating calendar event:', eventDetails);
  return { id: 'mock_event_id', hangoutLink: 'https://meet.google.com/mock' };
}

async function sendEmail({ to, subject, html, text }) {
  // Implement email service (SendGrid, Nodemailer, etc.)
  console.log('Sending email:', { to, subject });
  return { success: true, messageId: 'mock_message_id' };
}

async function sendAutoResponseEmail(email, name, courseInterest) {
  const html = `
    <h2>Thank you for your interest, ${name}!</h2>
    <p>We received your inquiry about ${courseInterest || 'our courses'}.</p>
    <p>Our counselor will contact you within 24 hours.</p>
    <p>Best regards,<br>DMHCA Team</p>
  `;

  return await sendEmail({
    to: email,
    subject: 'Thank you for your interest - DMHCA',
    html
  });
}

async function sendPaymentConfirmation(studentId, amount) {
  if (!supabase) {
    console.warn('Cannot send payment confirmation: Supabase not initialized');
    return;
  }
  
  const { data: student } = await supabase
    .from('students')
    .select('name, email, phone')
    .eq('id', studentId)
    .single();

  if (student) {
    // Send email confirmation
    await sendEmail({
      to: student.email,
      subject: 'Payment Confirmed - DMHCA',
      html: `
        <h2>Payment Confirmed!</h2>
        <p>Dear ${student.name},</p>
        <p>Your payment of ₹${amount} has been successfully processed.</p>
        <p>Welcome to DMHCA! 🎓</p>
      `
    });

    // Send WhatsApp confirmation
    if (student.phone) {
      await sendWhatsAppMessage(
        student.phone,
        `🎉 Payment Confirmed!\n\nDear ${student.name},\nYour payment of ₹${amount} has been processed successfully.\n\nWelcome to DMHCA! 🎓`
      );
    }
  }
}

// ===========================
// ERROR HANDLING MIDDLEWARE
// ===========================

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// ===========================
// START SERVER
// ===========================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DMHCA CRM API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      cors: 'enabled',
      supabase: supabase ? 'connected' : 'not configured',
      whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'not configured',
      facebook: process.env.FACEBOOK_ACCESS_TOKEN ? 'configured' : 'not configured'
    }
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    supabase: supabase ? 'connected' : 'not configured'
  });
});

// 404 handler (MUST be after all routes)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/dashboard/stats',
      'GET /api/analytics/realtime',
      'GET /api/leads',
      'POST /api/leads',
      'PUT /api/leads/:id',
      'DELETE /api/leads/:id',
      'GET /api/students',
      'POST /api/students',
      'PUT /api/students/:id',
      'DELETE /api/students/:id',
      'GET /api/users',
      'POST /api/users',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/communications',
      'POST /api/communications',
      'PUT /api/communications/:id',
      'DELETE /api/communications/:id',
      'GET /api/documents',
      'POST /api/documents',
      'PUT /api/documents/:id',
      'DELETE /api/documents/:id',
      'GET /api/payments',
      'POST /api/payments',
      'POST /api/payments/create-order',
      'GET /api/integrations',
      'POST /api/integrations',
      'POST /api/calendar/create-appointment',
      'POST /api/whatsapp/send',
      'POST /api/email/send',
      'POST /webhooks/facebook',
      'POST /webhooks/whatsapp',
      'POST /webhooks/razorpay'
    ]
  });
});

// Enhanced server startup
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 DMHCA CRM API Server Started Successfully!');
  console.log('=====================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🗄️ Database: ${supabase ? '✅ Connected to Supabase' : '❌ Not configured'}`);
  console.log(`🔐 CORS: ${process.env.NODE_ENV === 'production' ? '✅ Production mode' : '✅ Development mode'}`);
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📤 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📤 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});
/ /   T r i g g e r   r e d e p l o y   -   0 9 / 0 6 / 2 0 2 5   1 7 : 4 0 : 0 2  
 