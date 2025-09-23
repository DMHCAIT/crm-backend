// 🚀 ENHANCED LEAD NOTES API - STRUCTURED NOTES MANAGEMENT
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
    console.log('✅ Lead Notes API: Supabase initialized');
  } else {
    console.log('❌ Lead Notes API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Lead Notes API: Supabase initialization failed:', error.message);
}

// Note types
const NOTE_TYPES = [
  'general',
  'follow_up',
  'meeting',
  'call',
  'email',
  'whatsapp',
  'status_update',
  'qualification',
  'objection',
  'payment',
  'enrollment',
  'complaint',
  'feedback'
];

// Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
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
  // CORS Headers
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
    const user = verifyToken(req);
    console.log('🔍 Lead Notes API request from:', user.username);

    // Extract lead ID from URL path
    const urlParts = req.url.split('/').filter(part => part);
    const leadId = urlParts[0]; // First part should be lead ID

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: 'Lead ID is required'
      });
    }

    if (req.method === 'GET') {
      return await handleGetLeadNotes(req, res, leadId);
    }

    if (req.method === 'POST') {
      return await handleAddLeadNote(req, res, leadId, user);
    }

    if (req.method === 'PUT') {
      return await handleUpdateLeadNote(req, res, leadId, user);
    }

    if (req.method === 'DELETE') {
      return await handleDeleteLeadNote(req, res, leadId, user);
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.log('❌ Lead Notes API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

// 📖 Get all notes for a specific lead
async function handleGetLeadNotes(req, res, leadId) {
  try {
    if (supabase) {
      // Try to get from database first
      const { data: notes, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (!error && notes) {
        const formattedNotes = notes.map(note => ({
          id: note.id,
          content: note.content,
          timestamp: note.created_at,
          author: note.author || 'system',  // Fixed: use 'author' not 'author_id'
          type: note.note_type || 'general',
          isPrivate: note.is_private || false
        }));

        return res.json({
          success: true,
          notes: formattedNotes,
          total: formattedNotes.length,
          leadId: leadId,
          source: 'database',
          message: 'Notes retrieved from database'
        });
      }
    }

    // Fallback: return empty notes if database fails
    console.log('⚠️ Database unavailable, returning empty notes');
    return res.json({
      success: true,
      notes: [],
      total: 0,
      leadId: leadId,
      source: 'fallback',
      message: 'No notes found (database unavailable)'
    });

  } catch (error) {
    console.error('❌ Error getting lead notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get lead notes'
    });
  }
}

// 📝 Add a new note to a specific lead
async function handleAddLeadNote(req, res, leadId, user) {
  try {
    const { content, type = 'note', isPrivate = false } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const noteId = `note_${leadId}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newNote = {
      id: noteId,
      content: content.trim(),
      lead_id: leadId,
      user_id: user.userId || null,
      author_id: user.userId || user.username,
      note_type: type,
      is_private: isPrivate,
      created_at: timestamp,
      updated_at: timestamp
    };

    // Save to database if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('lead_notes')
          .insert([{
            lead_id: leadId,
            content: content.trim(),
            author: user.username || 'System',
            note_type: type || 'general',  // Fixed: use 'type' not 'note_type' 
            is_private: isPrivate || false,  // Fixed: use 'isPrivate' not 'is_private'
            timestamp: timestamp,
            created_at: timestamp,
            updated_at: timestamp
          }])
          .select()
          .single();

        if (!error && data) {
          console.log('✅ Note saved to database:', data.id);
          
          return res.json({
            success: true,
            note: {
              id: data.id,
              content: data.content,
              timestamp: data.created_at,
              author: data.author,  // Fixed: use 'author' not 'author_id'
              type: data.note_type,
              isPrivate: data.is_private
            },
            leadId: leadId,
            source: 'database',
            message: 'Note added successfully to database'
          });
        }
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
      }
    }

    // Fallback: return success even if database fails
    console.log('⚠️ Note created but not saved to database');
    return res.json({
      success: true,
      note: {
        id: noteId,
        content: content.trim(),
        timestamp: timestamp,
        author: user.username,
        type: type,
        isPrivate: isPrivate
      },
      leadId: leadId,
      source: 'memory',
      message: 'Note created (database save failed)'
    });

  } catch (error) {
    console.error('❌ Error adding lead note:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
}

// ✏️ Update an existing note
async function handleUpdateLeadNote(req, res, leadId, user) {
  try {
    const { noteId, content } = req.body;

    if (!noteId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note ID and content are required'
      });
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('lead_notes')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('lead_id', leadId)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          note: {
            id: data.id,
            content: data.content,
            timestamp: data.updated_at,
            author: data.author,  // Fixed: use 'author' not 'author_id'
            type: data.note_type,
            isPrivate: data.is_private
          },
          message: 'Note updated successfully'
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Note not found or database unavailable'
    });

  } catch (error) {
    console.error('❌ Error updating note:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update note'
    });
  }
}

// 🗑️ Delete a note
async function handleDeleteLeadNote(req, res, leadId, user) {
  try {
    const { noteId } = req.body;

    if (!noteId) {
      return res.status(400).json({
        success: false,
        message: 'Note ID is required'
      });
    }

    if (supabase) {
      const { error } = await supabase
        .from('lead_notes')
        .delete()
        .eq('id', noteId)
        .eq('lead_id', leadId);

      if (!error) {
        return res.json({
          success: true,
          message: 'Note deleted successfully'
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Note not found or database unavailable'
    });

  } catch (error) {
    console.error('❌ Error deleting note:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note'
    });
  }
}