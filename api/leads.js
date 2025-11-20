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

// Email to Username Assignment Normalization
function normalizeAssignmentField(assignmentValue) {
  if (!assignmentValue || assignmentValue === 'Unassigned') {
    return 'Unassigned';
  }
  
  // If it's already a username (no @ symbol), return as is
  if (!assignmentValue.includes('@')) {
    return assignmentValue;
  }
  
  // Email to username mapping for your team
  const emailToUsernameMap = {
    'loveleen@delhimedical.net': 'Loveleen',
    'admin@delhimedical.net': 'Admin',
    'info@delhimedical.net': 'Info', 
    'support@delhimedical.net': 'Support',
    'aslam@ibmp.in': 'Aslam',
    'roshan@ibmp.in': 'Roshan',
    'nakshatra@ibmp.in': 'Nakshatra',
    'admin@dmhca.com': 'admin',
    'system@dmhca.com': 'system'
  };
  
  // Check direct mapping first
  if (emailToUsernameMap[assignmentValue.toLowerCase()]) {
    return emailToUsernameMap[assignmentValue.toLowerCase()];
  }
  
  // Extract username from email and clean it up
  const username = assignmentValue.split('@')[0];
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
}

// Get dynamic configuration from database
async function getSystemConfig() {
  if (!supabase) {
    // Fallback static configuration
    return {
      statusOptions: ['Fresh', 'Follow Up', 'Warm', 'Hot', 'Enrolled', 'Will Enroll Later', 'Not Answering', 'Not Interested', 'Junk'],
      sourceOptions: ['Website', 'Social Media', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Partner', 'Facebook', 'WhatsApp'],
      branchOptions: ['Main Branch', 'Delhi Branch', 'Mumbai Branch', 'Bangalore Branch'],
      experienceOptions: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      countries: ['India', 'United States', 'Canada', 'United Kingdom', 'Australia'],
      qualificationOptions: ['MBBS/ FMG', 'MD/MS/DNB', 'Mch/ DM/ DNB-SS', 'BDS/MDS', 'AYUSH', 'Others'],
      courseOptions: {
        fellowship: ['Fellowship in Emergency Medicine', 'Fellowship in Cardiology', 'Fellowship in Dermatology'],
        pgDiploma: ['PG Diploma in Clinical Research', 'PG Diploma in Hospital Administration']
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
      statusOptions: configMap.status_options || ['Fresh', 'Follow Up', 'Warm', 'Hot', 'Enrolled', 'Will Enroll Later', 'Not Answering', 'Not Interested', 'Junk'],

      sourceOptions: configMap.source_options || ['Website', 'Social Media'],
      branchOptions: configMap.branch_options || ['Main Branch'],
      experienceOptions: configMap.experience_options || ['Not Specified'],
      countries: configMap.countries || ['India'],
      qualificationOptions: configMap.qualification_options || ['MBBS/ FMG', 'MD/MS/DNB', 'Mch/ DM/ DNB-SS', 'BDS/MDS', 'AYUSH', 'Others'],
      courseOptions: configMap.course_options || { fellowship: [], pgDiploma: [] }
    };
  } catch (error) {
    console.error('Error loading system config:', error);
    // Return fallback configuration
    return {
      statusOptions: ['Fresh', 'Follow Up', 'Warm', 'Hot', 'Enrolled', 'Will Enroll Later', 'Not Answering', 'Not Interested', 'Junk'],
      sourceOptions: ['Website', 'Social Media', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Partner'],
      branchOptions: ['Main Branch', 'Delhi Branch', 'Mumbai Branch', 'Bangalore Branch'],
      experienceOptions: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      countries: ['India', 'United States', 'Canada', 'United Kingdom'],
      qualificationOptions: ['MBBS/ FMG', 'MD/MS/DNB', 'Mch/ DM/ DNB-SS', 'BDS/MDS', 'AYUSH', 'Others'],
      courseOptions: {
        fellowship: ['Fellowship in Emergency Medicine', 'Fellowship in Cardiology', 'Fellowship in Dermatology'],
        pgDiploma: ['PG Diploma in Clinical Research', 'PG Diploma in Hospital Administration']
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

// Get real user name from database instead of relying on JWT token
async function getUserRealName(username) {
  if (!supabase || !username) {
    console.log('⚠️ getUserRealName: No supabase or username provided:', { supabase: !!supabase, username });
    return username || 'User';
  }
  
  try {
    console.log(`🔍 getUserRealName: Looking up user "${username}"`);
    const { data: userData, error } = await supabase
      .from('users')
      .select('name, fullName, email')
      .eq('username', username)
      .single();
    
    if (error) {
      console.log('⚠️ getUserRealName: Database error:', error.message);
      return username;
    }
    
    if (userData) {
      const realName = userData.fullName || userData.name || userData.email || username;
      console.log(`✅ getUserRealName: Found user "${username}" -> "${realName}"`);
      return realName;
    } else {
      console.log(`⚠️ getUserRealName: No user found for username "${username}"`);
      return username;
    }
  } catch (error) {
    console.log('⚠️ getUserRealName: Exception occurred:', error.message);
    return username;
  }
}

// Get all subordinate users (returns UUIDs for backward compatibility)
async function getSubordinateUsers(userId) {
  if (!supabase) return [];
  
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, email, name, username, reports_to, role');
    
    if (error) {
      console.error('Error fetching users for hierarchy:', error);
      return [];
    }
    
    const subordinates = [];
    const visited = new Set();
    
    function findSubordinates(supervisorId) {
      if (visited.has(supervisorId)) return;
      visited.add(supervisorId);
      
      allUsers.forEach(user => {
        if (user.reports_to === supervisorId && !subordinates.includes(user.id)) {
          subordinates.push(user.id);
          findSubordinates(user.id);
        }
      });
    }
    
    findSubordinates(userId);
    return subordinates;
    
  } catch (error) {
    console.error('Error getting subordinate users:', error);
    return [];
  }
}

// Get all subordinate usernames (username-only approach)
async function getSubordinateUsernames(userId) {
  if (!supabase) return [];
  
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, username, reports_to');
    
    if (error) {
      console.error('Error fetching users for hierarchy:', error);
      return [];
    }
    
    const subordinateUsernames = [];
    const visited = new Set();
    
    function findSubordinates(supervisorId) {
      if (visited.has(supervisorId)) return;
      visited.add(supervisorId);
      
      allUsers.forEach(user => {
        if (user.reports_to === supervisorId && user.username) {
          if (!subordinateUsernames.includes(user.username)) {
            subordinateUsernames.push(user.username);
          }
          findSubordinates(user.id);
        }
      });
    }
    
    findSubordinates(userId);
    return subordinateUsernames;
    
  } catch (error) {
    console.error('Error getting subordinate usernames:', error);
    return [];
  }
}

// Check if user can access a lead based on hierarchy
async function canAccessLead(lead, currentUser) {
  if (!currentUser) return false;
  
  // Standardized to username-only assignments
  const leadAssignee = lead.assigned_to || lead.assignedTo || lead.assignedcounselor;
  
  // Handle null/undefined assignee
  if (!leadAssignee) return false;
  
  // User can access their own leads - CASE-INSENSITIVE username comparison
  if (currentUser.username && leadAssignee.toLowerCase() === currentUser.username.toLowerCase()) {
    return true;
  }
  
  // Get subordinate usernames and check if lead belongs to any of them - CASE-INSENSITIVE
  const subordinateUsernames = await getSubordinateUsernames(currentUser.id);
  const lowerCaseSubordinates = subordinateUsernames.filter(u => u).map(u => u.toLowerCase());
  
  return lowerCaseSubordinates.includes(leadAssignee.toLowerCase());
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
    lead.status === 'Hot'
  ).length;

  const qualifiedLeads = leads.filter(lead => lead.status === 'Warm').length;
  const convertedLeads = leads.filter(lead => lead.status === 'Enrolled').length;
  
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
  // Enhanced CORS Headers
  const origin = req.headers.origin;
  console.log('🌐 Leads API - Origin:', origin);
  
  // Allow specific origins
  const allowedOrigins = [
    'https://www.crmdmhca.com',
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (origin && allowedOrigins.some(allowed => origin === allowed || origin.includes('vercel.app') || origin.includes('crmdmhca.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for production
    res.setHeader('Access-Control-Allow-Origin', 'https://www.crmdmhca.com');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Performance optimization headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // For lead data freshness

  if (req.method === 'OPTIONS') {
    console.log('🔧 Leads API - Handling preflight request');
    return res.status(200).end();
  }

  try {
    const jwtUser = verifyToken(req);
    
    // Get complete user details from database to ensure we have user ID for hierarchy
    let user = jwtUser;
    if (supabase && jwtUser.username) {
      try {
        const { data: fullUserData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', jwtUser.username)
          .single();
        
        if (!userError && fullUserData) {
          user = {
            ...jwtUser,
            ...fullUserData,
            // Preserve JWT fields that might not be in database
            username: jwtUser.username,
            email: jwtUser.email || fullUserData.email,
            role: fullUserData.role || jwtUser.role
          };
          console.log(`✅ Enhanced user object for ${user.username} with database details - ID: ${user.id}, Role: ${user.role}`);
        } else {
          console.log(`⚠️ Could not find user ${jwtUser.username} in database, using JWT data only`);
        }
      } catch (error) {
        console.log(`⚠️ Error fetching user details: ${error.message}, using JWT data only`);
      }
    }
    
    if (req.method === 'GET') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      try {
        // OPTIMIZED: Filter at database level for better performance
        console.log(`🔍 Leads API: Building query for user ${user.username} (${user.role}) - ID: ${user.id}`);
        
        let query = supabase
          .from('leads')
          .select(`
            id, fullName, email, phone, country, branch, qualification, 
            source, course, status, company, estimated_value, assigned_to, 
            assignedTo, assignedcounselor, experience, location, score, 
            created_at, updated_at, followUp, nextfollowup, next_follow_up, 
            notes, communications_count, updated_by
          `, { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(5000); // Reduced from 10k for better performance
        
        // Filter at database level based on role and hierarchy
        if (user.role !== 'super_admin') {
          // Get subordinate usernames for hierarchical access
          const subordinateUsernames = user.id ? await getSubordinateUsernames(user.id) : [];
          console.log(`🏢 User ${user.username} supervises: [${subordinateUsernames.join(', ')}]`);
          
          // Build list of usernames this user can see (self + subordinates)
          const accessibleUsernames = [user.username, ...subordinateUsernames].filter(Boolean);
          
          // For senior_manager and manager, also get users by role
          if (user.role === 'senior_manager' || user.role === 'manager') {
            const roleFilter = user.role === 'senior_manager' 
              ? ['manager', 'team_leader', 'counselor']
              : ['team_leader', 'counselor'];
            
            const { data: roleBasedUsers } = await supabase
              .from('users')
              .select('username')
              .in('role', roleFilter);
            
            if (roleBasedUsers) {
              roleBasedUsers.forEach(u => {
                if (u.username && !accessibleUsernames.includes(u.username)) {
                  accessibleUsernames.push(u.username);
                }
              });
            }
          }
          
          console.log(`🔑 User ${user.username} can access leads assigned to: [${accessibleUsernames.join(', ')}]`);
          
          // Apply database filter using .in() - much faster than JavaScript filter
          if (accessibleUsernames.length > 0) {
            query = query.in('assigned_to', accessibleUsernames);
          } else {
            // If no accessible usernames, return empty result
            console.log(`⚠️ User ${user.username} has no accessible usernames - returning empty result`);
            return res.status(200).json({
              success: true,
              data: [],
              count: 0,
              statusOptions: (await getSystemConfig()).statusOptions,
              pipelineStats: {
                totalLeads: 0,
                newLeads: 0,
                hotLeads: 0,
                qualifiedLeads: 0,
                convertedLeads: 0,
                conversionRate: 0,
                avgResponseTime: 0,
                revenue: 0,
                avgDealSize: 0,
                monthlyGrowth: 0
              }
            });
          }
        } else {
          console.log(`🔑 Super Admin Access: User ${user.username} can see ALL leads`);
        }
        
        // Execute optimized query
        const { data: leads, error, count } = await query;

        if (error) {
          console.error('❌ Error fetching leads:', error.message);
          console.error('❌ Get leads error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads',
            details: error.message
          });
        }
        
        console.log(`✅ User ${user.username} accessed ${leads?.length || 0} leads (total count: ${count || 0})`);

        // Get dynamic configuration
        const config = await getSystemConfig();

        // Process leads to ensure notes are properly formatted as arrays
        console.log(`🔍 Processing ${leads?.length || 0} leads for notes formatting`);
        
        const processedLeads = (leads || []).map((lead, index) => {
          let notesArray = [];
          
          if (index < 3) { // Debug first 3 leads
            console.log(`🔍 Lead ${index + 1} (${lead.id.substring(0, 8)}...):`);
            console.log(`  Raw notes type: ${typeof lead.notes}`);
            console.log(`  Raw notes value:`, lead.notes);
          }
          
          if (lead.notes) {
            try {
              // If notes is already an array (JSON), use it
              if (Array.isArray(lead.notes)) {
                notesArray = lead.notes;
                if (index < 3) console.log(`  ✅ Notes already array: ${notesArray.length} items`);
              } 
              // If notes is a JSON string, try to parse it
              else if (typeof lead.notes === 'string') {
                const trimmedNotes = lead.notes.trim();
                
                // Check if it's a JSON array string
                if (trimmedNotes.startsWith('[') && trimmedNotes.endsWith(']')) {
                  notesArray = JSON.parse(lead.notes);
                  if (index < 3) console.log(`  ✅ Parsed JSON array: ${notesArray.length} items`);
                }
                // If it's a plain text note, convert to array format
                else if (trimmedNotes.length > 0) {
                  notesArray = [{
                    id: `legacy_${Date.now()}`,
                    content: lead.notes,
                    author: 'System Migration',
                    timestamp: lead.created_at || new Date().toISOString(),
                    note_type: 'legacy'
                  }];
                  if (index < 3) console.log(`  🔄 Converted plain text to array: "${lead.notes.substring(0, 30)}..."`);
                }
              }
            } catch (error) {
              console.log(`⚠️ Error parsing notes for lead ${lead.id}:`, error.message);
              console.log(`⚠️ Original notes value:`, lead.notes);
              
              // Fallback: treat as simple string
              if (typeof lead.notes === 'string' && lead.notes.trim()) {
                notesArray = [{
                  id: `fallback_${Date.now()}`,
                  content: lead.notes,
                  author: 'System Fallback',
                  timestamp: lead.created_at || new Date().toISOString(),
                  note_type: 'fallback'
                }];
                if (index < 3) console.log(`  🔄 Fallback conversion: 1 item`);
              }
            }
          } else {
            if (index < 3) console.log(`  ℹ️ No notes found (null/empty)`);
          }
          
          // Get the raw assignment value and normalize from email to username
          const rawAssignment = lead.assigned_to || lead.assignedTo || lead.assignedcounselor || 'Unassigned';
          const normalizedAssignment = normalizeAssignmentField(rawAssignment);
          
          return {
            ...lead,
            notes: notesArray,
            // Normalize assignment fields from emails to usernames
            assignedTo: normalizedAssignment,
            assignedCounselor: normalizedAssignment,
            assigned_to: normalizedAssignment,
            // Map estimated_value from database to estimatedValue for frontend
            estimatedValue: lead.estimated_value !== undefined && lead.estimated_value !== null ? parseFloat(lead.estimated_value) || 0 : 0
          };
        });
        
        console.log(`✅ Processed ${processedLeads.length} leads with notes formatting`);

        // Calculate pipeline statistics
        const stats = calculatePipelineStats(processedLeads || []);

        return res.json({
          success: true,
          leads: processedLeads || [],
          totalCount: processedLeads?.length || 0,
          config: config,
          stats: stats,
          message: `Found ${processedLeads?.length || 0} leads`
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

    // POST: Add note to existing lead (specific handler - must come before general POST)
    if (req.method === 'POST' && req.query.action === 'addNote') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available'
        });
      }

      const { leadId, content, noteType = 'general' } = req.body;
      
      if (!leadId || !content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID and note content are required'
        });
      }

      try {
        // Get current lead with all fields for access check
        const { data: lead, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (fetchError || !lead) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }

        // Check if user has access to add notes to this lead
        const hasAccess = await canAccessLead(lead, user);
        if (!hasAccess && user.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Access denied: You can only add notes to leads assigned to you or your subordinates'
          });
        }

        // Parse existing notes
        let currentNotes = [];
        if (lead.notes) {
          try {
            currentNotes = Array.isArray(lead.notes) ? lead.notes : JSON.parse(lead.notes);
          } catch (parseError) {
            console.log('⚠️ Error parsing existing notes, creating new array');
            currentNotes = [];
          }
        }

        // Add new note with real user name from database
        const newNote = {
          id: Date.now().toString(),
          content: content.trim(),
          author: await getUserRealName(user.username),
          timestamp: new Date().toISOString(),
          note_type: noteType
        };

        currentNotes.push(newNote);

        // Update lead with new notes
        console.log(`🔍 Updating lead ${leadId} with ${currentNotes.length} notes`);
        console.log(`🔍 Notes JSON:`, JSON.stringify(currentNotes));
        
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            notes: JSON.stringify(currentNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
          throw updateError;
        }

        console.log(`✅ Successfully updated lead ${leadId} with notes`);

        // Log activity
        await logLeadActivity(
          leadId,
          'note_added',
          `Note added: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          user.username || 'System'
        );

        return res.json({
          success: true,
          data: currentNotes,
          notes: currentNotes, // For compatibility
          message: 'Note added successfully'
        });

      } catch (error) {
        console.error('❌ Error adding note:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to add note',
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

      // Check if this is a bulk operation
      if (req.body.operation === 'bulk_update') {
        const { leadIds, updateData, operationType, reason, updatedBy } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Lead IDs array is required for bulk update'
          });
        }

        if (!updateData || typeof updateData !== 'object') {
          return res.status(400).json({
            success: false,
            error: 'Update data is required for bulk update'
          });
        }

        try {
          // Prepare update data
          const cleanUpdateData = {};
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && key !== 'id') {
              cleanUpdateData[key] = updateData[key];
            }
          });

          // Standardize assignments to username-only in assigned_to field
          if (cleanUpdateData.assignedTo) {
            cleanUpdateData.assigned_to = cleanUpdateData.assignedTo;
            cleanUpdateData.assignedcounselor = cleanUpdateData.assignedTo;
          }
          if (cleanUpdateData.assignedcounselor) {
            cleanUpdateData.assigned_to = cleanUpdateData.assignedcounselor;
            cleanUpdateData.assignedTo = cleanUpdateData.assignedcounselor;
          }
          if (cleanUpdateData.assigned_to) {
            cleanUpdateData.assignedTo = cleanUpdateData.assigned_to;
            cleanUpdateData.assignedcounselor = cleanUpdateData.assigned_to;
          }

          // Add updated timestamp and user
          cleanUpdateData.updated_at = new Date().toISOString();
          cleanUpdateData.updated_by = updatedBy || user.username || 'System';

          // Update leads in database
          const { data: updatedLeads, error } = await supabase
            .from('leads')
            .update(cleanUpdateData)
            .in('id', leadIds)
            .select();

          if (error) {
            console.error('❌ Bulk update error:', error);
            return res.status(500).json({
              success: false,
              error: 'Failed to update leads',
              details: error.message
            });
          }

          // Log activities for each updated lead
          for (const lead of updatedLeads) {
            const activityDescription = operationType === 'transfer' 
              ? `Lead transferred to ${updateData.assignedTo}${reason ? `: ${reason}` : ''}` 
              : `Lead ${operationType || 'updated'}${reason ? `: ${reason}` : ''}`;
            
            await logLeadActivity(
              lead.id,
              operationType || 'bulk_update',
              activityDescription,
              updatedBy || user.username || 'System'
            );
          }

          console.log(`✅ Bulk ${operationType || 'update'} completed for ${updatedLeads.length} leads by ${updatedBy || user.username}`);

          return res.json({
            success: true,
            updatedCount: updatedLeads.length,
            updatedLeads: updatedLeads.map(lead => ({
              id: lead.id,
              fullName: lead.fullName,
              assignedTo: lead.assignedTo || lead.assignedcounselor
            })),
            message: `${updatedLeads.length} lead(s) ${operationType || 'updated'} successfully`
          });

        } catch (error) {
          console.error('❌ Bulk operation error:', error);
          return res.status(500).json({
            success: false,
            error: 'Bulk operation failed',
            details: error.message
          });
        }
      }

      // Check if this is a bulk delete operation
      if (req.body.operation === 'bulk_delete') {
        const { leadIds, updatedBy } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Lead IDs array is required for bulk delete'
          });
        }

        try {
          console.log(`🗑️ Starting bulk delete for ${leadIds.length} leads by ${updatedBy || user.username}`);

          // First, get all leads to check access permissions
          const { data: leadsToDelete, error: fetchError } = await supabase
            .from('leads')
            .select('*')
            .in('id', leadIds);

          if (fetchError) {
            console.error('❌ Error fetching leads for deletion:', fetchError);
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch leads for deletion',
              details: fetchError.message
            });
          }

          if (!leadsToDelete || leadsToDelete.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'No leads found for deletion'
            });
          }

          // Check access permissions for each lead
          const unauthorizedLeads = [];
          for (const lead of leadsToDelete) {
            const hasAccess = await canAccessLead(lead, user);
            if (!hasAccess && user.role !== 'super_admin') {
              unauthorizedLeads.push(lead.id);
            }
          }

          if (unauthorizedLeads.length > 0 && user.role !== 'super_admin') {
            return res.status(403).json({
              success: false,
              error: `Access denied: You cannot delete ${unauthorizedLeads.length} lead(s) as they are not assigned to you or your subordinates`,
              unauthorizedLeads
            });
          }

          // Delete related records first (cascade delete)
          const accessibleLeadIds = leadsToDelete.map(lead => lead.id);

          // Delete lead activities
          const { error: activitiesDeleteError } = await supabase
            .from('lead_activities')
            .delete()
            .in('lead_id', accessibleLeadIds);

          if (activitiesDeleteError) {
            console.log('⚠️ Warning: Failed to delete some lead activities:', activitiesDeleteError.message);
          }

          // Delete the leads
          const { data: deletedLeads, error: deleteError } = await supabase
            .from('leads')
            .delete()
            .in('id', accessibleLeadIds)
            .select();

          if (deleteError) {
            console.error('❌ Bulk delete error:', deleteError);
            return res.status(500).json({
              success: false,
              error: 'Failed to delete leads',
              details: deleteError.message
            });
          }

          // Log deletion activities
          for (const lead of leadsToDelete) {
            await logLeadActivity(
              lead.id,
              'bulk_delete',
              `Lead deleted from system`,
              updatedBy || user.username || 'System'
            );
          }

          const deletedCount = deletedLeads ? deletedLeads.length : accessibleLeadIds.length;
          console.log(`✅ Bulk delete completed: ${deletedCount} leads deleted by ${updatedBy || user.username}`);

          return res.json({
            success: true,
            deletedCount,
            deletedLeads: accessibleLeadIds,
            message: `${deletedCount} lead(s) deleted successfully`
          });

        } catch (error) {
          console.error('❌ Bulk delete operation error:', error);
          return res.status(500).json({
            success: false,
            error: 'Bulk delete operation failed',
            details: error.message
          });
        }
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
        company,
        estimatedValue,

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

      // Validate estimatedValue field for warm/hot leads
      if ((status === 'Warm' || status === 'Hot') && estimatedValue !== undefined) {
        const numericValue = parseFloat(estimatedValue);
        if (isNaN(numericValue) || numericValue < 0) {
          return res.status(400).json({
            success: false,
            error: 'Estimated value must be a valid positive number for warm/hot leads'
          });
        }
      }

      try {
        // Debug: Log user information during lead creation
        console.log(`👤 Creating lead - User: ${user.username} (${user.email}) - Role: ${user.role}`);
        console.log(`� Full user object from JWT:`, user);
        console.log(`�📝 Assignment intention: ${assignedTo || user.username || 'Unassigned'}`);
        console.log(`📝 assignedTo parameter:`, assignedTo);
        
        // Get user's real name for notes - with fallback logic
        const userRealName = await getUserRealName(user.username);
        console.log(`👤 User real name resolved: "${userRealName}"`);
        
        // Prepare lead data for database with all new fields
        const leadData = {
          fullName: leadName, // Use resolved name (fullName or name)
          // 'name' column doesn't exist in database - only 'fullName' exists
          email: email,
          phone: phone || '',
          country: country || 'India',
          branch: branch || 'Main Branch', // New field
          qualification: qualification || '', // Qualification field
          source: source || 'Manual Entry',
          course: course || 'Fellowship in Emergency Medicine',
          status: status || 'Fresh',
          company: company || '', // Company field for DMHCA/IBMP separation - no default
          estimated_value: estimatedValue ? parseFloat(estimatedValue) || 0 : 0, // Ensure numeric value for estimated value field

          assigned_to: assignedTo || user.username || 'Unassigned', // PRIMARY assignment field (snake_case)
          assignedTo: assignedTo || user.username || 'Unassigned',  // Match actual DB column name
          assignedcounselor: assignedTo || user.username || 'Unassigned', // Match actual DB column name (lowercase)
          notes: JSON.stringify(notes && notes.trim() ? [{
            id: Date.now().toString(),
            content: notes,
            author: userRealName,
            timestamp: new Date().toISOString(),
            note_type: 'general'
          }] : []), // Store notes as JSON array
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

        // Notes are now stored directly in the leads table as JSON

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
        // First, get the lead to check access permissions
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

        // Check if user has access to this lead
        const hasAccess = await canAccessLead(existingLead, user);
        if (!hasAccess && user.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Access denied: You can only update leads assigned to you or your subordinates'
          });
        }

        const updateData = req.body;
        console.log(`🔄 Updating lead ${leadId} with data:`, updateData);
        
        // Validate estimatedValue field for warm/hot leads in updates
        if (updateData.status && (updateData.status === 'Warm' || updateData.status === 'Hot') && updateData.estimatedValue !== undefined) {
          const numericValue = parseFloat(updateData.estimatedValue);
          if (isNaN(numericValue) || numericValue < 0) {
            return res.status(400).json({
              success: false,
              error: 'Estimated value must be a valid positive number for warm/hot leads'
            });
          }
        }
        
        // Log current assignment before update
        const currentAssignment = existingLead.assigned_to || existingLead.assignedTo || existingLead.assignedcounselor;
        console.log(`📋 Current assignment: "${currentAssignment}"`);

        // Remove undefined values and prepare update object
        const cleanUpdateData = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && key !== 'id' && key !== 'assignedCounselor') {
            // Skip assignedCounselor (camelCase) as it doesn't exist in DB schema
            cleanUpdateData[key] = updateData[key];
          }
        });

        // Enhanced assignment synchronization with debugging
        if (cleanUpdateData.assignedTo) {
          console.log(`🎯 New assignment detected: "${cleanUpdateData.assignedTo}"`);
          cleanUpdateData.assignedcounselor = cleanUpdateData.assignedTo; // Match actual DB column (lowercase)
          cleanUpdateData.assigned_to = cleanUpdateData.assignedTo; // Snake case version (PRIMARY)
          // Remove camelCase version that doesn't exist in database schema
          delete cleanUpdateData.assignedCounselor; // This column doesn't exist in DB
          console.log(`✅ Synchronized assignment fields to: "${cleanUpdateData.assigned_to}"`);
        }

        // Ensure numeric conversion for estimatedValue in updates
        if (cleanUpdateData.estimatedValue !== undefined) {
          cleanUpdateData.estimated_value = parseFloat(cleanUpdateData.estimatedValue) || 0;
          delete cleanUpdateData.estimatedValue; // Remove camelCase version
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

    if (req.method === 'DELETE') {
      const leadId = req.query.id;
      
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for deletion'
        });
      }

      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available'
        });
      }

      try {
        // Get lead details before deletion for logging and access check
        const { data: leadToDelete, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (fetchError || !leadToDelete) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }

        // Check if user has access to delete this lead
        const hasAccess = await canAccessLead(leadToDelete, user);
        if (!hasAccess && user.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Access denied: You can only delete leads assigned to you or your subordinates'
          });
        }

        // Delete related records first (cascade delete)
        // Notes are now stored in leads table as JSON, no separate cleanup needed

        // Delete lead activities
        await supabase
          .from('lead_activities')
          .delete()
          .eq('lead_id', leadId);

        // Delete the lead
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId);

        if (deleteError) {
          console.error('❌ Delete error:', deleteError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete lead',
            details: deleteError.message
          });
        }

        console.log(`✅ Lead deleted: ${leadToDelete.fullName} (${leadToDelete.email}) by ${user.username}`);

        return res.json({
          success: true,
          message: 'Lead deleted successfully',
          deletedLead: {
            id: leadToDelete.id,
            name: leadToDelete.fullName
          }
        });

      } catch (error) {
        console.error('❌ Delete lead error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete lead',
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