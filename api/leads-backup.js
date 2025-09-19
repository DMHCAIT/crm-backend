// 🚀 ENHANCED LEADS API WITH NOTES SYSTEM
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Initialize Supabase client for notes
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('✅ Leads API: Supabase client initialized for notes');
  }
} catch (error) {
  console.error('❌ Leads API: Supabase initialization failed:', error.message);
}

// Lead status options
const LEAD_STATUS_OPTIONS = [
  'hot',
  'warm', 
  'follow-up',
  'enrolled',
  'fresh',
  'not interested'
];

// Country list for dropdown
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Malaysia', 'Mexico', 'Morocco',
  'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
];

// Demo leads data with enhanced notes structure
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
    status: 'hot',
    assignedTo: 'admin',
    followUp: '2025-09-20',
    priority: 'high',
    notes: 'Interested in full-stack development course',
    notesHistory: [
      {
        id: 'note_1_1',
        content: 'Initial contact made. Expressed interest in full-stack development.',
        timestamp: '2025-09-19T10:30:00.000Z',
        author: 'admin',
        type: 'contact'
      },
      {
        id: 'note_1_2', 
        content: 'Follow-up scheduled for tomorrow. Sent course brochure via email.',
        timestamp: '2025-09-19T14:15:00.000Z',
        author: 'admin',
        type: 'followup'
      }
    ],
    createdAt: '2025-09-19T00:00:00.000Z',
    updatedAt: '2025-09-19T14:15:00.000Z'
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
    status: 'warm',
    assignedTo: 'admin',
    followUp: '2025-09-21',
    priority: 'medium',
    notes: 'Looking for data analytics career transition',
    notesHistory: [
      {
        id: 'note_2_1',
        content: 'Referred by existing student. Very motivated for career change.',
        timestamp: '2025-09-18T09:00:00.000Z',
        author: 'admin',
        type: 'contact'
      },
      {
        id: 'note_2_2',
        content: 'Discussed curriculum and job placement assistance. Interested in weekend batch.',
        timestamp: '2025-09-18T16:30:00.000Z', 
        author: 'admin',
        type: 'discussion'
      }
    ],
    createdAt: '2025-09-18T00:00:00.000Z',
    updatedAt: '2025-09-18T16:30:00.000Z'
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
    status: 'enrolled',
    assignedTo: 'admin',
    followUp: '2025-09-22',
    priority: 'high',
    notes: 'Ready to start next batch',
    notesHistory: [
      {
        id: 'note_3_1',
        content: 'Found us through Instagram ad. Very enthusiastic about mobile development.',
        timestamp: '2025-09-17T11:20:00.000Z',
        author: 'admin',
        type: 'contact'
      },
      {
        id: 'note_3_2',
        content: 'Completed technical assessment. Scored 85%. Ready for enrollment.',
        timestamp: '2025-09-19T15:45:00.000Z',
        author: 'admin',
        type: 'assessment'
      }
    ],
    createdAt: '2025-09-17T00:00:00.000Z',
    updatedAt: '2025-09-19T15:45:00.000Z'
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
      const url = req.url || '';
      
      // Check if this is a configuration request
      if (url.includes('/config')) {
        return res.json({
          success: true,
          config: {
            statusOptions: LEAD_STATUS_OPTIONS,
            countries: COUNTRIES,
            priorities: ['low', 'medium', 'high'],
            sources: ['Website', 'Social Media', 'Referral', 'Cold Call', 'Email Campaign', 'Walk-in']
          },
          message: 'Lead configuration retrieved successfully'
        });
      }
      
      // Check if this is a notes request
      if (url.includes('/notes')) {
        return await handleGetNotes(req, res);
      }
      
      // Check if requesting specific lead
      const leadId = url.split('/').pop();
      if (leadId && leadId !== '' && leadId !== 'leads') {
        const lead = DEMO_LEADS.find(l => l.id === leadId);
        if (lead) {
          return res.json({
            success: true,
            lead: lead,
            message: 'Lead retrieved successfully'
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'Lead not found'
          });
        }
      }
      
      // Get all leads with configuration data
      return res.json({
        success: true,
        leads: DEMO_LEADS,
        total: DEMO_LEADS.length,
        config: {
          statusOptions: LEAD_STATUS_OPTIONS,
          countries: COUNTRIES,
          priorities: ['low', 'medium', 'high'],
          sources: ['Website', 'Social Media', 'Referral', 'Cold Call', 'Email Campaign', 'Walk-in']
        },
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
        status: 'new',
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
      const url = req.url || '';
      
      // Check if this is a notes update request
      if (url.includes('/notes')) {
        return await handleAddNote(req, res, user);
      }
      
      // Regular lead update
      const leadId = url.split('/').pop();
      const existingLead = DEMO_LEADS.find(l => l.id === leadId);
      
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Handle notes update specifically
      if (req.body.notes && req.body.notes !== existingLead.notes) {
        // Add new note to history
        const newNote = {
          id: `note_${leadId}_${Date.now()}`,
          content: req.body.notes,
          timestamp: new Date().toISOString(),
          author: user.username,
          type: 'update'
        };

        if (!existingLead.notesHistory) {
          existingLead.notesHistory = [];
        }
        existingLead.notesHistory.push(newNote);
        
        console.log('📝 Added new note to lead:', leadId, 'Content:', req.body.notes);
      }

      const updatedLead = {
        ...existingLead,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      // Update the lead in our demo array
      const leadIndex = DEMO_LEADS.findIndex(l => l.id === leadId);
      if (leadIndex !== -1) {
        DEMO_LEADS[leadIndex] = updatedLead;
      }

      return res.json({
        success: true,
        lead: updatedLead,
        message: 'Lead updated successfully with notes'
      });
    }

    if (req.method === 'DELETE') {
      // Simulate deleting a lead
      const leadId = req.url.split('/').pop();
      
      return res.json({
        success: true,
        message: `Lead ${leadId} deleted successfully (demo mode)`
      });
    }

  } catch (error) {
    console.log('❌ Leads API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

// � Handle getting notes for a lead
async function handleGetNotes(req, res) {
  try {
    const leadId = req.url.split('/')[1]; // Extract lead ID from URL like /1/notes
    
    const existingLead = DEMO_LEADS.find(l => l.id === leadId);
    
    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    let allNotes = [...(existingLead.notesHistory || [])];

    // Also fetch from database if available
    if (supabase) {
      try {
        const { data: dbNotes, error } = await supabase
          .from('notes')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (!error && dbNotes) {
          // Convert database notes to our format and merge
          const formattedDbNotes = dbNotes.map(note => ({
            id: note.id,
            content: note.content,
            timestamp: note.created_at,
            author: note.author_id || 'system',
            type: note.note_type || 'note'
          }));

          // Merge and deduplicate notes (avoid duplicates by id)
          const existingIds = allNotes.map(n => n.id);
          const newDbNotes = formattedDbNotes.filter(n => !existingIds.includes(n.id));
          allNotes = [...allNotes, ...newDbNotes];
        }
      } catch (dbError) {
        console.log('⚠️ Database notes fetch failed:', dbError.message);
      }
    }
    
    return res.json({
      success: true,
      notes: allNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), // Latest first
      total: allNotes.length,
      leadId: leadId,
      message: 'Notes retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notes'
    });
  }
}

// �📝 Handle adding notes to leads
async function handleAddNote(req, res, user) {
  try {
    const leadId = req.url.split('/')[1]; // Extract lead ID from URL like /1/notes
    const { content, type = 'note' } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const existingLead = DEMO_LEADS.find(l => l.id === leadId);
    
    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Create new note with timestamp
    const newNote = {
      id: `note_${leadId}_${Date.now()}`,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      author: user.username,
      type: type
    };

    // Initialize notes history if it doesn't exist
    if (!existingLead.notesHistory) {
      existingLead.notesHistory = [];
    }

    // Add note to history
    existingLead.notesHistory.push(newNote);
    
    // Update the main notes field with the latest note
    existingLead.notes = content.trim();
    existingLead.updatedAt = new Date().toISOString();

    // If we have Supabase, also save to database
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .insert([{
            id: newNote.id,
            content: newNote.content,
            lead_id: leadId,
            user_id: user.userId || null,
            author_id: user.userId || null,
            note_type: type,
            created_at: newNote.timestamp,
            updated_at: newNote.timestamp
          }]);

        if (!error) {
          console.log('✅ Note saved to database:', newNote.id);
        }
      } catch (dbError) {
        console.log('⚠️ Note saved locally but database save failed:', dbError.message);
      }
    }

    console.log('📝 Note added successfully to lead:', leadId);

    return res.json({
      success: true,
      note: newNote,
      lead: existingLead,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('❌ Error adding note:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
}