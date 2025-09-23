// Enhanced Notes Management API with Comprehensive Features
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase conditionally
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Notes module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
    // Set CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Parse URL to determine action
    const urlParts = req.url.split('/').filter(part => part);
    const action = urlParts[urlParts.length - 1];
    const id = urlParts[urlParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (action === 'search') {
          await handleSearchNotes(req, res);
        } else if (action === 'student' && urlParts.length > 1) {
          const studentId = urlParts[urlParts.length - 1];
          await handleGetNotesByStudent(req, res, studentId);
        } else if (action === 'lead' && urlParts.length > 1) {
          const leadId = urlParts[urlParts.length - 1];
          await handleGetNotesByLead(req, res, leadId);
        } else if (action === 'reminders') {
          await handleGetReminders(req, res);
        } else if (action === 'tags') {
          await handleGetTags(req, res);
        } else {
          await handleGetNotes(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'bulk-create') {
          await handleBulkCreateNotes(req, res);
        } else {
          await handleCreateNote(req, res);
        }
        break;
      
      case 'PUT':
        await handleUpdateNote(req, res, id);
        break;
      
      case 'DELETE':
        await handleDeleteNote(req, res, id);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notes API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get notes with filtering and search
async function handleGetNotes(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      entityId,
      entityType,
      note_type,
      priority,
      is_private,
      author_id,
      tags,
      search,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    let query = supabase
      .from('notes')
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email),
        user:user_id(name, email)
      `)
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (entityId && entityType) {
      if (entityType === 'lead') {
        query = query.eq('lead_id', entityId);
      } else if (entityType === 'student') {
        query = query.eq('student_id', entityId);
      }
    }

    if (note_type) query = query.eq('note_type', note_type);
    if (priority) query = query.eq('priority', priority);
    if (is_private !== undefined) query = query.eq('is_private', is_private === 'true');
    if (author_id) query = query.eq('author_id', author_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    // Handle tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.overlaps('tags', tagArray);
    }

    // Handle text search
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Apply privacy filter - users can only see public notes and their own private notes
    query = query.or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`);

    // Apply sorting
    const ascending = sort_order === 'asc';
    query = query.order(sort_by, { ascending });

    const { data: notes, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      notes: notes || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: notes?.length === parseInt(limit)
      },
      filters: {
        entityId,
        entityType,
        note_type,
        priority,
        tags: tags?.split(',') || [],
        search
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create new note
async function handleCreateNote(req, res) {
  try {
    const user = verifyToken(req);
    console.log('🔍 Creating note for user:', user);
    
    const {
      content,
      lead_id,
      student_id,
      user_id,
      note_type = 'general',
      priority = 'normal',
      is_private = false,
      reminder_at,
      tags = [],
      metadata = {}
    } = req.body;

    console.log('📝 Note data:', { content, lead_id, student_id, note_type, priority });

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!lead_id && !student_id && !user_id) {
      return res.status(400).json({
        success: false,
        error: 'At least one of lead_id, student_id, or user_id is required'
      });
    }

    // Validate note type
    const validNoteTypes = ['general', 'follow_up', 'important', 'meeting', 'call', 'reminder', 'status_update'];
    if (!validNoteTypes.includes(note_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid note_type. Must be one of: ${validNoteTypes.join(', ')}`
      });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Verify entities exist if provided
    if (lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', lead_id)
        .single();

      if (leadError || !lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
    }

    if (student_id) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', student_id)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
    }

    // Create note in notes table with correct schema
    const { data: note, error } = await supabase
      .from('notes')
      .insert([{
        content,
        lead_id: lead_id || null,
        student_id: student_id || null,
        user_id: user_id || null,
        author_id: user.id,  // Use author_id field from actual schema
        note_type,
        priority,
        is_private: is_private === true || is_private === 'true',
        reminder_at: reminder_at || null,
        tags: Array.isArray(tags) ? tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email)
      `)
      .single();

    if (error) {
      console.error('❌ Database error creating note:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create note',
        details: error.message
      });
    }

    // Create reminder notification if reminder_at is set
    if (reminder_at) {
      try {
        await createReminderNotification(note, user);
      } catch (reminderError) {
        console.warn('⚠️ Failed to create reminder notification:', reminderError);
      }
    }

    console.log('✅ Note created successfully:', note.id);
    res.json({
      success: true,
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    console.error('❌ Notes API error:', error);
    if (error.message === 'No valid token provided' || error.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid or missing token' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        details: error.message 
      });
    }
  }
}

// Update note
async function handleUpdateNote(req, res, noteId) {
  try {
    const user = verifyToken(req);
    const {
      content,
      note_type,
      priority,
      is_private,
      reminder_at,
      tags,
      metadata
    } = req.body;

    // Check if note exists and user has permission to edit
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    // Only the author can edit their notes (unless user is admin)
    if (existingNote.author_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own notes'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (content !== undefined) updateData.content = content;
    if (note_type !== undefined) updateData.note_type = note_type;
    if (priority !== undefined) updateData.priority = priority;
    if (is_private !== undefined) updateData.is_private = is_private;
    if (reminder_at !== undefined) updateData.reminder_at = reminder_at;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email)
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Note updated successfully',
      note: updatedNote
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Delete note
async function handleDeleteNote(req, res, noteId) {
  try {
    const user = verifyToken(req);

    // Check if note exists and user has permission to delete
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    // Only the author can delete their notes (unless user is admin)
    if (existingNote.author_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own notes'
      });
    }

    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get notes by student
async function handleGetNotesByStudent(req, res, studentId) {
  try {
    const user = verifyToken(req);
    const { limit = 50, offset = 0 } = req.query;

    const { data: notes, error } = await supabase
      .from('notes')
      .select(`
        *,
        author:author_id(name, email)
      `)
      .eq('student_id', studentId)
      .or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      notes: notes || [],
      student_id: studentId
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get notes by lead
async function handleGetNotesByLead(req, res, leadId) {
  try {
    const user = verifyToken(req);
    const { limit = 50, offset = 0 } = req.query;

    const { data: notes, error } = await supabase
      .from('notes')
      .select(`
        *,
        author:author_id(name, email)
      `)
      .eq('lead_id', leadId)
      .or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      notes: notes || [],
      lead_id: leadId
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Search notes
async function handleSearchNotes(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      q, 
      entity_type,
      note_type,
      priority,
      tags,
      limit = 20 
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    let query = supabase
      .from('notes')
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email)
      `)
      .or(`content.ilike.%${q}%,tags.cs.{${q}}`)
      .or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Apply additional filters
    if (entity_type === 'lead') {
      query = query.not('lead_id', 'is', null);
    } else if (entity_type === 'student') {
      query = query.not('student_id', 'is', null);
    }

    if (note_type) query = query.eq('note_type', note_type);
    if (priority) query = query.eq('priority', priority);
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.overlaps('tags', tagArray);
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      notes: notes || [],
      search_query: q,
      total_results: notes?.length || 0
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get reminders (notes with reminder_at set)
async function handleGetReminders(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      upcoming_only = true,
      limit = 20 
    } = req.query;

    let query = supabase
      .from('notes')
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email)
      `)
      .not('reminder_at', 'is', null)
      .or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`)
      .order('reminder_at', { ascending: true })
      .limit(parseInt(limit));

    if (upcoming_only === 'true') {
      query = query.gte('reminder_at', new Date().toISOString());
    }

    const { data: reminders, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      reminders: reminders || [],
      upcoming_only: upcoming_only === 'true'
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get all available tags
async function handleGetTags(req, res) {
  try {
    const user = verifyToken(req);

    const { data: notes, error } = await supabase
      .from('notes')
      .select('tags')
      .or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${user.id})`);

    if (error) throw error;

    // Extract and count all tags
    const tagCounts = {};
    notes?.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Sort tags by usage count
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      tags: sortedTags
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Bulk create notes
async function handleBulkCreateNotes(req, res) {
  try {
    const user = verifyToken(req);
    const { notes } = req.body;

    if (!Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Notes array is required and cannot be empty'
      });
    }

    // Validate and prepare notes for insertion
    const notesData = notes.map(note => ({
      content: note.content,
      lead_id: note.lead_id || null,
      student_id: note.student_id || null,
      user_id: note.user_id || null,
      author_id: user.id,
      note_type: note.note_type || 'general',
      priority: note.priority || 'normal',
      is_private: note.is_private === true || note.is_private === 'true',
      reminder_at: note.reminder_at || null,
      tags: Array.isArray(note.tags) ? note.tags : [],
      metadata: note.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: createdNotes, error } = await supabase
      .from('notes')
      .insert(notesData)
      .select(`
        *,
        lead:lead_id(fullName, email, phone),
        student:student_id(name, email, phone),
        author:author_id(name, email)
      `);

    if (error) throw error;

    res.json({
      success: true,
      message: `${createdNotes?.length || 0} notes created successfully`,
      notes: createdNotes || [],
      created_count: createdNotes?.length || 0
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper function to create reminder notification
async function createReminderNotification(note, user) {
  try {
    const entityName = note.lead?.fullName || note.student?.name || 'Unknown';
    const entityType = note.lead_id ? 'lead' : note.student_id ? 'student' : 'user';

    await supabase
      .from('notifications')
      .insert([{
        title: 'Note Reminder',
        message: `Reminder for ${entityType}: ${entityName} - ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`,
        type: 'reminder',
        user_id: user.id,
        lead_id: note.lead_id,
        student_id: note.student_id,
        priority: note.priority,
        metadata: {
          note_id: note.id,
          reminder_type: 'note_reminder'
        },
        expires_at: new Date(Date.parse(note.reminder_at) + 24 * 60 * 60 * 1000).toISOString(), // Expire after 1 day
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Failed to create reminder notification:', error);
  }
}

// Helper function to get note statistics
async function getNoteStatistics(entityId = null, entityType = null, userId = null) {
  try {
    let query = supabase.from('notes').select('note_type, priority, created_at');
    
    if (entityId && entityType) {
      if (entityType === 'lead') {
        query = query.eq('lead_id', entityId);
      } else if (entityType === 'student') {
        query = query.eq('student_id', entityId);
      }
    }

    if (userId) {
      query = query.or(`is_private.eq.false,and(is_private.eq.true,author_id.eq.${userId})`);
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    const stats = {
      total: notes?.length || 0,
      by_type: {},
      by_priority: {},
      recent_count: 0 // Last 7 days
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    notes?.forEach(note => {
      // Count by type
      stats.by_type[note.note_type] = (stats.by_type[note.note_type] || 0) + 1;
      
      // Count by priority
      stats.by_priority[note.priority] = (stats.by_priority[note.priority] || 0) + 1;
      
      // Count recent notes
      if (new Date(note.created_at) >= sevenDaysAgo) {
        stats.recent_count++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting note statistics:', error);
    return null;
  }
}