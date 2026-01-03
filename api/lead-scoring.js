// =====================================================
// LEAD SCORING & CHURN PREDICTION API
// AI-powered lead prioritization and risk assessment
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');


// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Lead Scoring API: Supabase initialized');
  }
} catch (error) {
  logger.info('❌ Lead Scoring API: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

// =====================================================
// LEAD SCORING ALGORITHM
// =====================================================
function calculateLeadScore(lead, activities = []) {
  let totalScore = 0;
  const scoreBreakdown = {
    engagement: 0,
    recency: 0,
    source: 0,
    profile: 0,
    behavioral: 0
  };

  // 1. ENGAGEMENT SCORE (0-30 points)
  const emailOpens = activities.filter(a => a.event_type === 'email_opened').length;
  const callsAnswered = activities.filter(a => a.event_type === 'call_answered').length;
  const emailsSent = activities.filter(a => a.event_type === 'email_sent').length;
  const callsMade = activities.filter(a => a.event_type === 'call_made').length;
  
  scoreBreakdown.engagement = Math.min(
    (emailOpens * 3) + (callsAnswered * 5) + (emailsSent * 1) + (callsMade * 2),
    30
  );

  // 2. RECENCY SCORE (0-25 points)
  const lastContact = lead.last_contact || lead.updated_at || lead.created_at;
  const daysSinceLastContact = Math.floor(
    (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastContact < 3) scoreBreakdown.recency = 25;
  else if (daysSinceLastContact < 7) scoreBreakdown.recency = 20;
  else if (daysSinceLastContact < 14) scoreBreakdown.recency = 15;
  else if (daysSinceLastContact < 30) scoreBreakdown.recency = 10;
  else if (daysSinceLastContact < 60) scoreBreakdown.recency = 5;
  else scoreBreakdown.recency = 0;

  // 3. SOURCE QUALITY SCORE (0-20 points)
  const sourceScores = {
    'Referral': 20,
    'Website': 18,
    'LinkedIn': 17,
    'Instagram': 15,
    'Facebook': 13,
    'Google Ads': 12,
    'Cold Call': 8,
    'Email Campaign': 10,
    'Walk-in': 16,
    'Partner': 19,
    'Other': 10
  };
  scoreBreakdown.source = sourceScores[lead.source] || 10;

  // 4. PROFILE COMPLETENESS SCORE (0-15 points)
  const fields = ['phone', 'email', 'qualification', 'experience', 'company', 'address'];
  const completedFields = fields.filter(f => lead[f] && lead[f] !== '' && lead[f] !== null).length;
  scoreBreakdown.profile = Math.round((completedFields / fields.length) * 15);

  // 5. BEHAVIORAL SIGNALS SCORE (0-10 points)
  const statusScores = {
    'Hot': 10,
    'Warm': 7,
    'Follow Up': 5,
    'Fresh': 3,
    'Enrolled': 10,
    'Not Interested': 0,
    'Unassigned': 2
  };
  scoreBreakdown.behavioral = statusScores[lead.status] || 5;

  // Calculate total
  totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

  // Determine score level
  let scoreLevel = 'Low';
  if (totalScore >= 75) scoreLevel = 'High';
  else if (totalScore >= 50) scoreLevel = 'Medium';

  return {
    score: Math.min(Math.round(totalScore), 100),
    scoreLevel,
    breakdown: scoreBreakdown,
    metadata: {
      daysSinceLastContact,
      totalActivities: activities.length,
      profileCompleteness: Math.round((completedFields / fields.length) * 100)
    }
  };
}

// =====================================================
// CHURN PREDICTION ALGORITHM
// =====================================================
function predictChurn(lead, activities = []) {
  let churnRisk = 0;

  // 1. TIME SINCE LAST CONTACT (40% weight)
  const lastContact = lead.last_contact || lead.updated_at || lead.created_at;
  const daysSinceContact = Math.floor(
    (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceContact > 60) churnRisk += 40;
  else if (daysSinceContact > 30) churnRisk += 30;
  else if (daysSinceContact > 14) churnRisk += 20;
  else if (daysSinceContact > 7) churnRisk += 10;

  // 2. ENGAGEMENT DECLINE (30% weight)
  const recentActivities = activities.filter(a => {
    const daysAgo = (Date.now() - new Date(a.event_timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  }).length;
  
  if (recentActivities === 0) churnRisk += 30;
  else if (recentActivities < 2) churnRisk += 20;
  else if (recentActivities < 5) churnRisk += 10;

  // 3. STATUS REGRESSION (20% weight)
  const statusChanges = activities
    .filter(a => a.event_type === 'status_change')
    .sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime());
  
  if (statusChanges.length > 0) {
    const latestChange = statusChanges[0];
    const previousStatus = latestChange.metadata?.from_status;
    const currentStatus = latestChange.metadata?.to_status;
    
    const statusRank = {
      'Hot': 5,
      'Warm': 4,
      'Follow Up': 3,
      'Fresh': 2,
      'Not Interested': 1
    };
    
    if (statusRank[currentStatus] < statusRank[previousStatus]) {
      churnRisk += 20;
    }
  }

  // 4. COMMUNICATION FAILURES (10% weight)
  const failedCalls = activities.filter(a => 
    a.event_type === 'call_made' && 
    a.metadata?.outcome === 'not_answered'
  ).length;
  
  if (failedCalls > 5) churnRisk += 10;
  else if (failedCalls > 3) churnRisk += 7;
  else if (failedCalls > 1) churnRisk += 4;

  // Determine churn level
  let churnLevel = 'Low';
  if (churnRisk > 70) churnLevel = 'High';
  else if (churnRisk > 40) churnLevel = 'Medium';

  // Get recommendations
  const recommendations = getChurnRecommendations(churnRisk, lead, daysSinceContact);

  return {
    churnRisk: Math.min(Math.round(churnRisk), 100),
    churnLevel,
    recommendations,
    metadata: {
      daysSinceContact,
      recentActivities,
      failedCalls
    }
  };
}

// =====================================================
// CHURN RECOMMENDATIONS
// =====================================================
function getChurnRecommendations(risk, lead, daysSinceContact) {
  const recs = [];

  if (risk > 70) {
    recs.push('🚨 URGENT: Immediate follow-up required within 24 hours');
    recs.push('📞 Make a personal phone call to reconnect');
  } else if (risk > 40) {
    recs.push('⚠️ Follow-up recommended within 3 days');
  }

  if (daysSinceContact > 14) {
    recs.push('📅 Schedule a follow-up call or meeting');
  }

  if (!lead.phone || lead.phone === '') {
    recs.push('📱 Add phone number for better engagement');
  }

  if (!lead.email || lead.email === '') {
    recs.push('✉️ Add email address to enable email campaigns');
  }

  if (lead.source === 'Cold Call') {
    recs.push('💌 Try email or WhatsApp outreach instead');
  }

  if (lead.status === 'Fresh' && daysSinceContact > 7) {
    recs.push('🎯 Move lead to Follow Up and assign action items');
  }

  return recs;
}

// =====================================================
// NEXT BEST ACTION RECOMMENDATIONS
// =====================================================
function getNextBestAction(lead, activities = []) {
  const daysSinceContact = Math.floor(
    (Date.now() - new Date(lead.last_contact || lead.updated_at || lead.created_at).getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  const emailsSent = activities.filter(a => a.event_type === 'email_sent').length;
  const callsMade = activities.filter(a => a.event_type === 'call_made').length;

  // Rule-based recommendation engine
  if (lead.status === 'Hot' && daysSinceContact > 2) {
    return {
      action: 'Send personalized email with course details and pricing',
      priority: 'High',
      reason: 'Hot lead requires immediate nurturing to maintain interest',
      suggestedTime: 'Within next 2 hours',
      actionType: 'email'
    };
  }

  if (lead.status === 'Warm' && daysSinceContact > 5) {
    return {
      action: 'Schedule follow-up call to discuss progress',
      priority: 'Medium',
      reason: 'Maintain engagement momentum with warm lead',
      suggestedTime: 'Tomorrow between 10 AM - 12 PM',
      actionType: 'call'
    };
  }

  if (emailsSent > 3 && callsMade === 0) {
    return {
      action: 'Make phone call to establish personal connection',
      priority: 'Medium',
      reason: 'Diversify communication channels - too many emails sent',
      suggestedTime: 'This week',
      actionType: 'call'
    };
  }

  if (callsMade > 3 && emailsSent === 0) {
    return {
      action: 'Send informative email with course brochure',
      priority: 'Medium',
      reason: 'Provide written information after verbal discussions',
      suggestedTime: 'Today',
      actionType: 'email'
    };
  }

  if (lead.status === 'Fresh' && daysSinceContact > 3) {
    return {
      action: 'Make initial contact call to qualify lead',
      priority: 'High',
      reason: 'Fresh lead needs timely first contact',
      suggestedTime: 'Today',
      actionType: 'call'
    };
  }

  if (daysSinceContact > 14) {
    return {
      action: 'Send re-engagement email or WhatsApp message',
      priority: 'Low',
      reason: 'Reconnect with inactive lead',
      suggestedTime: 'This week',
      actionType: 'email'
    };
  }

  return {
    action: 'Send check-in email to maintain relationship',
    priority: 'Low',
    reason: 'Regular touchpoint to stay top-of-mind',
    suggestedTime: 'Next week',
    actionType: 'email'
  };
}

// =====================================================
// MAIN API HANDLER
// =====================================================
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

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Verify authentication
    let userId;
    try {
      const decoded = verifyToken(req);
      userId = decoded.userId || decoded.id || decoded.sub;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid or missing token'
      });
    }

    const urlPath = req.url.split('?')[0];

    // =====================================================
    // POST /api/lead-scoring/calculate - Calculate score for one lead
    // =====================================================
    if (req.method === 'POST' && urlPath === '/api/lead-scoring/calculate') {
      const { leadId } = req.body;

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required'
        });
      }

      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }

      // Get activities
      const { data: activities } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('event_timestamp', { ascending: false });

      // Calculate scores
      const scoreResult = calculateLeadScore(lead, activities || []);
      const churnResult = predictChurn(lead, activities || []);
      const nextAction = getNextBestAction(lead, activities || []);

      // Save to database
      const { error: saveError } = await supabase
        .from('lead_scores')
        .upsert({
          lead_id: leadId,
          score: scoreResult.score,
          score_level: scoreResult.scoreLevel,
          engagement_score: scoreResult.breakdown.engagement,
          recency_score: scoreResult.breakdown.recency,
          source_score: scoreResult.breakdown.source,
          profile_score: scoreResult.breakdown.profile,
          behavioral_score: scoreResult.breakdown.behavioral,
          churn_risk: churnResult.churnRisk,
          churn_level: churnResult.churnLevel,
          last_calculated: new Date().toISOString()
        }, {
          onConflict: 'lead_id'
        });

      if (saveError) {
        logger.error('Error saving lead score:', saveError);
      }

      return res.status(200).json({
        success: true,
        data: {
          leadId,
          leadName: lead.name,
          scoring: scoreResult,
          churnPrediction: churnResult,
          nextBestAction: nextAction
        }
      });
    }

    // =====================================================
    // POST /api/lead-scoring/calculate-all - Calculate scores for all leads
    // =====================================================
    if (req.method === 'POST' && urlPath === '/api/lead-scoring/calculate-all') {
      const { limit = 1000 } = req.body;

      // Get all leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .limit(parseInt(limit));

      if (leadsError) {
        throw leadsError;
      }

      let processed = 0;
      let failed = 0;

      // Process in batches
      for (const lead of leads || []) {
        try {
          // Get activities for this lead
          const { data: activities } = await supabase
            .from('analytics_events')
            .select('*')
            .eq('lead_id', lead.id);

          // Calculate scores
          const scoreResult = calculateLeadScore(lead, activities || []);
          const churnResult = predictChurn(lead, activities || []);

          // Save to database
          await supabase
            .from('lead_scores')
            .upsert({
              lead_id: lead.id,
              score: scoreResult.score,
              score_level: scoreResult.scoreLevel,
              engagement_score: scoreResult.breakdown.engagement,
              recency_score: scoreResult.breakdown.recency,
              source_score: scoreResult.breakdown.source,
              profile_score: scoreResult.breakdown.profile,
              behavioral_score: scoreResult.breakdown.behavioral,
              churn_risk: churnResult.churnRisk,
              churn_level: churnResult.churnLevel,
              last_calculated: new Date().toISOString()
            }, {
              onConflict: 'lead_id'
            });

          processed++;
        } catch (error) {
          logger.error(`Error processing lead ${lead.id}:`, error);
          failed++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Processed ${processed} leads successfully, ${failed} failed`,
        data: {
          total: leads?.length || 0,
          processed,
          failed
        }
      });
    }

    // =====================================================
    // GET /api/lead-scoring/:leadId - Get saved score for a lead
    // =====================================================
    if (req.method === 'GET' && urlPath.match(/^\/api\/lead-scoring\/[a-zA-Z0-9-]+$/)) {
      const leadId = urlPath.split('/').pop();

      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: 'Score not found for this lead'
        });
      }

      return res.status(200).json({
        success: true,
        data
      });
    }

    // =====================================================
    // GET /api/lead-scoring/top-leads - Get highest scoring leads
    // =====================================================
    if (req.method === 'GET' && urlPath === '/api/lead-scoring/top-leads') {
      const { limit = 50 } = req.query;

      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || []
      });
    }

    // =====================================================
    // GET /api/lead-scoring/at-risk - Get high churn risk leads
    // =====================================================
    if (req.method === 'GET' && urlPath === '/api/lead-scoring/at-risk') {
      const { limit = 50 } = req.query;

      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .gte('churn_risk', 40)
        .order('churn_risk', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || []
      });
    }

    // Invalid endpoint
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });

  } catch (error) {
    logger.error('❌ Lead Scoring API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

// Export functions for use in other modules
module.exports.calculateLeadScore = calculateLeadScore;
module.exports.predictChurn = predictChurn;
module.exports.getNextBestAction = getNextBestAction;
