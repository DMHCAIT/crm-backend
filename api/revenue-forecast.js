// Revenue Forecasting and Pipeline Velocity API
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Revenue Forecast: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    const user = verifyToken(req);
    const { endpoint } = req.query;

    // Revenue Forecasting Endpoint
    if (!endpoint || endpoint === 'forecast') {
      // Get all leads not yet enrolled or lost
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .not('status', 'in', '(Enrolled,Not Interested)');

      if (leadsError) throw leadsError;

      // Calculate historical conversion rates by source
      const { data: allLeads, error: allLeadsError } = await supabase
        .from('leads')
        .select('source, status, estimated_value, sale_price, created_at')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()); // Last 6 months

      if (allLeadsError) throw allLeadsError;

      const sourceCounts = {};
      allLeads.forEach(lead => {
        if (!sourceCounts[lead.source]) {
          sourceCounts[lead.source] = { total: 0, converted: 0, revenue: 0 };
        }
        sourceCounts[lead.source].total++;
        if (lead.status === 'Enrolled') {
          sourceCounts[lead.source].converted++;
          sourceCounts[lead.source].revenue += lead.sale_price || 0;
        }
      });

      const conversionRates = {};
      Object.keys(sourceCounts).forEach(source => {
        conversionRates[source] = {
          rate: sourceCounts[source].converted / sourceCounts[source].total,
          avgRevenue: sourceCounts[source].revenue / (sourceCounts[source].converted || 1)
        };
      });

      // Calculate weighted pipeline forecast
      let totalForecast = 0;
      let optimisticForecast = 0;
      let pessimisticForecast = 0;
      const leadForecasts = [];

      const statusMultipliers = {
        'Hot': 0.75,
        'Warm': 0.45,
        'Follow Up': 0.25,
        'Fresh': 0.12
      };

      leads.forEach(lead => {
        const sourceRate = conversionRates[lead.source]?.rate || 0.15;
        const statusMultiplier = statusMultipliers[lead.status] || 0.1;
        const estimatedValue = lead.estimated_value || conversionRates[lead.source]?.avgRevenue || 50000;

        const expectedValue = estimatedValue * sourceRate * statusMultiplier;
        const optimistic = estimatedValue * Math.min(sourceRate * 1.5, 1) * Math.min(statusMultiplier * 1.3, 1);
        const pessimistic = estimatedValue * sourceRate * 0.7 * statusMultiplier * 0.7;

        totalForecast += expectedValue;
        optimisticForecast += optimistic;
        pessimisticForecast += pessimistic;

        leadForecasts.push({
          lead_id: lead.id,
          lead_name: lead.name,
          status: lead.status,
          source: lead.source,
          estimated_value: estimatedValue,
          expected_value: Math.round(expectedValue),
          probability: Math.round(sourceRate * statusMultiplier * 100)
        });
      });

      // Sort by expected value
      leadForecasts.sort((a, b) => b.expected_value - a.expected_value);

      // Calculate by time period
      const monthlyForecast = [];
      for (let i = 0; i < 3; i++) {
        const monthLeads = leads.filter(lead => {
          const leadAge = Math.floor(
            (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          return leadAge === i;
        });

        let monthTotal = 0;
        monthLeads.forEach(lead => {
          const sourceRate = conversionRates[lead.source]?.rate || 0.15;
          const statusMultiplier = statusMultipliers[lead.status] || 0.1;
          const estimatedValue = lead.estimated_value || 50000;
          monthTotal += estimatedValue * sourceRate * statusMultiplier;
        });

        monthlyForecast.push({
          month: i === 0 ? 'This Month' : i === 1 ? 'Next Month' : 'Month After',
          expected_revenue: Math.round(monthTotal),
          lead_count: monthLeads.length
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            expected: Math.round(totalForecast),
            optimistic: Math.round(optimisticForecast),
            pessimistic: Math.round(pessimisticForecast),
            confidence: 85,
            total_pipeline_leads: leads.length
          },
          by_month: monthlyForecast,
          conversion_rates: conversionRates,
          top_opportunities: leadForecasts.slice(0, 10)
        }
      });
    }

    // Pipeline Velocity Endpoint
    if (endpoint === 'velocity') {
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'status_change')
        .gte('event_timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('event_timestamp', { ascending: true });

      if (error) throw error;

      // Group by lead to track their journey
      const leadJourneys = {};
      events.forEach(event => {
        if (!leadJourneys[event.lead_id]) {
          leadJourneys[event.lead_id] = [];
        }
        leadJourneys[event.lead_id].push({
          from: event.metadata?.from_status,
          to: event.metadata?.to_status,
          timestamp: new Date(event.event_timestamp)
        });
      });

      // Calculate average time between stages
      const transitions = {};
      
      Object.values(leadJourneys).forEach(journey => {
        for (let i = 1; i < journey.length; i++) {
          const transition = `${journey[i-1].to} → ${journey[i].to}`;
          const hours = (journey[i].timestamp - journey[i-1].timestamp) / (1000 * 60 * 60);
          
          if (!transitions[transition]) {
            transitions[transition] = { times: [], count: 0 };
          }
          transitions[transition].times.push(hours);
          transitions[transition].count++;
        }
      });

      const velocityMetrics = {};
      Object.keys(transitions).forEach(transition => {
        const times = transitions[transition].times;
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        velocityMetrics[transition] = {
          avg_hours: Math.round(avg * 10) / 10,
          avg_days: Math.round(avg / 24 * 10) / 10,
          min_hours: Math.round(min * 10) / 10,
          max_hours: Math.round(max * 10) / 10,
          count: transitions[transition].count
        };
      });

      // Calculate overall pipeline metrics
      const enrolledJourneys = Object.values(leadJourneys).filter(j => 
        j[j.length - 1].to === 'Enrolled'
      );

      let totalPipelineTime = 0;
      enrolledJourneys.forEach(journey => {
        const start = journey[0].timestamp;
        const end = journey[journey.length - 1].timestamp;
        totalPipelineTime += (end - start) / (1000 * 60 * 60);
      });

      const avgPipelineTime = enrolledJourneys.length > 0 
        ? totalPipelineTime / enrolledJourneys.length 
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          overall_metrics: {
            avg_total_pipeline_hours: Math.round(avgPipelineTime * 10) / 10,
            avg_total_pipeline_days: Math.round(avgPipelineTime / 24 * 10) / 10,
            successful_conversions: enrolledJourneys.length,
            health_status: avgPipelineTime < 168 ? 'Healthy' : avgPipelineTime < 336 ? 'Normal' : 'Needs Attention'
          },
          stage_transitions: velocityMetrics,
          analysis_period: '90 days',
          total_journeys_analyzed: Object.keys(leadJourneys).length
        }
      });
    }

    // Cohort Analysis Endpoint
    if (endpoint === 'cohort') {
      const { data: cohorts, error } = await supabase
        .from('vw_cohort_analysis')
        .select('*')
        .order('cohort_month', { ascending: false })
        .limit(12);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: cohorts
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid endpoint. Use: forecast, velocity, or cohort'
    });

  } catch (error) {
    console.error('Revenue forecast error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
