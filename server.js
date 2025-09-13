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
    ? [
        'https://www.crmdmhca.com', 
        'https://crmdmhca.com',
        'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app',
        'https://crm-frontend-final.vercel.app',
        // Allow all Vercel subdomains for your project
        /https:\/\/crm-frontend-final.*\.vercel\.app$/
      ] 
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
    
    // Initialize database tables if needed
    initializeDatabaseTables();
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

// Database initialization function
async function initializeDatabaseTables() {
  console.log('🔍 Checking database tables...');
  
  try {
    // Check if core tables exist by trying to query them directly
    const requiredTables = ['users', 'leads', 'students'];
    const existingTables = [];
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          existingTables.push(tableName);
          console.log(`✅ Table ${tableName}: Verified`);
        }
      } catch (err) {
        console.log(`⚠️  Table ${tableName}: Not accessible`);
      }
    }
    
    if (existingTables.length < requiredTables.length) {
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      console.log(`⚠️  Some core tables missing: ${missingTables.join(', ')}`);
      console.log('🔄 Initializing missing tables...');
      await createEssentialTables();
    } else {
      console.log('✅ All core database tables verified');
    }
  } catch (error) {
    console.warn('⚠️  Could not verify tables:', error.message);
    console.log('🔄 Attempting to create essential tables...');
    await createEssentialTables();
  }
}

// Create essential tables
async function createEssentialTables() {
  console.log('🏗️  Creating essential database tables...');
  
  const tables = {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'counselor',
        designation VARCHAR(100),
        department VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        permissions TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `,
    leads: `
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        course_interest VARCHAR(100),
        lead_source VARCHAR(50) NOT NULL DEFAULT 'manual',
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        stage VARCHAR(50) NOT NULL DEFAULT 'inquiry',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        assigned_to UUID,
        notes TEXT,
        tags TEXT[],
        custom_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    `,
    students: `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(50) UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        course VARCHAR(100) NOT NULL,
        enrollment_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        fee_amount DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
    `
  };

  for (const [tableName, sql] of Object.entries(tables)) {
    try {
      // Use direct SQL execution via supabase
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.log(`⚠️  Table ${tableName}: Using fallback creation method`);
        // Tables will be created on first API call if this fails
      } else {
        console.log(`✅ Table ${tableName} ready`);
      }
    } catch (err) {
      console.log(`⚠️  Table ${tableName}: ${err.message}`);
    }
  }
  
  // Insert default admin user
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        email: 'admin@dmhca.in',
        name: 'DMHCA Admin',
        role: 'super_admin',
        department: 'Administration',
        status: 'active',
        permissions: ['*']
      }, { onConflict: 'email' });

    if (!error) {
      console.log('✅ Default admin user ready');
    }
  } catch (err) {
    console.log('⚠️  Admin user setup will be handled by auth system');
  }
  
  console.log('🎉 Database initialization completed');
}

// Import API handlers
const authHandler = require('./api/auth');
const leadsHandler = require('./api/leads');
const dashboardHandler = require('./api/dashboard');
const healthHandler = require('./api/health');
const studentsHandler = require('./api/students');
const usersHandler = require('./api/users');
const integrationsHandler = require('./api/integrations');
const facebookHandler = require('./api/facebook');
const whatsappHandler = require('./api/whatsapp');

// Import Enhanced API handlers
const analyticsHandler = require('./api/enhanced-analytics');
const automationHandler = require('./api/enhanced-automation');
const communicationsHandler = require('./api/enhanced-communications');
const documentsHandler = require('./api/enhanced-documents');
const paymentsHandler = require('./api/enhanced-payments');
const notificationsHandler = require('./api/enhanced-notifications');
const notesHandler = require('./api/enhanced-notes');
const integrationLogsHandler = require('./api/enhanced-integration-logs');
const systemSettingsHandler = require('./api/enhanced-system-settings');
const dataExportHandler = require('./api/enhanced-data-export');

// ===========================
// ROOT & HEALTH ENDPOINTS
// ===========================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DMHCA CRM API Server - WITH AUTHENTICATION',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '2.1.0', // Version bump with auth system
    environment: process.env.NODE_ENV || 'development',
    lastDeploy: '2025-09-11T07:30:00Z', // Updated timestamp for auth deployment
    authenticationEnabled: true, // New auth system deployed
    deploymentForced: true, // Flag to identify new deployment
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

// Authentication endpoints
app.all('/api/auth/login', authHandler);
app.all('/api/auth/register', authHandler);
app.all('/api/auth/logout', authHandler);
app.all('/api/auth/verify', authHandler);
app.all('/api/auth/refresh', authHandler);

// Admin creation endpoint (special setup endpoint)
app.post('/create-admin', async (req, res) => {
  try {
    const createAdminUser = require('./create-admin-direct');
    const admin = await createAdminUser();
    
    res.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Core CRM APIs (full CRUD) - These handlers support all methods (GET, POST, PUT, DELETE)
// Routes with /api prefix (existing)
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
app.post('/api/payments/create-order', paymentsHandler);
app.all('/api/integrations', integrationsHandler);
app.all('/api/integrations/:id', integrationsHandler);

// Routes without /api prefix (for frontend compatibility)
app.all('/leads', leadsHandler);
app.all('/students', studentsHandler);
app.all('/users', usersHandler);
app.all('/communications', communicationsHandler);
app.all('/documents', documentsHandler);
app.all('/payments', paymentsHandler);
app.post('/payments/create-order', paymentsHandler);
app.all('/integrations', integrationsHandler);

// Dashboard stats (additional route)
app.get('/dashboard/stats', dashboardHandler);

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

// ===========================
// ENHANCED API ROUTES
// ===========================

// Enhanced Analytics API Routes
app.all('/api/enhanced/analytics', analyticsHandler);
app.all('/api/enhanced/analytics/*', analyticsHandler);

// Enhanced Automation API Routes  
app.all('/api/enhanced/automation', automationHandler);
app.all('/api/enhanced/automation/*', automationHandler);

// Enhanced Communications API Routes (override old one)
app.all('/api/enhanced/communications', communicationsHandler);
app.all('/api/enhanced/communications/*', communicationsHandler);

// Enhanced Documents API Routes (override old one)
app.all('/api/enhanced/documents', documentsHandler);  
app.all('/api/enhanced/documents/*', documentsHandler);

// Enhanced Payments API Routes (override old one)
app.all('/api/enhanced/payments', paymentsHandler);
app.all('/api/enhanced/payments/*', paymentsHandler);

// Enhanced Notifications API Routes
app.all('/api/enhanced/notifications', notificationsHandler);
app.all('/api/enhanced/notifications/*', notificationsHandler);

// Enhanced Notes API Routes
app.all('/api/enhanced/notes', notesHandler);
app.all('/api/enhanced/notes/*', notesHandler);

// Enhanced Integration Logs API Routes
app.all('/api/enhanced/integration-logs', integrationLogsHandler);
app.all('/api/enhanced/integration-logs/*', integrationLogsHandler);

// Enhanced System Settings API Routes
app.all('/api/enhanced/system-settings', systemSettingsHandler);
app.all('/api/enhanced/system-settings/*', systemSettingsHandler);

// Enhanced Data Export API Routes
app.all('/api/enhanced/data-export', dataExportHandler);
app.all('/api/enhanced/data-export/*', dataExportHandler);

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
      'ALL /api/enhanced/analytics',
      'ALL /api/enhanced/automation',
      'ALL /api/enhanced/communications',
      'ALL /api/enhanced/documents',
      'ALL /api/enhanced/payments',
      'ALL /api/enhanced/notifications',
      'ALL /api/enhanced/notes',
      'ALL /api/enhanced/integration-logs',
      'ALL /api/enhanced/system-settings',
      'ALL /api/enhanced/data-export',
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
