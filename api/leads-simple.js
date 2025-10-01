// 🚀 LEADS API WITH DATABASE INTEGRATION
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
    console.log('✅ Leads Simple API: Supabase initialized');
  } else {
    console.log('❌ Leads Simple API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Leads Simple API: Supabase initialization failed:', error.message);
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
    console.log('🔍 Leads API request from:', user.username);

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
        // Get all leads from database
        const { data: leads, error } = await supabase
          .from('leads')
          .select('*')
          .order('createdAt', { ascending: false });

        if (error) {
          console.log('❌ Get leads error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads',
            details: error.message
          });
        }

        return res.json({
          success: true,
          leads: leads || [],
          total: (leads || []).length,
          message: 'Leads retrieved successfully from database'
        });

      } catch (error) {
        console.log('❌ Get leads error:', error);
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
        if (!fullName || !email) {
          return res.status(400).json({
            success: false,
            error: 'Full name and email are required'
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
          company: company || 'DMHCA',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([newLeadData])
          .select()
          .single();

        if (error) {
          console.log('❌ Create lead error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to create lead',
            details: error.message
          });
        }

        console.log(`✅ Lead created: ${newLead.fullName} (${newLead.email}) by ${user.username}`);

        return res.json({
          success: true,
          lead: newLead,
          message: 'Lead created successfully in database'
        });

      } catch (error) {
        console.log('❌ Create lead error:', error);
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
          console.log('❌ Update lead error:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update lead',
            details: updateError.message
          });
        }

        console.log(`✅ Lead updated: ${updatedLead.fullName} (${updatedLead.email}) by ${user.username}`);

        return res.json({
          success: true,
          lead: updatedLead,
          message: 'Lead updated successfully in database'
        });

      } catch (error) {
        console.log('❌ Update lead error:', error);
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
          console.log('❌ Fetch error:', fetchError);
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
          console.log('❌ Delete error:', deleteError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete leads',
            details: deleteError.message
          });
        }

        // Log the deletion activity
        const deletedNames = leadsToDelete.map(lead => `${lead.fullName} (${lead.email})`).join(', ');
        console.log(`✅ ${leadsToDelete.length} lead(s) deleted: ${deletedNames} by ${user.username}`);

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
        console.log('❌ Delete lead error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete leads',
          details: error.message
        });
      }
    }

  } catch (error) {
    console.log('❌ Leads API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};