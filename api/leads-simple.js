// 🚀 LEADS API WITH DATABASE INTEGRATION
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Normalize lead fields so frontend never gets wrong types
function normalizeLead(lead) {
  if (!lead) return lead;
  let notes = lead.notes;
  if (typeof notes === 'string') {
    try { notes = JSON.parse(notes); } catch { notes = [{ id: Date.now(), content: notes, timestamp: new Date().toISOString() }]; }
  }
  if (!Array.isArray(notes)) notes = [];
  let tags = lead.tags;
  if (!Array.isArray(tags)) tags = [];
  let custom_fields = lead.custom_fields;
  if (!custom_fields || typeof custom_fields !== 'object' || Array.isArray(custom_fields)) custom_fields = {};
  return { ...lead, notes, tags, custom_fields };
}

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Leads Simple API: Supabase initialized');
  } else {
    logger.info('❌ Leads Simple API: Supabase credentials missing');
  }
} catch (error) {
  logger.info('❌ Leads Simple API: Supabase initialization failed:', error.message);
}

// Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Return array of usernames this user can see leads for, or null for unrestricted access.
async function getAccessibleUsernames(user) {
  if (user.role === 'super_admin' || user.role === 'admin') return null;

  // If username missing from token (old tokens), look it up by id or email
  if (!user.username && (user.id || user.email)) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('username')
      .or(user.id ? `id.eq.${user.id}` : `email.eq.${user.email}`)
      .single();
    if (dbUser?.username) user = { ...user, username: dbUser.username };
  }

  if (user.role === 'team_leader') {
    const { data: allUsers } = await supabase.from('users').select('id, username, reports_to');
    const visited = new Set();
    const usernames = [user.username];
    const self = (allUsers || []).find(u => u.username === user.username);
    if (self) {
      function collectSubordinates(supervisorId) {
        if (visited.has(supervisorId)) return;
        visited.add(supervisorId);
        (allUsers || []).forEach(u => {
          if (u.reports_to === supervisorId) {
            usernames.push(u.username);
            collectSubordinates(u.id);
          }
        });
      }
      collectSubordinates(self.id);
    }
    return usernames;
  }

  return [user.username];
}

module.exports = async (req, res) => {
  // Simple CORS
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication for all requests
    const user = verifyToken(req);
    logger.info('🔍 Leads API request from:', user.username);

    // Handle different HTTP methods
    if (req.method === 'GET') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      try {
        const accessibleUsernames = await getAccessibleUsernames(user);

        // Support page/pageSize pagination
        const { page, pageSize, assignedTo, status } = req.query;
        const parsedPageSize = Math.min(parseInt(pageSize) || 100, 1000);
        const parsedPage = Math.max(parseInt(page) || 1, 1);
        const parsedOffset = (parsedPage - 1) * parsedPageSize;

        let query = supabase
          .from('leads')
          .select('*', { count: 'exact' })
          .range(parsedOffset, parsedOffset + parsedPageSize - 1)
          .order('createdAt', { ascending: false });

        // ── Role-based access: restrict to assigned leads for non-admin roles ──
        if (accessibleUsernames !== null) {
          query = query.in('assignedTo', accessibleUsernames);
        }

        // Only honour explicit assignedTo filter if within accessible set
        if (assignedTo && assignedTo !== 'all') {
          if (accessibleUsernames === null || accessibleUsernames.includes(assignedTo)) {
            query = query.eq('assignedTo', assignedTo);
          }
        }
        if (status) query = query.eq('status', status);

        const { data: leads, error, count } = await query;

        if (error) {
          logger.info('❌ Get leads error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads',
            details: error.message
          });
        }

        const normalizedLeads = (leads || []).map(normalizeLead);
        return res.json({
          success: true,
          leads: normalizedLeads,
          data: normalizedLeads,
          total: count || 0,
          totalLeads: count || 0,
          page: parsedPage,
          pageSize: parsedPageSize,
          message: 'Leads retrieved successfully from database'
        });

      } catch (error) {
        logger.info('❌ Get leads error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leads',
          details: error.message
        });
      }
    }

    if (req.method === 'POST') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available'
        });
      }

      try {
        const { fullName, email, phone, course, source, country, branch, qualification, priority, notes, company } = req.body;
        
        // Validate required fields
        if (!fullName) {
          return res.status(400).json({
            success: false,
            error: 'Full name is required'
          });
        }

        // Create new lead in database
        const newLeadData = {
          fullName: fullName,
          email: email,
          phone: phone || '',
          country: country || 'India',
          branch: branch || 'Mumbai', 
          qualification: qualification || 'Not specified',
          source: source || 'Manual',
          course: course || 'General Inquiry',
          status: 'fresh',
          assignedTo: user.username,
          followUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: priority || 'medium',
          notes: notes || 'New lead created',
          company: company || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([newLeadData])
          .select()
          .single();

        if (error) {
          logger.info('❌ Create lead error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to create lead',
            details: error.message
          });
        }

        logger.info(`✅ Lead created: ${newLead.fullName} (${newLead.email}) by ${user.username}`);

        return res.json({
          success: true,
          lead: newLead,
          message: 'Lead created successfully in database'
        });

      } catch (error) {
        logger.info('❌ Create lead error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create lead',
          details: error.message
        });
      }
    }

    if (req.method === 'PUT') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available'
        });
      }

      try {
        const leadId = req.url.split('/').pop();
        
        if (!leadId || leadId === 'api' || leadId === 'leads-simple') {
          return res.status(400).json({
            success: false,
            error: 'Invalid lead ID'
          });
        }

        // Check if lead exists
        const { data: existingLead, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (fetchError || !existingLead) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }

        // Update lead in database
        const updateData = {
          ...req.body,
          updatedAt: new Date().toISOString(),
          updated_by: user.username
        };

        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .select()
          .single();

        if (updateError) {
          logger.info('❌ Update lead error:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update lead',
            details: updateError.message
          });
        }

        logger.info(`✅ Lead updated: ${updatedLead.fullName} (${updatedLead.email}) by ${user.username}`);

        return res.json({
          success: true,
          lead: updatedLead,
          message: 'Lead updated successfully in database'
        });

      } catch (error) {
        logger.info('❌ Update lead error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update lead',
          details: error.message
        });
      }
    }

    if (req.method === 'DELETE') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available'
        });
      }

      try {
        let leadIds = [];
        
        // Check if this is a bulk delete (request body contains leadIds array)
        if (req.body && req.body.leadIds && Array.isArray(req.body.leadIds)) {
          leadIds = req.body.leadIds;
        } else {
          // Single delete from URL parameter
          const leadId = req.url.split('/').pop();
          if (!leadId || leadId === 'api' || leadId === 'leads-simple') {
            return res.status(400).json({
              success: false,
              error: 'Invalid lead ID'
            });
          }
          leadIds = [leadId];
        }

        if (leadIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No lead IDs provided'
          });
        }

        // Get leads to be deleted for logging
        const { data: leadsToDelete, error: fetchError } = await supabase
          .from('leads')
          .select('id, fullName, email')
          .in('id', leadIds);

        if (fetchError) {
          logger.info('❌ Fetch error:', fetchError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads for deletion'
          });
        }

        if (!leadsToDelete || leadsToDelete.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'No leads found with provided IDs'
          });
        }

        const foundLeadIds = leadsToDelete.map(lead => lead.id);
        
        // Delete related records first (cascade delete)
        // Delete lead notes
        await supabase
          .from('lead_notes')
          .delete()
          .in('lead_id', foundLeadIds);

        // Delete lead activities
        await supabase
          .from('lead_activities')
          .delete()
          .in('lead_id', foundLeadIds);

        // Delete the leads
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', foundLeadIds);

        if (deleteError) {
          logger.info('❌ Delete error:', deleteError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete leads',
            details: deleteError.message
          });
        }

        // Log the deletion activity
        const deletedNames = leadsToDelete.map(lead => `${lead.fullName} (${lead.email})`).join(', ');
        logger.info(`✅ ${leadsToDelete.length} lead(s) deleted: ${deletedNames} by ${user.username}`);

        return res.json({
          success: true,
          message: `${leadsToDelete.length} lead(s) deleted successfully`,
          deletedCount: leadsToDelete.length,
          deletedLeads: leadsToDelete.map(lead => ({
            id: lead.id,
            name: lead.fullName
          }))
        });

      } catch (error) {
        logger.info('❌ Delete lead error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete leads',
          details: error.message
        });
      }
    }

  } catch (error) {
    logger.info('❌ Leads API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};