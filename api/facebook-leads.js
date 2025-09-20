// 🔗 FACEBOOK LEAD ADS API INTEGRATION
// Fetches leads from Facebook Lead Ads and syncs to CRM database

const jwt = require('jsonwebtoken');

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('✅ Facebook Leads: Supabase initialized');
  }
} catch (error) {
  console.error('❌ Facebook Leads: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // Enhanced CORS for Facebook webhook requests
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔗 Facebook Leads API called:', req.method, req.url);

  try {
    // Handle GET - Fetch leads from Facebook API
    if (req.method === 'GET') {
      return await handleGetFacebookLeads(req, res);
    }

    // Handle POST - Webhook receiver or manual sync
    if (req.method === 'POST') {
      // Check if it's a Facebook webhook
      if (req.query['hub.mode'] === 'subscribe') {
        return await handleWebhookVerification(req, res);
      } else if (req.headers['x-hub-signature-256']) {
        return await handleWebhookReceiver(req, res);
      } else {
        return await handleManualSync(req, res);
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('❌ Facebook Leads API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Facebook integration error',
      message: error.message
    });
  }
};

// 📥 FETCH LEADS FROM FACEBOOK API
async function handleGetFacebookLeads(req, res) {
  console.log('📥 Fetching leads from Facebook Lead Ads API...');

  // Validate Facebook API credentials
  const {
    FACEBOOK_ACCESS_TOKEN,
    FACEBOOK_PAGE_ID,
    FACEBOOK_AD_ACCOUNT_ID
  } = process.env;

  if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
    return res.status(400).json({
      success: false,
      error: 'Missing Facebook API credentials',
      message: 'Please configure FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID in environment variables',
      requiredEnvVars: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID', 'FACEBOOK_AD_ACCOUNT_ID']
    });
  }

  try {
    // Get query parameters
    const { limit = 25, since, until } = req.query;
    
    // Build Facebook API URL for lead forms
    let apiUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/leadgen_forms?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,name,status,leads_count`;
    
    console.log('🔍 Fetching Facebook lead forms...');
    const formsResponse = await fetch(apiUrl);
    const formsData = await formsResponse.json();

    if (formsData.error) {
      throw new Error(`Facebook API Error: ${formsData.error.message}`);
    }

    const leadForms = formsData.data || [];
    console.log(`📋 Found ${leadForms.length} lead forms`);

    let allLeads = [];

    // Fetch leads from each form
    for (const form of leadForms) {
      try {
        let leadsUrl = `https://graph.facebook.com/v18.0/${form.id}/leads?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,created_time,field_data&limit=${limit}`;
        
        if (since) leadsUrl += `&since=${since}`;
        if (until) leadsUrl += `&until=${until}`;

        console.log(`📥 Fetching leads from form: ${form.name} (${form.id})`);
        const leadsResponse = await fetch(leadsUrl);
        const leadsData = await leadsResponse.json();

        if (leadsData.error) {
          console.error(`❌ Error fetching leads from form ${form.id}:`, leadsData.error);
          continue;
        }

        const formLeads = leadsData.data || [];
        console.log(`📊 Found ${formLeads.length} leads in form: ${form.name}`);

        // Transform Facebook lead data to CRM format
        const transformedLeads = formLeads.map(fbLead => transformFacebookLead(fbLead, form));
        allLeads = allLeads.concat(transformedLeads);

      } catch (formError) {
        console.error(`❌ Error processing form ${form.id}:`, formError);
        continue;
      }
    }

    // Save leads to database if Supabase is available
    let savedLeads = [];
    if (supabase && allLeads.length > 0) {
      try {
        console.log(`💾 Saving ${allLeads.length} Facebook leads to CRM database...`);
        
        for (const lead of allLeads) {
          try {
            // Check if lead already exists by email
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id')
              .eq('email', lead.email)
              .single();

            if (existingLead) {
              console.log(`⚠️ Lead already exists: ${lead.email}, skipping...`);
              continue;
            }

            // Insert new lead
            const { data: savedLead, error } = await supabase
              .from('leads')
              .insert([lead])
              .select()
              .single();

            if (!error && savedLead) {
              savedLeads.push(savedLead);
              console.log(`✅ Saved Facebook lead: ${lead.email}`);
            } else {
              console.error(`❌ Error saving lead ${lead.email}:`, error);
            }

          } catch (saveError) {
            console.error(`❌ Error processing lead ${lead.email}:`, saveError);
            continue;
          }
        }

      } catch (dbError) {
        console.error('❌ Database error during lead sync:', dbError);
      }
    }

    return res.json({
      success: true,
      message: 'Facebook leads fetched successfully',
      data: {
        totalFetched: allLeads.length,
        totalSaved: savedLeads.length,
        leads: allLeads,
        savedLeads: savedLeads,
        leadForms: leadForms.map(form => ({
          id: form.id,
          name: form.name,
          status: form.status,
          leadsCount: form.leads_count
        }))
      }
    });

  } catch (error) {
    console.error('❌ Facebook API fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch Facebook leads',
      message: error.message
    });
  }
}

// 🔄 TRANSFORM FACEBOOK LEAD DATA TO CRM FORMAT
function transformFacebookLead(fbLead, form) {
  console.log('🔄 Transforming Facebook lead:', fbLead.id);

  // Extract field data from Facebook lead
  const fieldData = {};
  if (fbLead.field_data && Array.isArray(fbLead.field_data)) {
    fbLead.field_data.forEach(field => {
      if (field.name && field.values && field.values.length > 0) {
        fieldData[field.name.toLowerCase()] = field.values[0];
      }
    });
  }

  // Map common Facebook lead ad fields to CRM fields
  const leadData = {
    fullName: fieldData.full_name || fieldData.name || fieldData.first_name + ' ' + (fieldData.last_name || '') || 'Facebook Lead',
    email: fieldData.email || fieldData.email_address || '',
    phone: fieldData.phone_number || fieldData.phone || fieldData.mobile || '',
    country: fieldData.country || fieldData.location || 'India',
    branch: 'Facebook Ads',
    qualification: fieldData.qualification || fieldData.education || 'Not specified',
    source: 'Facebook Ads',
    course: fieldData.course || fieldData.course_interest || fieldData.program || 'MBBS',
    status: 'new',
    assignedTo: 'Facebook Leads Team',
    followUp: '',
    priority: 'high',
    notes: `Facebook Lead ID: ${fbLead.id}\nForm: ${form.name}\nCreated: ${fbLead.created_time}\nAll Data: ${JSON.stringify(fieldData, null, 2)}`,
    tags: ['facebook', 'lead-ads', form.name.toLowerCase().replace(/\s+/g, '-')],
    createdAt: fbLead.created_time || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add custom fields for additional Facebook data
  leadData.custom_fields = {
    facebook_lead_id: fbLead.id,
    facebook_form_id: form.id,
    facebook_form_name: form.name,
    facebook_created_time: fbLead.created_time,
    facebook_raw_data: fieldData
  };

  return leadData;
}

// 🔗 WEBHOOK VERIFICATION (Required by Facebook)
async function handleWebhookVerification(req, res) {
  console.log('🔗 Facebook webhook verification request');

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'dmhca_crm_facebook_webhook_2024';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Facebook webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Facebook webhook verification failed - invalid token');
      return res.status(403).send('Forbidden');
    }
  }

  return res.status(400).send('Bad Request');
}

// 📨 WEBHOOK RECEIVER (Real-time lead notifications from Facebook)
async function handleWebhookReceiver(req, res) {
  console.log('📨 Facebook webhook notification received');

  try {
    const body = req.body;
    
    // Verify webhook signature (optional but recommended)
    // const signature = req.headers['x-hub-signature-256'];
    // if (!verifyWebhookSignature(body, signature)) {
    //   return res.status(403).send('Forbidden');
    // }

    if (body.object === 'page') {
      body.entry.forEach(async (entry) => {
        if (entry.changes) {
          entry.changes.forEach(async (change) => {
            if (change.field === 'leadgen') {
              const leadgenId = change.value.leadgen_id;
              console.log(`🎯 New Facebook lead received: ${leadgenId}`);
              
              // Fetch the full lead data and process it
              await processFacebookWebhookLead(leadgenId);
            }
          });
        }
      });

      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).send('Not Found');
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).send('Internal Server Error');
  }
}

// 🎯 PROCESS INDIVIDUAL WEBHOOK LEAD
async function processFacebookWebhookLead(leadgenId) {
  console.log(`🎯 Processing Facebook webhook lead: ${leadgenId}`);

  const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.error('❌ Missing FACEBOOK_ACCESS_TOKEN for webhook processing');
    return;
  }

  try {
    // Fetch lead details from Facebook
    const apiUrl = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,created_time,field_data,form_id`;
    const response = await fetch(apiUrl);
    const leadData = await response.json();

    if (leadData.error) {
      console.error('❌ Facebook API error:', leadData.error);
      return;
    }

    // Get form details
    const formUrl = `https://graph.facebook.com/v18.0/${leadData.form_id}?access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,name`;
    const formResponse = await fetch(formUrl);
    const formData = await formResponse.json();

    // Transform and save lead
    const transformedLead = transformFacebookLead(leadData, formData);
    
    if (supabase) {
      // Check for duplicates
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', transformedLead.email)
        .single();

      if (!existingLead) {
        const { data: savedLead, error } = await supabase
          .from('leads')
          .insert([transformedLead])
          .select()
          .single();

        if (savedLead && !error) {
          console.log(`✅ Webhook lead saved to CRM: ${transformedLead.email}`);
          
          // You can add notification logic here
          // await sendNewLeadNotification(savedLead);
          
        } else {
          console.error('❌ Error saving webhook lead:', error);
        }
      } else {
        console.log(`⚠️ Webhook lead already exists: ${transformedLead.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error processing webhook lead:', error);
  }
}

// 🔄 MANUAL SYNC TRIGGER
async function handleManualSync(req, res) {
  console.log('🔄 Manual Facebook leads sync triggered');

  const { timeRange = '7d' } = req.body;

  // Calculate since timestamp based on time range
  const now = new Date();
  let since;
  
  switch (timeRange) {
    case '1d': since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Use GET handler with date range
  req.query.since = Math.floor(since.getTime() / 1000);
  req.query.limit = req.body.limit || 50;
  req.method = 'GET';

  return await handleGetFacebookLeads(req, res);
}

// 🔐 WEBHOOK SIGNATURE VERIFICATION (Optional)
function verifyWebhookSignature(body, signature) {
  const crypto = require('crypto');
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  
  if (!APP_SECRET || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}