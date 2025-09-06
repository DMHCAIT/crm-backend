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
// ROOT & HEALTH ENDPOINTS
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

// Health check endpoint
app.get('/health', healthHandler);

// ===========================
// API ROUTES USING HANDLERS
// ===========================

// Dashboard stats
app.get('/api/dashboard/stats', dashboardHandler);

// Analytics endpoint
app.get('/api/analytics/realtime', analyticsHandler);

// Core CRM APIs (full CRUD) - These handlers support all methods (GET, POST, PUT, DELETE)
app.all('/api/leads', leadsHandler);
app.all('/api/leads/:id', leadsHandler);
app.all('/api/students', studentsHandler);
app.all('/api/students/:id', studentsHandler);
app.all('/api/users', usersHandler);
app.all('/api/users/:id', usersHandler);
app.all('/api/communications', communicationsHandler);
app.all('/api/communications/:id', communicationsHandler);
app.all('/api/documents', documentsHandler);
app.all('/api/documents/:id', documentsHandler);
app.all('/api/payments', paymentsHandler);
app.all('/api/payments/:id', paymentsHandler);
app.all('/api/integrations', integrationsHandler);
app.all('/api/integrations/:id', integrationsHandler);

// ===========================
// WEBHOOK ENDPOINTS
// ===========================

// Facebook webhook
app.post('/webhooks/facebook', async (req, res) => {
  try {
    const { object, entry } = req.body;
    
    if (object === 'page') {
      entry.forEach(async (pageEntry) => {
        if (pageEntry.leadgen) {
          for (const leadgen of pageEntry.leadgen) {
            await processFacebookLead(leadgen.leadgen_id);
          }
        }
      });
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Facebook webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// WhatsApp webhook
app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const { entry } = req.body;
    
    entry.forEach(async (webhookEntry) => {
      if (webhookEntry.changes) {
        webhookEntry.changes.forEach(async (change) => {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              await handleWhatsAppAutoResponse(message.from, message.text?.body);
            }
          }
        });
      }
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Razorpay webhook
app.post('/webhooks/razorpay', async (req, res) => {
  try {
    const { event, payload } = req.body;
    
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      await sendPaymentConfirmation(payment.notes.student_id, payment.amount / 100);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// ===========================
// ADDITIONAL API ENDPOINTS
// ===========================

// WhatsApp send message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phone, message, templateName, templateParams, leadId } = req.body;

    if (!phone || (!message && !templateName)) {
      return res.status(400).json({
        error: 'Phone number and message or template required'
      });
    }

    const result = await sendWhatsAppMessage(phone, message, templateName, templateParams);

    // Log communication if successful
    if (result.success && supabase) {
      await supabase
        .from('communications')
        .insert([{
          type: 'whatsapp',
          direction: 'outbound',
          content: message,
          recipient: phone,
          status: 'sent',
          lead_id: leadId,
          external_id: result.messageId
        }]);
    }

    res.json(result);
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
});

// Email send
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
    if (supabase) {
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
    }

    res.json(result);
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Calendar appointment
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
          direction: 'scheduled',
          subject: title,
          content: description,
          recipient: attendeeEmail,
          status: 'scheduled',
          lead_id: leadId,
          scheduled_at: startTime
        }]);
    }

    res.json({ success: true, event });
  } catch (error) {
    console.error('Calendar creation error:', error);
    res.status(500).json({
      error: 'Failed to create calendar appointment',
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

async function createGoogleCalendarEvent(eventDetails) {
  // Mock implementation - replace with actual Google Calendar API
  console.log('Creating calendar event:', eventDetails);
  return { id: 'mock_event_id', hangoutLink: 'https://meet.google.com/mock' };
}

async function sendEmail({ to, subject, html, text }) {
  // Mock implementation - replace with actual email service
  console.log('Sending email:', { to, subject });
  return { success: true, messageId: 'mock_message_id' };
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
// ERROR HANDLING
// ===========================

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
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
      'ALL /api/leads',
      'ALL /api/students', 
      'ALL /api/users',
      'ALL /api/communications',
      'ALL /api/documents',
      'ALL /api/payments',
      'ALL /api/integrations',
      'POST /api/whatsapp/send',
      'POST /api/email/send',
      'POST /api/calendar/create-appointment',
      'POST /webhooks/facebook',
      'POST /webhooks/whatsapp',
      'POST /webhooks/razorpay'
    ]
  });
});

// ===========================
// START SERVER
// ===========================

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
