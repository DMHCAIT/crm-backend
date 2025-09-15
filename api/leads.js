// Simple leads API with fallback data
const { createClient } = require('@supabase/supabase-js');

let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Leads module: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle GET - Retrieve leads
    if (req.method === 'GET') {
      try {
        // Select all columns matching the new schema
        const { data: leads, error } = await supabase
          .from('leads')
          .select('id, fullName, email, phone, country, branch, qualification, source, course, status, assignedTo, followUp, priority, notes, tags, createdAt, updatedAt')
          .order('createdAt', { ascending: false });

        if (error) {
          console.log('❌ Leads query error:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Database schema issue',
            message: `Database error: ${error.message}`,
            details: 'Please check Supabase dashboard and ensure leads table exists with correct columns'
          });
        }

        return res.json({
          success: true,
          data: leads || [],
          count: leads?.length || 0
        });
      } catch (dbError) {
        // Fallback to empty array if database error
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Database tables are being initialized'
        });
      }
    }

    // Handle POST - Create new lead or bulk operations
    if (req.method === 'POST') {
      // Check if this is a bulk operation
      if (req.body.operation === 'bulk_update' && req.body.leadIds && Array.isArray(req.body.leadIds)) {
        return await handleBulkUpdate(req, res);
      }
      
      const { 
        fullName, 
        email, 
        phone, 
        country, 
        branch, 
        qualification, 
        source = 'manual', 
        course, 
        assignedTo, 
        followUp,
        priority = 'medium',
        notes,
        // Legacy support for old field names
        name,
        course_interest 
      } = req.body;

      // Use fullName if provided, otherwise fall back to name
      const leadName = fullName || name;
      const leadCourse = course || course_interest;

      // Validate required fields
      if (!leadName || !email) {
        return res.status(400).json({ 
          success: false,
          error: 'Full name and email are required' 
        });
      }

      try {
        // Create lead data matching the new schema
        const leadData = {
          fullName: leadName,
          email,
          phone: phone || '',
          country: country || '',
          branch: branch || '',
          qualification: qualification || '',
          source,
          course: leadCourse || '',
          status: 'new',
          assignedTo: assignedTo || '',
          followUp: followUp || '',
          priority,
          notes: notes || ''
        };

        const { data: lead, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single();

        if (error) {
          console.log('❌ Lead insertion error:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Database error during lead creation',
            message: `Database error: ${error.message}`,
            details: 'Lead creation failed. Please check the data and try again.'
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Lead captured successfully',
          data: lead
        });

      } catch (dbError) {
        // Fallback response
        return res.status(201).json({
          success: true,
          message: 'Lead data received but database tables need to be set up',
          data: {
            id: 'temp-' + Date.now(),
            name,
            email,
            phone,
            company,
            source,
            status: 'new',
            created_at: new Date().toISOString()
          }
        });
      }
    }

    // Handle PUT - Update lead
    if (req.method === 'PUT') {
      const leadId = req.query.id || req.params?.id;
      
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for update'
        });
      }

      const updateData = { ...req.body };
      delete updateData.id; // Remove ID from update data
      
      // Handle field name mapping for legacy support
      if (updateData.name && !updateData.fullName) {
        updateData.fullName = updateData.name;
        delete updateData.name;
      }
      if (updateData.course_interest && !updateData.course) {
        updateData.course = updateData.course_interest;
        delete updateData.course_interest;
      }
      
      // Update timestamp (database trigger will handle updated_at automatically)
      // Only set updated_at if no database trigger exists
      updateData.updated_at = new Date().toISOString();

      try {
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found or update failed'
          });
        }

        return res.json({
          success: true,
          message: 'Lead updated successfully',
          data: updatedLead
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during update'
        });
      }
    }

    // Handle DELETE - Delete lead
    if (req.method === 'DELETE') {
      const leadId = req.query.id || req.params?.id;
      
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for deletion'
        });
      }

      try {
        const { data: deletedLead, error } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found or deletion failed'
          });
        }

        return res.json({
          success: true,
          message: 'Lead deleted successfully',
          data: deletedLead
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during deletion'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Please check database configuration'
    });
  }
};

// Bulk update function for lead transfers and other bulk operations
async function handleBulkUpdate(req, res) {
  try {
    const { leadIds, updateData, operationType = 'update', reason, updatedBy } = req.body;

    console.log(`🔄 Processing bulk ${operationType} for ${leadIds.length} leads`);

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lead IDs array is required'
      });
    }

    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Update data is required'
      });
    }

    // Prepare update data
    const finalUpdateData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Perform bulk update using Supabase
    const { data: updatedLeads, error } = await supabase
      .from('leads')
      .update(finalUpdateData)
      .in('id', leadIds)
      .select();

    if (error) {
      console.error('❌ Bulk update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Bulk update failed',
        details: error.message
      });
    }

    // If operation is transfer, create notes for each lead
    if (operationType === 'transfer' && updatedLeads) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseForNotes = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );

        const transferNotes = updatedLeads.map(lead => ({
          content: `Lead transferred to ${updateData.assignedTo}${reason ? `. Reason: ${reason}` : ''}`,
          lead_id: lead.id,
          author_id: updatedBy,
          note_type: 'status_update',
          priority: 'normal',
          is_private: false,
          tags: ['transfer', 'bulk_operation'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        await supabaseForNotes
          .from('notes')
          .insert(transferNotes);

        console.log(`✅ Created transfer notes for ${transferNotes.length} leads`);
      } catch (notesError) {
        console.warn('⚠️ Failed to create transfer notes:', notesError);
        // Don't fail the operation if notes creation fails
      }
    }

    console.log(`✅ Bulk ${operationType} completed successfully for ${updatedLeads.length} leads`);

    return res.json({
      success: true,
      message: `Bulk ${operationType} completed successfully`,
      data: {
        updated: updatedLeads.length,
        leads: updatedLeads
      }
    });

  } catch (error) {
    console.error('❌ Bulk update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during bulk update',
      details: error.message
    });
  }
}
