/**
 * LEAD ASSIGNMENT FIX - Check for leads assigned to emails instead of usernames
 * This will help identify and fix the dashboard leads display issue
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// This endpoint will help debug lead assignment issues
app.get('/debug-leads-assignment', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking lead assignment issues...');
    
    // Import Supabase client (same as in leads.js)
    const { createClient } = require('@supabase/supabase-js');
    
    let supabase = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      console.log('✅ Supabase client initialized');
    } else {
      return res.status(500).json({
        success: false,
        error: 'Supabase not configured'
      });
    }
    
    // 1. Get all users with their usernames and emails
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, name');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return res.status(500).json({ success: false, error: usersError.message });
    }
    
    console.log(`👥 Found ${users.length} users`);
    
    // 2. Get all leads with assignment fields
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, fullName, email, assigned_to, assignedTo, assignedcounselor, created_at')
      .order('created_at', { ascending: false })
      .limit(20); // Get recent leads for debugging
    
    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return res.status(500).json({ success: false, error: leadsError.message });
    }
    
    console.log(`📋 Found ${leads.length} recent leads`);
    
    // 3. Analyze assignment patterns
    const assignmentAnalysis = {
      totalLeads: leads.length,
      assignedToEmail: 0,
      assignedToUsername: 0,
      unassigned: 0,
      mismatched: 0,
      leadDetails: []
    };
    
    const userEmailToUsername = {};
    const userUsernameToEmail = {};
    users.forEach(user => {
      userEmailToUsername[user.email] = user.username;
      userUsernameToEmail[user.username] = user.email;
    });
    
    leads.forEach(lead => {
      const assignee = lead.assigned_to || lead.assignedTo || lead.assignedcounselor;
      
      let category = 'unassigned';
      if (assignee) {
        if (assignee.includes('@')) {
          category = 'email';
          assignmentAnalysis.assignedToEmail++;
        } else {
          category = 'username';
          assignmentAnalysis.assignedToUsername++;
        }
        
        // Check if assignment is correct
        const isEmailAssignment = assignee.includes('@');
        if (isEmailAssignment && !userEmailToUsername[assignee]) {
          assignmentAnalysis.mismatched++;
        } else if (!isEmailAssignment && !userUsernameToEmail[assignee]) {
          assignmentAnalysis.mismatched++;
        }
      } else {
        assignmentAnalysis.unassigned++;
      }
      
      assignmentAnalysis.leadDetails.push({
        id: lead.id,
        leadName: lead.fullName,
        assignee: assignee,
        category: category,
        created_at: lead.created_at
      });
    });
    
    console.log('📊 Assignment Analysis:', assignmentAnalysis);
    
    res.json({
      success: true,
      data: {
        users: users.map(u => ({ username: u.username, email: u.email, name: u.name })),
        assignmentAnalysis,
        recommendations: [
          assignmentAnalysis.assignedToEmail > 0 ? 'Some leads are assigned to email addresses instead of usernames' : null,
          assignmentAnalysis.mismatched > 0 ? 'Some leads are assigned to non-existent users' : null,
          assignmentAnalysis.unassigned > 0 ? 'Some leads are not assigned to anyone' : null
        ].filter(Boolean)
      }
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = app;