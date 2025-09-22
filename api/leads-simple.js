// 🚀 SIMPLIFIED LEADS API - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Demo leads data
const DEMO_LEADS = [
  {
    id: '1',
    fullName: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+91-9876543210',
    country: 'India',
    branch: 'Mumbai',
    qualification: 'Bachelor of Engineering',
    source: 'Website',
    course: 'Web Development',
    status: 'fresh',
    assignedTo: 'admin',
    followUp: '2025-09-20',
    priority: 'high',
    notes: 'Interested in full-stack development course',
    createdAt: '2025-09-19T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+91-9876543211',
    country: 'India',
    branch: 'Delhi',
    qualification: 'Masters in Computer Science',
    source: 'Referral',
    course: 'Data Science',
    status: 'followup',
    assignedTo: 'admin',
    followUp: '2025-09-21',
    priority: 'medium',
    notes: 'Looking for data analytics career transition',
    createdAt: '2025-09-18T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  },
  {
    id: '3',
    fullName: 'Mike Davis',
    email: 'mike.davis@email.com',
    phone: '+91-9876543212',
    country: 'India',
    branch: 'Bangalore',
    qualification: 'BCA',
    source: 'Social Media',
    course: 'Mobile App Development',
    status: 'hot',
    assignedTo: 'admin',
    followUp: '2025-09-22',
    priority: 'high',
    notes: 'Ready to start next batch',
    createdAt: '2025-09-17T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  }
];

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
      // Get all leads
      return res.json({
        success: true,
        leads: DEMO_LEADS,
        total: DEMO_LEADS.length,
        message: 'Leads retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { fullName, email, phone, course, source } = req.body;
      
      // Simulate creating a new lead
      const newLead = {
        id: String(DEMO_LEADS.length + 1),
        fullName: fullName || 'New Lead',
        email: email || 'newlead@email.com',
        phone: phone || '+91-0000000000',
        country: 'India',
        branch: 'Mumbai',
        qualification: 'Not specified',
        source: source || 'Manual',
        course: course || 'General Inquiry',
        status: 'fresh',
        assignedTo: user.username,
        followUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        notes: 'New lead created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        lead: newLead,
        message: 'Lead created successfully (demo mode)'
      });
    }

    if (req.method === 'PUT') {
      // Simulate updating a lead
      const leadId = req.url.split('/').pop();
      const existingLead = DEMO_LEADS.find(l => l.id === leadId);
      
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const updatedLead = {
        ...existingLead,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        lead: updatedLead,
        message: 'Lead updated successfully (demo mode)'
      });
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