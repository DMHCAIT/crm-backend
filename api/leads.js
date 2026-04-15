// Enhanced leads API with Google Sheets support
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Verify JWT and return decoded payload (returns null if missing/invalid)
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET);
  } catch {
    return null;
  }
}

// Return array of usernames the requesting user is allowed to see leads for.
// Returns null to mean "no filter" (admin / super_admin see everything).
async function getAccessibleUsernames(user) {
  if (!user) return null; // unauthenticated — handled separately
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
    // Include self + all users whose reports_to chain reaches this user
    const { data: allUsers } = await supabase.from('users').select('id, username, reports_to');
    const visited = new Set();
    const usernames = [user.username];

    // Find the team_leader's DB id first
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

  // counselor or any other role — only their own leads
  return [user.username];
}

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

// Normalize lead fields so frontend never gets wrong types
function normalizeLead(lead) {
  if (!lead) return lead;
  // notes: stored as JSON string in DB, parse to array
  let notes = lead.notes;
  if (typeof notes === 'string') {
    try { notes = JSON.parse(notes); } catch { notes = [{ id: Date.now(), content: notes, timestamp: new Date().toISOString() }]; }
  }
  if (!Array.isArray(notes)) notes = [];

  // tags: null → empty array
  let tags = lead.tags;
  if (!Array.isArray(tags)) tags = [];

  // custom_fields: null → empty object
  let custom_fields = lead.custom_fields;
  if (!custom_fields || typeof custom_fields !== 'object' || Array.isArray(custom_fields)) custom_fields = {};

  return { ...lead, notes, tags, custom_fields };
}

// Helper function for email validation
const isValidEmail = (email) => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function for phone validation
const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\d\s+()-]{7,20}$/;
  return phoneRegex.test(phone);
};

module.exports = async (req, res) => {
  const urlPath = req.path || req.url || '';
  const isGoogleSheetsSync = urlPath.includes('google-sync');
  const isStatsRequest = urlPath.includes('/stats') || req.query.statsOnly === 'true';
  const isBulkCreate = urlPath.includes('bulk-create');

  // CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app',
    'https://crm-frontend-final.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ─── GET /api/leads/stats ── return DB-level counts without fetching all rows ───
  if (req.method === 'GET' && isStatsRequest) {
    if (!supabase) return res.status(503).json({ success: false, error: 'Database not configured' });
    try {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

      const accessibleUsernames = await getAccessibleUsernames(user);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Helper to apply role-based filter to each query
      function applyRoleFilter(q) {
        if (accessibleUsernames !== null) {
          return q.in('assignedTo', accessibleUsernames);
        }
        return q;
      }

      const [
        { count: total },
        { count: hot },
        { count: warm },
        { count: followUps },
        { count: thisMonth },
        { count: converted },
        { count: updatedToday },
        { count: overdueFollowUps }
      ] = await Promise.all([
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true })),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Hot')),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Warm')),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).not('followUp', 'is', null)),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).gte('createdAt', firstOfMonth)),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Enrolled')),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).gte('updatedAt', todayISO)),
        applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }).lt('followUp', todayISO).not('followUp', 'is', null))
      ]);

      return res.json({
        success: true,
        stats: {
          total: total || 0,
          totalLeads: total || 0,
          hot: hot || 0,
          warm: warm || 0,
          followUps: followUps || 0,
          thisMonth: thisMonth || 0,
          converted: converted || 0,
          updatedToday: updatedToday || 0,
          overdueFollowUps: overdueFollowUps || 0
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET' && isGoogleSheetsSync) {
    return res.status(200).json({
      success: true,
      message: 'Google Sheet sync endpoint is live. Use POST with JSON body and x-api-key header.',
      method: 'POST',
      contentType: 'application/json'
    });
  }

  // Check if Supabase is initialized
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
      message: 'Supabase connection is not available. Please check environment variables.'
    });
  }

  try {
    // Handle GET - Retrieve leads with optional filters
    if (req.method === 'GET') {
      try {
        const user = verifyToken(req);
        if (!user) {
          return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const accessibleUsernames = await getAccessibleUsernames(user);

        const {
          email, phone, status, source,
          assignedTo,
          limit, offset,
          page, pageSize,
          search,
          country, qualification, course, company,
          // updatedAt date filter
          dateFilter, dateFrom, dateTo, dateFilterType, specificDate,
          // createdAt date filter
          createdDateFilter, createdDateFrom, createdDateTo, createdDateFilterType, createdSpecificDate,
          // followUp date filter
          followUpFilter, followUpDateFrom, followUpDateTo, followUpDateType, followUpSpecificDate,
          showOverdueFollowUp
        } = req.query;

        // Support both page/pageSize and limit/offset
        const parsedPageSize = parseInt(pageSize) || parseInt(limit) || 50;
        const parsedPage = parseInt(page) || 1;
        const parsedLimit = Math.min(Math.max(parsedPageSize, 1), 1000);
        const parsedOffset = page
          ? (parsedPage - 1) * parsedLimit
          : Math.max(parseInt(offset) || 0, 0);

        // Build query with pagination
        let query = supabase
          .from('leads')
          .select('*', { count: 'exact' })
          .range(parsedOffset, parsedOffset + parsedLimit - 1)
          .order('createdAt', { ascending: false });

        // ── Role-based access: restrict to assigned leads for non-admin roles ──
        if (accessibleUsernames !== null) {
          query = query.in('assignedTo', accessibleUsernames);
        }

        // ── Search ──
        if (search && search.trim()) {
          const s = search.trim();
          query = query.or(
            `fullName.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,country.ilike.%${s}%,course.ilike.%${s}%,source.ilike.%${s}%,company.ilike.%${s}%`
          );
        }

        // ── Basic field filters ──
        if (email) query = query.ilike('email', `%${email}%`);
        if (phone) query = query.ilike('phone', `%${phone}%`);

        // Status — can be comma-separated list
        if (status && status !== 'all') {
          const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
          if (statuses.length === 1) {
            query = query.eq('status', statuses[0]);
          } else if (statuses.length > 1) {
            query = query.in('status', statuses);
          }
        }

        if (source && source !== 'all') query = query.ilike('source', `%${source}%`);
        if (country && country !== 'all') query = query.ilike('country', `%${country}%`);
        if (qualification && qualification !== 'all') query = query.ilike('qualification', `%${qualification}%`);
        if (course && course !== 'all') query = query.ilike('course', `%${course}%`);
        if (company && company !== 'all') query = query.ilike('company', `%${company}%`);

        // ── AssignedTo — comma-separated usernames ──
        if (assignedTo && assignedTo !== 'all') {
          const names = assignedTo.split(',').map(n => n.trim()).filter(Boolean);
          // Only allow names within the accessible set
          const allowed = accessibleUsernames === null
            ? names
            : names.filter(n => accessibleUsernames.includes(n));
          if (allowed.length === 1) {
            query = query.eq('assignedTo', allowed[0]);
          } else if (allowed.length > 1) {
            query = query.in('assignedTo', allowed);
          }
        }

        // ── Helper to build date range for IST-aware UTC timestamps ──
        // All dates from frontend are "YYYY-MM-DD" (local date). Convert to UTC range.
        function dayStart(dateStr) {
          // Treat as IST (UTC+5:30): subtract 5h30m to get UTC
          return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
        }
        function dayEnd(dateStr) {
          return new Date(`${dateStr}T23:59:59+05:30`).toISOString();
        }

        // ── Updated-At Date Filter (dateFilter) ──
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const yesterdayStr = new Date(now - 86400000).toISOString().slice(0, 10);
        const weekAgoStr = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
        const lastWeekStart = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
        const lastWeekEnd = yesterdayStr;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

        if (dateFilter && dateFilter !== 'all') {
          switch (dateFilter) {
            case 'updated_today':
              query = query.gte('updatedAt', dayStart(todayStr));
              break;
            case 'updated_yesterday':
              query = query.gte('updatedAt', dayStart(yesterdayStr)).lte('updatedAt', dayEnd(yesterdayStr));
              break;
            case 'updated_this_week':
              query = query.gte('updatedAt', dayStart(weekAgoStr));
              break;
            case 'updated_last_week':
              query = query.gte('updatedAt', dayStart(lastWeekStart)).lte('updatedAt', dayEnd(lastWeekEnd));
              break;
            case 'updated_this_month':
              query = query.gte('updatedAt', dayStart(monthStart));
              break;
            case 'today':
              query = query.gte('updatedAt', new Date(now - 24 * 3600 * 1000).toISOString());
              break;
            case 'yesterday':
              query = query.gte('updatedAt', new Date(now - 48 * 3600 * 1000).toISOString())
                           .lte('updatedAt', new Date(now - 24 * 3600 * 1000).toISOString());
              break;
            case 'recently_imported':
              query = query.gte('updatedAt', new Date(now - 7 * 86400 * 1000).toISOString());
              break;
            case 'custom': {
              const type = dateFilterType || 'between';
              if (type === 'on' && specificDate) {
                query = query.gte('updatedAt', dayStart(specificDate)).lte('updatedAt', dayEnd(specificDate));
              } else if (type === 'after' && specificDate) {
                query = query.gte('updatedAt', dayStart(specificDate));
              } else if (type === 'before' && specificDate) {
                query = query.lte('updatedAt', dayEnd(specificDate));
              } else if (type === 'between') {
                if (dateFrom) query = query.gte('updatedAt', dayStart(dateFrom));
                if (dateTo) query = query.lte('updatedAt', dayEnd(dateTo));
              }
              break;
            }
            default:
              break;
          }
        }

        // ── Created-At Date Filter ──
        // Frontend sends values prefixed with 'created_' (e.g. 'created_today', 'created_this_week')
        if (createdDateFilter && createdDateFilter !== 'all') {
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
          const lastWeekStartStr = new Date(now - 14 * 86400 * 1000).toISOString().slice(0, 10);
          const lastWeekEndStr = new Date(now - 7 * 86400 * 1000).toISOString().slice(0, 10);

          switch (createdDateFilter) {
            case 'created_today':
            case 'today':
              query = query.gte('createdAt', dayStart(todayStr));
              break;
            case 'created_yesterday':
            case 'yesterday':
              query = query.gte('createdAt', dayStart(yesterdayStr)).lte('createdAt', dayEnd(yesterdayStr));
              break;
            case 'created_this_week':
            case 'this_week':
            case 'last_7_days':
              query = query.gte('createdAt', dayStart(weekAgoStr));
              break;
            case 'created_last_week':
              query = query.gte('createdAt', dayStart(lastWeekStartStr)).lte('createdAt', dayEnd(lastWeekEndStr));
              break;
            case 'created_this_month':
            case 'this_month':
              query = query.gte('createdAt', dayStart(monthStart));
              break;
            case 'created_last_month':
              query = query.gte('createdAt', dayStart(lastMonthStart)).lte('createdAt', dayEnd(lastMonthEnd));
              break;
            case 'last_30_days':
              query = query.gte('createdAt', new Date(now - 30 * 86400 * 1000).toISOString());
              break;
            case 'created_custom':
            case 'custom': {
              // Custom range: createdDateFrom and createdDateTo (both required for between)
              if (createdDateFrom) query = query.gte('createdAt', dayStart(createdDateFrom));
              if (createdDateTo) query = query.lte('createdAt', dayEnd(createdDateTo));
              break;
            }
            case 'created_advanced':
            case 'advanced': {
              // Advanced: uses createdDateFilterType (on/after/before/between) + createdSpecificDate
              const type = createdDateFilterType || 'between';
              if (type === 'on' && createdSpecificDate) {
                query = query.gte('createdAt', dayStart(createdSpecificDate)).lte('createdAt', dayEnd(createdSpecificDate));
              } else if (type === 'after' && createdSpecificDate) {
                query = query.gte('createdAt', dayStart(createdSpecificDate));
              } else if (type === 'before' && createdSpecificDate) {
                query = query.lte('createdAt', dayEnd(createdSpecificDate));
              } else if (type === 'between') {
                if (createdDateFrom) query = query.gte('createdAt', dayStart(createdDateFrom));
                if (createdDateTo) query = query.lte('createdAt', dayEnd(createdDateTo));
              }
              break;
            }
            default:
              break;
          }
        }

        // ── Follow-Up Date Filter ──
        const nowISO = now.toISOString();
        if (showOverdueFollowUp === 'true' || followUpFilter === 'overdue') {
          query = query.lt('followUp', nowISO).not('followUp', 'is', null);
        } else if (followUpFilter && followUpFilter !== 'all') {
          switch (followUpFilter) {
            case 'today':
              query = query.gte('followUp', dayStart(todayStr)).lte('followUp', dayEnd(todayStr));
              break;
            case 'yesterday':
              query = query.gte('followUp', dayStart(yesterdayStr)).lte('followUp', dayEnd(yesterdayStr));
              break;
            case 'this_week':
              query = query.gte('followUp', dayStart(weekAgoStr));
              break;
            case 'this_month':
              query = query.gte('followUp', dayStart(monthStart));
              break;
            case 'custom': {
              const type = followUpDateType || 'between';
              if (type === 'on' && followUpSpecificDate) {
                query = query.gte('followUp', dayStart(followUpSpecificDate)).lte('followUp', dayEnd(followUpSpecificDate));
              } else if (type === 'after' && followUpSpecificDate) {
                query = query.gte('followUp', dayStart(followUpSpecificDate));
              } else if (type === 'before' && followUpSpecificDate) {
                query = query.lte('followUp', dayEnd(followUpSpecificDate));
              } else if (type === 'between') {
                if (followUpDateFrom) query = query.gte('followUp', dayStart(followUpDateFrom));
                if (followUpDateTo) query = query.lte('followUp', dayEnd(followUpDateTo));
              }
              break;
            }
            default:
              break;
          }
        }

        const { data: leads, error, count } = await query;

        if (error) {
          console.error('❌ Leads query error:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Database query failed',
            message: `Database error: ${error.message}`,
            details: 'Please check Supabase dashboard and ensure leads table exists with correct columns'
          });
        }

        const normalizedLeads = (leads || []).map(normalizeLead);
        return res.json({
          success: true,
          leads: normalizedLeads,
          data: normalizedLeads,
          count: normalizedLeads.length,
          total: count,
          totalLeads: count,
          page: parsedPage,
          pageSize: parsedLimit,
          limit: parsedLimit,
          offset: parsedOffset
        });
      } catch (dbError) {
        console.error('❌ Database error in GET:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: dbError.message || 'Failed to retrieve leads'
        });
      }
    }

    // Handle POST - Create new lead
    if (req.method === 'POST') {

      // ── POST /api/leads?action=addNote ── add a note to an existing lead ──
      if (req.query.action === 'addNote') {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { leadId, content, noteType = 'general' } = req.body;
        if (!leadId || !content) {
          return res.status(400).json({ success: false, error: 'leadId and content are required' });

        }

        // Fetch current lead to get existing notes
        const { data: lead, error: fetchError } = await supabase
          .from('leads')
          .select('notes')
          .eq('id', leadId)
          .single();

        if (fetchError || !lead) {
          return res.status(404).json({ success: false, error: 'Lead not found' });
        }

        // Parse existing notes
        let existingNotes = [];
        if (lead.notes) {
          if (typeof lead.notes === 'string') {
            try { existingNotes = JSON.parse(lead.notes); } catch { existingNotes = []; }
          } else if (Array.isArray(lead.notes)) {
            existingNotes = lead.notes;
          }
        }

        // Build new note object
        const newNote = {
          id: `note-${Date.now()}`,
          content,
          noteType,
          note_type: noteType,
          author: user.username || user.email || 'Unknown',
          authorName: user.username || user.email || 'Unknown',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        const updatedNotes = [...existingNotes, newNote];

        // Save back as JSON string
        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update({ notes: JSON.stringify(updatedNotes), updatedAt: new Date().toISOString() })
          .eq('id', leadId)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ success: false, error: 'Failed to save note', message: updateError.message });
        }

        return res.json({
          success: true,
          message: 'Note added successfully',
          note: newNote,
          data: normalizeLead(updatedLead)
        });
      }

      // ── POST /api/leads { operation: 'bulk_update' } ──
      if (req.body && req.body.operation === 'bulk_update') {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { leadIds, updateData } = req.body;
        if (!Array.isArray(leadIds) || leadIds.length === 0) {
          return res.status(400).json({ success: false, error: 'leadIds array is required' });
        }
        if (!updateData || typeof updateData !== 'object') {
          return res.status(400).json({ success: false, error: 'updateData is required' });
        }

        const cleanUpdate = { ...updateData };
        delete cleanUpdate.id;
        if (Array.isArray(cleanUpdate.notes)) cleanUpdate.notes = JSON.stringify(cleanUpdate.notes);
        if (Array.isArray(cleanUpdate.tags)) cleanUpdate.tags = JSON.stringify(cleanUpdate.tags);
        cleanUpdate.updatedAt = new Date().toISOString();

        const { data: updated, error } = await supabase
          .from('leads')
          .update(cleanUpdate)
          .in('id', leadIds)
          .select();

        if (error) {
          return res.status(500).json({ success: false, error: 'Bulk update failed', message: error.message });
        }

        return res.json({
          success: true,
          message: `${updated?.length || 0} leads updated successfully`,
          data: (updated || []).map(normalizeLead),
          count: updated?.length || 0
        });
      }

      // ── POST /api/leads { operation: 'bulk_delete' } ──
      if (req.body && req.body.operation === 'bulk_delete') {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { leadIds } = req.body;
        if (!Array.isArray(leadIds) || leadIds.length === 0) {
          return res.status(400).json({ success: false, error: 'leadIds array is required' });
        }

        const { data: deleted, error } = await supabase
          .from('leads')
          .delete()
          .in('id', leadIds)
          .select();

        if (error) {
          return res.status(500).json({ success: false, error: 'Bulk delete failed', message: error.message });
        }

        return res.json({
          success: true,
          message: `${deleted?.length || 0} leads deleted successfully`,
          count: deleted?.length || 0
        });
      }

      // ── POST /api/leads/bulk-create ── import multiple leads at once ──
      if (isBulkCreate) {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { leads: leadsToCreate } = req.body;
        if (!Array.isArray(leadsToCreate) || leadsToCreate.length === 0) {
          return res.status(400).json({ success: false, error: 'leads array is required' });
        }

        // Helper: safely parse a date string into ISO format for TIMESTAMP columns.
        // Returns null if the string is empty or not parseable.
        function safeDate(raw) {
          if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
          const d = new Date(raw.trim());
          return isNaN(d.getTime()) ? null : d.toISOString();
        }

        const results = { success: 0, failed: 0, errors: [] };
        const insertBatch = [];

        for (const lead of leadsToCreate) {
          const fullName = lead.fullName || lead.name || '';
          if (!fullName) {
            results.failed++;
            results.errors.push({ lead: fullName || 'unknown', error: 'fullName is required' });
            continue;
          }

          // Build notes as a JSON array so normalizeLead can parse it on read
          let notesArr = [];
          if (lead.notes) {
            if (Array.isArray(lead.notes)) {
              notesArr = lead.notes;
            } else if (typeof lead.notes === 'string') {
              // Try to parse as JSON first; fall back to wrapping in a note object
              try {
                const parsed = JSON.parse(lead.notes);
                notesArr = Array.isArray(parsed) ? parsed : [{ id: `note-${Date.now()}`, content: lead.notes, timestamp: new Date().toISOString(), author: user.username || 'Import' }];
              } catch {
                notesArr = [{ id: `note-${Date.now()}`, content: lead.notes, timestamp: new Date().toISOString(), author: user.username || 'Import' }];
              }
            }
          }

          insertBatch.push({
            fullName,
            email: lead.email || '',
            phone: lead.phone || '',
            country: lead.country || '',
            branch: lead.branch || '',
            qualification: lead.qualification || '',
            source: lead.source || 'import',
            course: lead.course || '',
            status: lead.status || 'Fresh',
            assignedTo: lead.assignedTo || null,
            followUp: safeDate(lead.followUp),  // parse date string to ISO, null if invalid
            priority: lead.priority || 'medium',
            notes: JSON.stringify(notesArr),
            score: typeof lead.score === 'number' ? lead.score : (parseInt(lead.score) || 0),
            company: lead.company || '',
            city: lead.city || '',
            designation: lead.designation || ''
          });
        }

        if (insertBatch.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from('leads')
            .insert(insertBatch)
            .select();

          if (insertError) {
            console.error('❌ Bulk create insert error:', insertError.message);
            return res.status(500).json({ success: false, error: 'Bulk create failed', message: insertError.message });
          }
          results.success = inserted?.length || 0;
        }

        return res.json({
          success: true,
          message: `${results.success} leads imported, ${results.failed} failed`,
          results
        });
      }

      if (isGoogleSheetsSync) {
        const syncKey = req.headers['x-api-key'];
        if (!process.env.GOOGLE_SHEETS_SYNC_KEY || syncKey !== process.env.GOOGLE_SHEETS_SYNC_KEY) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized sync request'
          });
        }
      }

      const requestData = req.body;
      
      // Support both old and new field names
      const fullName = requestData.fullName || requestData.name;
      const email = requestData.email;
      const phone = requestData.phone;
      const country = requestData.country;
      const branch = requestData.branch;
      const qualification = requestData.qualification;
      const source = requestData.source || 'manual';
      const course = requestData.course || requestData.course_interest;
      const assignedTo = requestData.assignedTo;
      const followUp = requestData.followUp;
      const priority = requestData.priority || 'medium';
      const notes = requestData.notes;
      const status = requestData.status || 'new';
      const score = requestData.score || 0;
      
      // New fields from Google Sheets / Facebook
      const adName = requestData.ad_name || requestData.adName;
      const campaignName = requestData.campaign_name || requestData.campaignName;
      const company = requestData.company;
      const city = requestData.city;
      const designation = requestData.designation;

      // Validate required fields
      if (!fullName && !email) {
        return res.status(400).json({ 
          success: false,
          error: 'At least name or email is required' 
        });
      }

      // Validate email format
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid email format' 
        });
      }

      // Validate phone format
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid phone format' 
        });
      }

      // Check for duplicates if email or phone provided
      if (email || phone) {
        try {
          let duplicateQuery = supabase.from('leads').select('id, email, phone');
          
          if (email && phone) {
            duplicateQuery = duplicateQuery.or(`email.eq.${email},phone.eq.${phone}`);
          } else if (email) {
            duplicateQuery = duplicateQuery.eq('email', email);
          } else if (phone) {
            duplicateQuery = duplicateQuery.eq('phone', phone);
          }
          
          const { data: existingLeads, error: duplicateError } = await duplicateQuery;
          
          if (!duplicateError && existingLeads && existingLeads.length > 0) {
            return res.status(409).json({
              success: false,
              error: 'Duplicate lead detected',
              message: 'A lead with this email or phone already exists',
              existingLead: existingLeads[0]
            });
          }
        } catch (duplicateCheckError) {
          console.warn('⚠️ Duplicate check failed:', duplicateCheckError.message);
          // Continue with insertion even if duplicate check fails
        }
      }

      try {
        // Build enhanced notes with campaign tracking data
        let enhancedNotes = notes || '';
        if (adName) {
          enhancedNotes += `${enhancedNotes ? '\n' : ''}Ad: ${adName}`;
        }
        if (campaignName) {
          enhancedNotes += `${enhancedNotes ? '\n' : ''}Campaign: ${campaignName}`;
        }

        // Create lead data matching the schema
        const leadData = {
          fullName: fullName || '',
          email: email || '',
          phone: phone || '',
          country: country || '',
          branch: branch || '',
          qualification: qualification || '',
          source,
          course: course || '',
          status,
          assignedTo: assignedTo || null,
          followUp: followUp || null,
          priority,
          notes: enhancedNotes,
          score: score || 0,
          // New fields
          company: company || '',
          city: city || '',
          designation: designation || ''
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
            details: error.details || 'Lead creation failed. Please check the data and try again.'
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Lead captured successfully',
          data: lead
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fallback response
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: dbError.message
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

      // Remove frontend-only / read-only fields that don't exist in the DB schema
      delete updateData.assigned_to; // alias for assignedTo — DB uses assignedTo
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.createdAt;   // read-only, set on creation only
      delete updateData.leadsByStatus;
      delete updateData.totalLeads;
      delete updateData.activeLeads;
      // Frontend Lead interface fields not in leads DB table
      delete updateData.fees;
      delete updateData.estimatedValue;
      delete updateData.estimated_value;
      delete updateData.actualRevenue;
      delete updateData.actual_revenue;
      delete updateData.salePrice;
      delete updateData.sale_price;
      delete updateData.currency;
      delete updateData.updated_by;
      delete updateData.custom_fields; // not a leads table column

      // Serialize notes array to JSON string for DB storage (notes column is TEXT)
      if (updateData.notes !== undefined && Array.isArray(updateData.notes)) {
        updateData.notes = JSON.stringify(updateData.notes);
      }

      // tags is TEXT[] in Postgres — pass as JS array directly (do NOT JSON.stringify)
      // If tags is somehow a string, leave it as-is

      // Handle field name mapping for legacy support
      if (updateData.name && !updateData.fullName) {
        updateData.fullName = updateData.name;
        delete updateData.name;
      }
      if (updateData.course_interest && !updateData.course) {
        updateData.course = updateData.course_interest;
        delete updateData.course_interest;
      }

      // Validate email if being updated (allow empty string to clear it)
      if (updateData.email && !isValidEmail(updateData.email)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid email format' 
        });
      }

      // Validate phone if being updated (allow empty string to clear it)
      if (updateData.phone && !isValidPhone(updateData.phone)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid phone format' 
        });
      }
      
      // Update timestamp
      updateData.updatedAt = new Date().toISOString();

      try {
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          console.error('❌ Lead update error:', error.message);
          return res.status(404).json({
            success: false,
            error: 'Lead not found or update failed',
            message: error.message
          });
        }

        return res.json({
          success: true,
          message: 'Lead updated successfully',
          data: normalizeLead(updatedLead),
          lead: normalizeLead(updatedLead)
        });

      } catch (dbError) {
        console.error('❌ Database error during update:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error during update',
          message: dbError.message
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
          console.error('❌ Lead deletion error:', error.message);
          return res.status(404).json({
            success: false,
            error: 'Lead not found or deletion failed',
            message: error.message
          });
        }

        return res.json({
          success: true,
          message: 'Lead deleted successfully',
          data: deletedLead
        });

      } catch (dbError) {
        console.error('❌ Database error during deletion:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error during deletion',
          message: dbError.message
        });
      }
    }

    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: `${req.method} method is not supported on this endpoint`
    });

  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Please check database configuration'
    });
  }
};
