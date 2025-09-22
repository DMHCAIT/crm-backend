// 🚀 SUPABASE-CONNECTED LEADS API
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
    console.log('✅ Leads API: Supabase initialized');
  } else {
    console.log('❌ Leads API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Leads API: Supabase initialization failed:', error.message);
}

// Get dynamic configuration from database
async function getSystemConfig() {
  if (!supabase) {
    // Fallback static configuration
    return {
      statusOptions: ['hot', 'followup', 'warm', 'not interested', 'enrolled', 'fresh', 'junk'],
      priorityOptions: ['low', 'medium', 'high', 'urgent'],
      sourceOptions: ['Website', 'Social Media', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Partner', 'Facebook', 'WhatsApp'],
      branchOptions: ['Main Branch', 'Delhi Branch', 'Mumbai Branch', 'Bangalore Branch'],
      experienceOptions: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      countries: ['India', 'United States', 'Canada', 'United Kingdom', 'Australia'],
      qualificationOptions: ['MBBS', 'MD', 'MS', 'BDS', 'FMGS', 'AYUSH', 'Others'],
      courseOptions: {
        fellowship: ['Emergency Medicine', 'Cardiology', 'Dermatology'],
        pgDiploma: ['Clinical Research', 'Hospital Administration']
      }
    };
  }

  try {
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('config_key, config_value');

    if (error) throw error;

    const configMap = {};
    configs.forEach(config => {
      configMap[config.config_key] = config.config_value;
    });

    return {
      statusOptions: configMap.status_options || ['hot', 'followup', 'warm', 'not interested', 'enrolled', 'fresh', 'junk'],
      priorityOptions: configMap.priority_options || ['low', 'medium', 'high'],
      sourceOptions: configMap.source_options || ['Website', 'Social Media'],
      branchOptions: configMap.branch_options || ['Main Branch'],
      experienceOptions: configMap.experience_options || ['Not Specified'],
      countries: configMap.countries || ['India'],
      qualificationOptions: configMap.qualification_options || ['MBBS'],
      courseOptions: configMap.course_options || { fellowship: [], pgDiploma: [] }
    };
  } catch (error) {
    console.error('Error loading system config:', error);
    // Return fallback configuration
    return {
      statusOptions: ['hot', 'followup', 'warm', 'not interested', 'enrolled', 'fresh', 'junk'],
      priorityOptions: ['low', 'medium', 'high', 'urgent'],
      sourceOptions: ['Website', 'Social Media', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Partner'],
      branchOptions: ['Main Branch', 'Delhi Branch', 'Mumbai Branch', 'Bangalore Branch'],
      experienceOptions: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      countries: ['India', 'United States', 'Canada', 'United Kingdom'],
      qualificationOptions: ['MBBS', 'MD', 'MS', 'BDS', 'FMGS', 'AYUSH'],
      courseOptions: {
        fellowship: ['Emergency Medicine', 'Cardiology', 'Dermatology'],
        pgDiploma: ['Clinical Research', 'Hospital Administration']
      }
    };
  }
}

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

// Calculate pipeline statistics
function calculatePipelineStats(leads) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => {
    const createdAt = new Date(lead.created_at || lead.createdAt);
    return createdAt >= sevenDaysAgo;
  }).length;

  const hotLeads = leads.filter(lead => 
    lead.status === 'hot' || lead.priority === 'high' || lead.priority === 'urgent'
  ).length;

  const qualifiedLeads = leads.filter(lead => lead.status === 'warm').length;
  const convertedLeads = leads.filter(lead => lead.status === 'enrolled').length;
  
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Calculate monthly growth
  const thisMonthLeads = leads.filter(lead => {
    const createdAt = new Date(lead.created_at || lead.createdAt);
    return createdAt >= thirtyDaysAgo;
  }).length;

  const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const lastMonthLeads = leads.filter(lead => {
    const createdAt = new Date(lead.created_at || lead.createdAt);
    return createdAt >= lastMonthStart && createdAt < thirtyDaysAgo;
  }).length;

  const monthlyGrowth = lastMonthLeads > 0 ? ((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100 : 0;

  // Calculate average response time (placeholder - would need communications data)
  const avgResponseTime = 2.4; // Hours

  // Calculate revenue (estimated based on conversions)
  const avgDealSize = 250000; // ₹2.5L average
  const revenue = convertedLeads * avgDealSize;

  return {
    totalLeads,
    newLeads,
    hotLeads,
    qualifiedLeads,
    convertedLeads,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgResponseTime,
    revenue,
    avgDealSize,
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10
  };
}

// Log lead activity
async function logLeadActivity(leadId, activityType, description, performedBy, oldValue = null, newValue = null) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: activityType,
        description: description,
        old_value: oldValue,
        new_value: newValue,
        performed_by: performedBy
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
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
    
    if (req.method === 'GET') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      try {
        // Get all leads from database with enhanced data
        const { data: leads, error } = await supabase
          .from('leads')
          .select(`
            *,
            lead_notes:lead_notes(id, content, author, timestamp, note_type),
            recent_activities:lead_activities(id, activity_type, description, performed_by, timestamp)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching leads:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads',
            details: error.message
          });
        }

        // Get dynamic configuration
        const config = await getSystemConfig();

        // Calculate pipeline statistics
        const stats = calculatePipelineStats(leads || []);

        return res.json({
          success: true,
          leads: leads || [],
          totalCount: leads?.length || 0,
          config: config,
          stats: stats,
          message: `Found ${leads?.length || 0} leads`
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

    if (req.method === 'POST') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      // Extract lead data with all new fields
      const { 
        fullName,
        name, // Also accept 'name' field for compatibility
        email, 
        phone, 
        country, 
        branch,
        qualification, 
        source, 
        course, 
        status,
        priority,
        assignedTo,
        notes,
        experience,
        location,
        score,
        followUp
      } = req.body;

      // Use fullName or fallback to name field for compatibility
      const leadName = fullName || name;

      // Validate required fields
      if (!leadName || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
      }

      try {
        // Prepare lead data for database with all new fields
        const leadData = {
          fullName: leadName, // Use resolved name (fullName or name)
          name: leadName, // Backup field for compatibility
          email: email,
          phone: phone || '',
          country: country || 'India',
          branch: branch || 'Main Branch', // New field
          source: source || 'Manual Entry',
          course: course || 'Emergency Medicine',
          status: status || 'fresh',
          priority: priority || 'medium', // New field
          assignedTo: assignedTo || user.username || 'Unassigned',  // Match actual DB column name
          assignedcounselor: assignedTo || user.username || 'Unassigned', // Match actual DB column name (lowercase)
          notes: notes || '', // Will migrate to structured notes
          experience: experience || 'Not specified', // New field
          location: location || 'Not specified', // New field
          score: score || 0, // New field
          // communications_count will be updated by trigger, don't insert it directly
          // createdBy column doesn't exist in database schema, using created_at instead
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // lastContact and last_contact columns don't exist in database schema
          followUp: followUp || null,  // This column exists in DB as camelCase
          nextfollowup: followUp || null,  // Match actual DB column (lowercase, no underscore) 
          next_follow_up: followUp || null,  // Match actual DB column (snake_case)
          updated_by: user.username || 'System'
        };

        // Insert into database
        const { data: insertedLead, error } = await supabase
          .from('leads')
          .insert(leadData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating lead:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create lead',
            details: error.message
          });
        }

        console.log(`✅ Created new lead in database: ${fullName} (${email}) - ID: ${insertedLead.id}`);

        // Log lead creation activity
        await logLeadActivity(
          insertedLead.id,
          'lead_created',
          `Lead created: ${fullName} (${email})`,
          user.username || 'System'
        );

        // Create initial note if provided
        if (notes && notes.trim()) {
          try {
            await supabase
              .from('lead_notes')
              .insert({
                lead_id: insertedLead.id,
                content: notes,
                author: user.username || 'System',
                note_type: 'general'
              });
          } catch (noteError) {
            console.error('Error creating initial note:', noteError);
          }
        }

        return res.json({
          success: true,
          data: {
            id: insertedLead.id,
            fullName: insertedLead.fullName,
            email: insertedLead.email,
            phone: insertedLead.phone,
            country: insertedLead.country,
            branch: insertedLead.branch,
            source: insertedLead.source,
            course: insertedLead.course,
            status: insertedLead.status,
            priority: insertedLead.priority,
            assignedTo: insertedLead.assigned_to,
            experience: insertedLead.experience,
            location: insertedLead.location,
            score: insertedLead.score,
            notes: insertedLead.notes,
            createdAt: insertedLead.createdAt
          },
          message: 'Lead created successfully with all new fields'
        });
      } catch (error) {
        console.error('❌ Database error creating lead:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    if (req.method === 'PUT') {
      const leadId = req.query.id;
      
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for update'
        });
      }

      try {
        const updateData = req.body;
        console.log(`🔄 Updating lead ${leadId} with data:`, updateData);

        // Remove undefined values and prepare update object
        const cleanUpdateData = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && key !== 'id') {
            cleanUpdateData[key] = updateData[key];
          }
        });

        // Sync assignment fields to match actual database schema
        if (cleanUpdateData.assignedTo) {
          cleanUpdateData.assignedcounselor = cleanUpdateData.assignedTo; // Match actual DB column (lowercase)
        }

        // Add updated timestamp
        cleanUpdateData.updated_at = new Date().toISOString();

        // Update lead in database
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .update(cleanUpdateData)
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          console.error('❌ Database error updating lead:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to update lead',
            details: error.message
          });
        }

        if (!updatedLead) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }

        console.log('✅ Lead updated successfully:', updatedLead.id);

        // Log the update activity
        await logLeadActivity(
          leadId,
          'update',
          `Lead updated`,
          user.username || 'System'
        );

        return res.status(200).json({
          success: true,
          data: updatedLead,
          message: 'Lead updated successfully'
        });

      } catch (error) {
        console.error('❌ Error updating lead:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update lead',
          details: error.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};