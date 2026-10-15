// Enhanced leads API with Google Sheets support
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { getAccessibleUsernames: getReportingUsernames, getOwnUsername } = require('../utils/reportingHierarchy');
const { normalizeCallTime, isActiveCall } = require('../utils/callSchedule');
const {
  LEAD_STATUSES, validateLeadContact, isInternationalPhone, findContactMatches,
  describeDuplicates, resolveLeadAssignee, reviewImport
} = require('../utils/leadDuplicates');

const JWT_SECRET = process.env.JWT_SECRET;

function dayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
}

function dayEnd(dateStr) {
  return new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
}

function getLeadDateRanges(now = new Date()) {
  // Lead date filters use India calendar days, regardless of the server timezone.
  const local = new Date(now.getTime() + 330 * 60000);
  const dateAt = (daysAgo) => new Date(local.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    todayStr: dateAt(0),
    yesterdayStr: dateAt(1),
    weekAgoStr: dateAt(7),
    lastWeekStart: dateAt(14),
    monthStart: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    lastMonthStart: new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10),
    lastMonthEnd: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  };
}

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
  return getReportingUsernames(supabase, user);
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

      const now = new Date();
      const dates = getLeadDateRanges(now);
      const todayISO = dayStart(dates.todayStr);
      const firstOfMonth = dayStart(dates.monthStart);

      // Helper to apply role-based filter to each query
      function applyRoleFilter(q) {
        if (accessibleUsernames !== null) {
          return q.in('assignedTo', accessibleUsernames);
        }
        return q;
      }

      const countQuery = () => applyRoleFilter(supabase.from('leads').select('*', { count: 'exact', head: true }));
      const queries = {
        total: countQuery(),
        hot: countQuery().eq('status', 'Hot'),
        warm: countQuery().eq('status', 'Warm'),
        fresh: countQuery().eq('status', 'Fresh'),
        followup: countQuery().eq('status', 'Follow Up'),
        followUps: countQuery().not('followUp', 'is', null),
        thisMonth: countQuery().gte('createdAt', firstOfMonth),
        converted: countQuery().eq('status', 'Enrolled'),
        updatedToday: countQuery().gte('updatedAt', todayISO),
        updatedYesterday: countQuery().gte('updatedAt', dayStart(dates.yesterdayStr)).lte('updatedAt', dayEnd(dates.yesterdayStr)),
        updatedThisWeek: countQuery().gte('updatedAt', dayStart(dates.weekAgoStr)),
        updatedThisMonth: countQuery().gte('updatedAt', firstOfMonth),
        recentlyImported: countQuery().gte('updatedAt', new Date(now.getTime() - 7 * 86400000).toISOString()),
        createdToday: countQuery().gte('createdAt', todayISO),
        createdYesterday: countQuery().gte('createdAt', dayStart(dates.yesterdayStr)).lte('createdAt', dayEnd(dates.yesterdayStr)),
        createdThisWeek: countQuery().gte('createdAt', dayStart(dates.weekAgoStr)),
        createdLastMonth: countQuery().gte('createdAt', dayStart(dates.lastMonthStart)).lte('createdAt', dayEnd(dates.lastMonthEnd)),
        overdueFollowUps: applyRoleFilter(supabase.from('crm_overdue_leads').select('*', { count: 'exact', head: true }))
      };
      const results = await Promise.all(Object.entries(queries).map(async ([name, query]) => {
        const { count, error } = await query;
        if (error) throw error;
        if (typeof count !== 'number') throw new Error(`No count returned for lead bucket: ${name}`);
        return [name, count];
      }));
      const counts = Object.fromEntries(results);

      return res.json({
        success: true,
        stats: {
          ...counts,
          totalLeads: counts.total,
          statusCounts: {
            Hot: counts.hot,
            Warm: counts.warm,
            Fresh: counts.fresh,
            'Follow Up': counts.followup,
            Enrolled: counts.converted
          }
        }
      });
    } catch (err) {
      console.error('Lead bucket statistics failed:', err.message);
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
    if (req.method === 'POST' && urlPath.split('?')[0].endsWith('/duplicate-check')) {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
      const { email, phone } = req.body || {};
      if ((email !== undefined && typeof email !== 'string') ||
          (phone !== undefined && typeof phone !== 'string')) {
        return res.status(400).json({ success: false, error: 'Email and phone must be text' });
      }
      if (!(email?.trim() || phone?.trim())) {
        return res.status(400).json({ success: false, error: 'Enter an email or phone to check' });
      }
      const matches = await findContactMatches(supabase, [{ email, phone }]);
      const duplicates = await describeDuplicates(supabase, user, { email, phone }, matches, normalizeLead);
      return res.json({ success: true, duplicates });
    }

    if (req.method === 'POST' && urlPath.split('?')[0].endsWith('/import-preview')) {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
      const { leads } = req.body || {};
      if (!Array.isArray(leads) || leads.length === 0 || leads.length > 10000) {
        return res.status(400).json({ success: false, error: 'Provide between 1 and 10000 lead rows' });
      }
      const review = await reviewImport(supabase, leads);
      return res.json({ success: true, ...review });
    }

    // Handle GET - Retrieve leads with optional filters
    if (req.method === 'GET' && urlPath.split('?')[0].endsWith('/call-reminders')) {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
      const username = await getOwnUsername(supabase, user);
      const calls = [];
      for (let offset = 0; ; offset += 500) {
        let query = supabase.from('leads').select('*')
          .not('scheduledCallAt', 'is', null)
          .is('scheduledCallDismissedAt', null)
          .eq('assignedTo', username)
          .order('id', { ascending: true })
          .range(offset, offset + 499);
        const { data, error } = await query;
        if (error) {
          console.error('Scheduled call reminders failed:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Unable to load scheduled calls. Ensure scheduled-calls-migration.sql has been applied.',
            message: error.message
          });
        }
        calls.push(...data.filter(isActiveCall).map(normalizeLead));
        if (data.length < 500) break;
      }
      return res.json({ success: true, leads: calls });
    }

    if (req.method === 'POST' && req.body?.operation === 'dismiss_call') {
      const user = verifyToken(req);
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
      const { leadId, scheduledCallAt } = req.body;
      if (typeof leadId !== 'string' || !leadId.trim() || !scheduledCallAt) {
        return res.status(400).json({ success: false, error: 'Lead ID and scheduled call time are required' });
      }
      let callTime;
      try { callTime = normalizeCallTime(scheduledCallAt); }
      catch (error) { return res.status(400).json({ success: false, error: error.message }); }
      const username = await getOwnUsername(supabase, user);
      // Match the schedule as well as the lead so an old popup cannot dismiss a rescheduled call.
      let query = supabase.from('leads')
        .update({ scheduledCallDismissedAt: new Date().toISOString() })
        .eq('id', leadId).eq('scheduledCallAt', callTime)
        .eq('assignedTo', username);
      const { data, error } = await query.select().maybeSingle();
      if (error) {
        console.error('Scheduled call dismissal failed:', error.message);
        return res.status(500).json({ success: false, error: 'Unable to dismiss scheduled call', message: error.message });
      }
      if (!data) return res.status(409).json({
        success: false, error: 'The call changed or is no longer accessible. Refresh and try again.'
      });
      return res.json({ success: true, data: normalizeLead(data) });
    }

    if (req.method === 'GET') {
      try {
        const user = verifyToken(req);
        if (!user) {
          return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const accessibleUsernames = await getAccessibleUsernames(user);

        const {
          id, email, phone, status, source,
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
          .from(showOverdueFollowUp === 'true' || followUpFilter === 'overdue' ? 'crm_overdue_leads' : 'leads')
          .select('*', { count: 'exact' })
          .range(parsedOffset, parsedOffset + parsedLimit - 1)
          .order('createdAt', { ascending: false })
          .order('id', { ascending: false });

        // ── Role-based access: restrict to assigned leads for non-admin roles ──
        if (accessibleUsernames !== null) {
          query = query.in('assignedTo', accessibleUsernames);
        }
        if (id) query = query.eq('id', id);

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
        // ── Updated-At Date Filter (dateFilter) ──
        const now = new Date();
        const { todayStr, yesterdayStr, weekAgoStr, lastWeekStart, monthStart, lastMonthStart, lastMonthEnd } = getLeadDateRanges(now);
        const lastWeekEnd = yesterdayStr;

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

        let accessibleUsernames;
        const isTeamTransfer = user.role === 'team_leader' &&
          (req.body.operationType === 'transfer' || Object.prototype.hasOwnProperty.call(updateData, 'assignedTo'));
        const uniqueLeadIds = [...new Set(leadIds)];
        if (isTeamTransfer) {
          if (uniqueLeadIds.some(id => typeof id !== 'string' || !id.trim())) {
            return res.status(400).json({ success: false, error: 'Each lead ID must be a non-empty string' });
          }
          accessibleUsernames = (await getAccessibleUsernames(user)).filter(Boolean);
          if (!accessibleUsernames.includes(updateData.assignedTo)) {
            return res.status(403).json({ success: false, error: 'You can only transfer leads to members of your team' });
          }

          // Check every selection before writing; batches avoid database row/URL limits.
          for (let offset = 0; offset < uniqueLeadIds.length; offset += 200) {
            const ids = uniqueLeadIds.slice(offset, offset + 200);
            const { data: accessibleLeads, error } = await supabase
              .from('leads')
              .select('id')
              .in('id', ids)
              .in('assignedTo', accessibleUsernames);
            if (error) {
              return res.status(500).json({ success: false, error: 'Failed to verify selected leads', message: error.message });
            }
            if (!accessibleLeads || accessibleLeads.length !== ids.length) {
              return res.status(403).json({ success: false, error: 'All selected leads must belong to you or your team' });
            }
          }
        }

        const cleanUpdate = { ...updateData };
        delete cleanUpdate.id;
        delete cleanUpdate.scheduledCallDismissedAt;
        if (Object.prototype.hasOwnProperty.call(cleanUpdate, 'scheduledCallAt')) {
          return res.status(400).json({ success: false, error: 'Schedule calls individually from lead details' });
        }
        if (Array.isArray(cleanUpdate.notes)) cleanUpdate.notes = JSON.stringify(cleanUpdate.notes);
        if (Array.isArray(cleanUpdate.tags)) cleanUpdate.tags = JSON.stringify(cleanUpdate.tags);
        cleanUpdate.updatedAt = new Date().toISOString();

        if (isTeamTransfer) {
          const updated = [];
          for (let offset = 0; offset < uniqueLeadIds.length; offset += 200) {
            const { data, error } = await supabase
              .from('leads')
              .update(cleanUpdate)
              .in('id', uniqueLeadIds.slice(offset, offset + 200))
              .in('assignedTo', accessibleUsernames)
              .select();
            if (error || !data || data.length !== Math.min(200, uniqueLeadIds.length - offset)) {
              return res.status(error ? 500 : 409).json({
                success: false,
                error: 'Transfer did not complete. Some leads may have changed; refresh the list before retrying.',
                message: error?.message,
                count: updated.length + (data?.length || 0)
              });
            }
            updated.push(...data);
          }
          return res.json({
            success: true,
            message: `${updated.length} leads transferred successfully`,
            data: updated.map(normalizeLead),
            count: updated.length
          });
        }

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

        const { leads: submittedLeads, assignedTo: requestedAssignee, status: importStatus } = req.body;
        if (!Array.isArray(submittedLeads) || submittedLeads.length === 0 || submittedLeads.length > 10000) {
          return res.status(400).json({ success: false, error: 'Provide between 1 and 10000 lead rows' });
        }
        if (typeof requestedAssignee !== 'string' || !requestedAssignee.trim() || !LEAD_STATUSES.has(importStatus)) {
          return res.status(400).json({ success: false, error: 'Choose an assignee and valid status before importing' });
        }
        const importAssignee = await resolveLeadAssignee(supabase, user, requestedAssignee);
        const review = await reviewImport(supabase, submittedLeads);
        const leadsToCreate = review.accepted;

        // Helper: safely parse a date string into ISO format for TIMESTAMP columns.
        // Returns null if the string is empty or not parseable.
        function safeDate(raw) {
          if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
          const d = new Date(raw.trim());
          return isNaN(d.getTime()) ? null : d.toISOString();
        }

        const results = {
          success: 0, failed: review.invalid.length, duplicates: review.duplicates.length,
          errors: review.invalid.map(row => `Row ${row.rowNumber}: ${row.error}`)
        };

        // Build insert objects using ONLY the columns confirmed in the leads schema.
        // Do not include score / city / designation — they may not exist as DB columns.
        const insertBatch = [];

        for (const lead of leadsToCreate) {
          const fullName = (lead.fullName || lead.name || '').trim();
          if (!fullName) {
            results.failed++;
            results.errors.push(`Row skipped: missing fullName`);
            continue;
          }

          // Build notes as a JSON array so normalizeLead can parse it on read
          let notesArr = [];
          if (lead.notes) {
            if (Array.isArray(lead.notes)) {
              notesArr = lead.notes;
            } else if (typeof lead.notes === 'string') {
              try {
                const parsed = JSON.parse(lead.notes);
                notesArr = Array.isArray(parsed) ? parsed : [{ id: `note-${Date.now()}`, content: lead.notes, timestamp: new Date().toISOString(), author: user.username || 'Import' }];
              } catch {
                notesArr = [{ id: `note-${Date.now()}`, content: lead.notes, timestamp: new Date().toISOString(), author: user.username || 'Import' }];
              }
            }
          }

          const statusValue = importStatus;

          // Base row — only columns that are guaranteed to exist
          const row = {
            fullName,
            email: lead.email || '',
            phone: lead.phone || '',
            country: lead.country || '',
            branch: lead.branch || '',
            qualification: lead.qualification || '',
            source: lead.source || 'import',
            course: lead.course || '',
            status: statusValue,
            assignedTo: importAssignee,
            followUp: safeDate(lead.followUp),
            priority: lead.priority || 'medium',
            notes: JSON.stringify(notesArr),
          };

          // Conditionally add extended columns — if they don't exist in the DB,
          // the per-row error handler below will retry without them.
          if (lead.company !== undefined && lead.company !== null) row.company = lead.company || '';

          insertBatch.push(row);
        }

        // ── Attempt batch insert ──
        for (let batchStart = 0; batchStart < insertBatch.length; batchStart += 200) {
          const batch = insertBatch.slice(batchStart, batchStart + 200);
          const { data: inserted, error: batchError } = await supabase
            .from('leads')
            .insert(batch)
            .select();

          if (!batchError) {
            if (!Array.isArray(inserted)) throw new Error('Import insert returned no rows');
            results.success += inserted.length;
          } else {
            // Batch failed — fall back to per-row inserts so we get individual error info
            // and can succeed on the rows that are valid.
            console.warn('⚠️  Batch insert failed, falling back to per-row inserts. Error:', batchError.message);

            // If the error is about an unknown column, strip company and retry
            const unknownCol = batchError.code === '42703' || batchError.code === 'PGRST204';

            for (let i = 0; i < batch.length; i++) {
              const row = { ...batch[i] };
              if (unknownCol) {
                // Remove any column that might not exist in the base schema
                delete row.company;
              }

              const { error: rowError } = await supabase
                .from('leads')
                .insert([row]);

              if (rowError) {
                if (rowError.code === '23505' && /leads_unique_contact_(email|phone)/.test(rowError.message || '')) {
                  results.duplicates++;
                  continue;
                }
                results.failed++;
                results.errors.push(`Row ${leadsToCreate[batchStart + i].rowNumber} (${row.fullName}): ${rowError.message}`);
                console.error(`❌ Row ${i + 1} insert error:`, rowError.message);
              } else {
                results.success++;
              }
            }
          }
        }

        // Return 200 even when some rows failed so the frontend can show the report.
        // Only return 500 if zero rows succeeded and there were rows to insert.
        if (results.success === 0 && results.failed > 0 && insertBatch.length > 0) {
          return res.status(500).json({
            success: false,
            error: 'All rows failed to import',
            message: results.errors[0] || 'Database insert error',
            results
          });
        }

        return res.json({
          success: true,
          message: `${results.success} leads imported, ${results.duplicates} duplicates skipped, ${results.failed} failed`,
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
      const email = typeof requestData.email === 'string' ? requestData.email.trim() : requestData.email;
      const phone = typeof requestData.phone === 'string' ? requestData.phone.trim() : requestData.phone;
      const country = requestData.country;
      const branch = requestData.branch;
      const qualification = requestData.qualification;
      const source = requestData.source || 'manual';
      const course = requestData.course || requestData.course_interest;
      let assignedTo = requestData.assignedTo;
      const followUp = requestData.followUp;
      let scheduledCallAt;
      if (Object.prototype.hasOwnProperty.call(requestData, 'scheduledCallAt')) {
        try {
          scheduledCallAt = normalizeCallTime(requestData.scheduledCallAt);
          if (scheduledCallAt && Date.parse(scheduledCallAt) <= Date.now()) {
            throw new Error('Please schedule the call for a future date and time');
          }
        } catch (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      }
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

      if (!isGoogleSheetsSync) {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
        const contactError = validateLeadContact({ ...requestData, email, phone });
        if (contactError) return res.status(400).json({ success: false, error: contactError });
        assignedTo = await resolveLeadAssignee(supabase, user, assignedTo);
      }

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
      if (!isInternationalPhone(phone)) {
        return res.status(400).json({ 
          success: false,
          error: 'Phone must include +country code and 7 to 15 digits (for example +91 9876543210)'
        });
      }

      if (email || phone) {
        const existing = await findContactMatches(supabase, [{ email, phone }]);
        if (existing.length) {
          return res.status(409).json({
            success: false, error: 'Duplicate lead detected',
            message: 'A lead with this email or phone already exists'
          });
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

        // Base lead data (columns that always exist)
        const baseLeadData = {
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
          ...(scheduledCallAt !== undefined ? { scheduledCallAt } : {}),
        };

        // Extended columns — added later to the schema; include only if they have a value
        const extendedLeadData = {
          ...baseLeadData,
          score: score || 0,
          company: company || '',
          city: city || '',
          designation: designation || ''
        };

        // Try insert with all fields first; if it fails for any reason, retry with base fields only
        let lead = null;
        let insertError = null;

        const { data: leadFull, error: errorFull } = await supabase
          .from('leads')
          .insert([extendedLeadData])
          .select()
          .single();

        if (errorFull && (errorFull.code === '42703' || errorFull.code === 'PGRST204')) {
          // Retry only when older schemas lack extended columns.
          console.warn('⚠️ Full insert failed, retrying with base fields. Error:', errorFull.message);
          const { data: leadBase, error: errorBase } = await supabase
            .from('leads')
            .insert([baseLeadData])
            .select()
            .single();
          lead = leadBase;
          insertError = errorBase;
        } else {
          lead = leadFull;
          insertError = errorFull;
        }

        if (insertError) {
          if (insertError.code === '23505' && /leads_unique_contact_(email|phone)/.test(insertError.message || '')) {
            return res.status(409).json({ success: false, error: 'Duplicate lead detected', message: 'A lead with this email or phone already exists' });
          }
          console.log('❌ Lead insertion error:', insertError.message);
          return res.status(500).json({
            success: false,
            error: insertError.message || 'Database error during lead creation',
            details: insertError.details || insertError.hint || 'Lead creation failed'
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Lead captured successfully',
          data: lead
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
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
      delete updateData.scheduledCallDismissedAt;
      let scheduleUsernames;

      if (Object.prototype.hasOwnProperty.call(updateData, 'scheduledCallAt')) {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
        try { updateData.scheduledCallAt = normalizeCallTime(updateData.scheduledCallAt); }
        catch (error) { return res.status(400).json({ success: false, error: error.message }); }
        const usernames = await getAccessibleUsernames(user);
        scheduleUsernames = usernames;
        let query = supabase.from('leads').select('id, scheduledCallAt').eq('id', leadId);
        if (usernames !== null) query = query.in('assignedTo', usernames);
        const { data: existing, error } = await query.maybeSingle();
        if (error) {
          console.error('Scheduled call lookup failed:', error.message);
          return res.status(500).json({
            success: false, error: 'Unable to save scheduled call. Ensure scheduled-calls-migration.sql has been applied.',
            message: error.message
          });
        }
        if (!existing) return res.status(403).json({ success: false, error: 'Lead is not accessible' });
        const existingTime = existing.scheduledCallAt ? normalizeCallTime(existing.scheduledCallAt) : null;
        if (existingTime !== updateData.scheduledCallAt) {
          if (updateData.scheduledCallAt && Date.parse(updateData.scheduledCallAt) <= Date.now()) {
            return res.status(400).json({ success: false, error: 'Please schedule the call for a future date and time' });
          }
          updateData.scheduledCallDismissedAt = null;
        }
      }

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
        let updateQuery = supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId);
        if (scheduleUsernames !== undefined && scheduleUsernames !== null) {
          updateQuery = updateQuery.in('assignedTo', scheduleUsernames);
        }
        const { data: updatedLead, error } = await updateQuery.select().single();

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
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
