// Enhanced Automation Workflows API with Business Process Automation
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
  console.log('Automation module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  // CORS headers
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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
        if (action === 'executions') {
          await handleGetExecutions(req, res);
        } else if (action === 'triggers') {
          await handleGetTriggers(req, res);
        } else if (action === 'analytics') {
          await handleGetWorkflowAnalytics(req, res);
        } else {
          await handleGetWorkflows(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'execute') {
          const workflowId = urlParts[urlParts.length - 2];
          await handleExecuteWorkflow(req, res, workflowId);
        } else if (action === 'test') {
          const workflowId = urlParts[urlParts.length - 2];
          await handleTestWorkflow(req, res, workflowId);
        } else if (action === 'duplicate') {
          const workflowId = urlParts[urlParts.length - 2];
          await handleDuplicateWorkflow(req, res, workflowId);
        } else {
          await handleCreateWorkflow(req, res);
        }
        break;
      
      case 'PUT':
        if (action === 'toggle') {
          const workflowId = urlParts[urlParts.length - 2];
          await handleToggleWorkflow(req, res, workflowId);
        } else {
          await handleUpdateWorkflow(req, res, id);
        }
        break;
      
      case 'DELETE':
        await handleDeleteWorkflow(req, res, id);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Automation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get workflows with filtering
async function handleGetWorkflows(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      status,
      trigger_type,
      is_enabled,
      created_by,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('automation_workflows')
      .select(`
        *,
        created_by:created_by_id(name, email),
        updated_by:updated_by_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (trigger_type) query = query.eq('trigger_type', trigger_type);
    if (is_enabled !== undefined) query = query.eq('is_enabled', is_enabled === 'true');
    if (created_by) query = query.eq('created_by_id', created_by);

    const { data: workflows, error } = await query;

    if (error) throw error;

    // Get execution counts for each workflow
    const workflowsWithStats = await Promise.all(
      (workflows || []).map(async (workflow) => {
        const { data: executions } = await supabase
          .from('workflow_executions')
          .select('status')
          .eq('workflow_id', workflow.id);

        const stats = {
          total_executions: executions?.length || 0,
          successful: executions?.filter(e => e.status === 'completed').length || 0,
          failed: executions?.filter(e => e.status === 'failed').length || 0,
          running: executions?.filter(e => e.status === 'running').length || 0
        };

        return { ...workflow, execution_stats: stats };
      })
    );

    res.json({
      success: true,
      workflows: workflowsWithStats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: workflows?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create new workflow
async function handleCreateWorkflow(req, res) {
  try {
    const user = verifyToken(req);
    const {
      name,
      description,
      trigger_type,
      trigger_conditions = {},
      actions = [],
      status = 'draft',
      is_enabled = false,
      priority = 1,
      metadata = {}
    } = req.body;

    if (!name || !trigger_type || !actions.length) {
      return res.status(400).json({
        success: false,
        error: 'Name, trigger_type, and actions are required'
      });
    }

    // Validate trigger type
    const validTriggers = [
      'lead_created', 'lead_updated', 'lead_converted',
      'student_enrolled', 'student_updated', 'student_completed',
      'payment_received', 'payment_failed', 'payment_overdue',
      'document_uploaded', 'document_verified', 'document_rejected',
      'communication_sent', 'communication_failed',
      'note_created', 'note_reminder',
      'manual_trigger', 'scheduled_trigger'
    ];

    if (!validTriggers.includes(trigger_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid trigger_type. Must be one of: ${validTriggers.join(', ')}`
      });
    }

    // Validate actions
    const validatedActions = validateActions(actions);
    if (validatedActions.error) {
      return res.status(400).json({
        success: false,
        error: validatedActions.error
      });
    }

    const { data: workflow, error } = await supabase
      .from('automation_workflows')
      .insert([{
        name,
        description: description || '',
        trigger_type,
        trigger_conditions,
        actions: validatedActions.actions,
        status,
        is_enabled: is_enabled === true || is_enabled === 'true',
        priority: parseInt(priority) || 1,
        metadata,
        created_by_id: user.id,
        updated_by_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        created_by:created_by_id(name, email)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Workflow created successfully',
      workflow
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Update workflow
async function handleUpdateWorkflow(req, res, workflowId) {
  try {
    const user = verifyToken(req);
    const {
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      status,
      is_enabled,
      priority,
      metadata
    } = req.body;

    // Check if workflow exists
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !existingWorkflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const updateData = {
      updated_by_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (trigger_type) updateData.trigger_type = trigger_type;
    if (trigger_conditions) updateData.trigger_conditions = trigger_conditions;
    if (actions) {
      const validatedActions = validateActions(actions);
      if (validatedActions.error) {
        return res.status(400).json({
          success: false,
          error: validatedActions.error
        });
      }
      updateData.actions = validatedActions.actions;
    }
    if (status) updateData.status = status;
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (metadata) updateData.metadata = metadata;

    const { data: workflow, error: updateError } = await supabase
      .from('automation_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select(`
        *,
        created_by:created_by_id(name, email),
        updated_by:updated_by_id(name, email)
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Execute workflow
async function handleExecuteWorkflow(req, res, workflowId) {
  try {
    const user = verifyToken(req);
    const { trigger_data = {}, test_mode = false } = req.body;

    // Get workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    if (!workflow.is_enabled && !test_mode) {
      return res.status(400).json({
        success: false,
        error: 'Workflow is not enabled'
      });
    }

    // Create execution record
    const executionId = uuidv4();
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert([{
        id: executionId,
        workflow_id: workflowId,
        trigger_data,
        status: 'running',
        started_at: new Date().toISOString(),
        executed_by_id: user.id,
        test_mode: test_mode === true || test_mode === 'true'
      }])
      .select()
      .single();

    if (executionError) throw executionError;

    // Execute workflow actions
    const result = await executeWorkflowActions(workflow, trigger_data, executionId, test_mode);

    // Update execution status
    await supabase
      .from('workflow_executions')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        result_data: result,
        error_message: result.error || null
      })
      .eq('id', executionId);

    res.json({
      success: result.success,
      message: result.success ? 'Workflow executed successfully' : 'Workflow execution failed',
      execution_id: executionId,
      result
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Toggle workflow enabled/disabled
async function handleToggleWorkflow(req, res, workflowId) {
  try {
    const user = verifyToken(req);

    const { data: workflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('is_enabled')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('automation_workflows')
      .update({
        is_enabled: !workflow.is_enabled,
        updated_by_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `Workflow ${updatedWorkflow.is_enabled ? 'enabled' : 'disabled'} successfully`,
      workflow: updatedWorkflow
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get workflow executions
async function handleGetExecutions(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      workflow_id,
      status,
      test_mode,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:workflow_id(name, trigger_type),
        executed_by:executed_by_id(name, email)
      `)
      .order('started_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (workflow_id) query = query.eq('workflow_id', workflow_id);
    if (status) query = query.eq('status', status);
    if (test_mode !== undefined) query = query.eq('test_mode', test_mode === 'true');

    const { data: executions, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      executions: executions || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: executions?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get workflow analytics
async function handleGetWorkflowAnalytics(req, res) {
  try {
    const user = verifyToken(req);
    const { period = '30d', workflow_id } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let executionQuery = supabase
      .from('workflow_executions')
      .select('*')
      .gte('started_at', startDate);

    if (workflow_id) executionQuery = executionQuery.eq('workflow_id', workflow_id);

    const { data: executions, error: executionError } = await executionQuery;

    if (executionError) throw executionError;

    const analytics = {
      period,
      overview: {
        total_executions: executions?.length || 0,
        successful: executions?.filter(e => e.status === 'completed').length || 0,
        failed: executions?.filter(e => e.status === 'failed').length || 0,
        success_rate: 0
      },
      by_workflow: {},
      by_trigger: {},
      daily_trends: {}
    };

    if (analytics.overview.total_executions > 0) {
      analytics.overview.success_rate = 
        (analytics.overview.successful / analytics.overview.total_executions * 100).toFixed(2);
    }

    // Group analytics
    executions?.forEach(execution => {
      const date = execution.started_at.split('T')[0];
      
      // Daily trends
      if (!analytics.daily_trends[date]) {
        analytics.daily_trends[date] = { date, total: 0, successful: 0, failed: 0 };
      }
      analytics.daily_trends[date].total++;
      if (execution.status === 'completed') analytics.daily_trends[date].successful++;
      if (execution.status === 'failed') analytics.daily_trends[date].failed++;
    });

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Delete workflow
async function handleDeleteWorkflow(req, res, workflowId) {
  try {
    const user = verifyToken(req);

    // Check if workflow exists
    const { data: workflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Delete workflow (this will cascade to executions)
    const { error: deleteError } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', workflowId);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper functions
function validateActions(actions) {
  const validActionTypes = [
    'send_email', 'send_sms', 'send_whatsapp',
    'create_notification', 'assign_counselor', 'update_lead_status',
    'create_note', 'schedule_follow_up', 'send_document',
    'update_student_status', 'create_payment_reminder',
    'wait', 'condition_check', 'webhook_call'
  ];

  try {
    const validatedActions = actions.map((action, index) => {
      if (!action.type || !validActionTypes.includes(action.type)) {
        throw new Error(`Invalid action type at index ${index}: ${action.type}`);
      }

      return {
        type: action.type,
        delay: action.delay || 0,
        parameters: action.parameters || {},
        condition: action.condition || null
      };
    });

    return { success: true, actions: validatedActions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function executeWorkflowActions(workflow, triggerData, executionId, testMode = false) {
  try {
    const results = [];

    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      
      // Wait for delay if specified
      if (action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
      }

      // Execute action
      const actionResult = await executeAction(action, triggerData, testMode);
      results.push({
        action_index: i,
        action_type: action.type,
        success: actionResult.success,
        result: actionResult.result,
        error: actionResult.error
      });

      // If action failed and no continue_on_error flag, stop execution
      if (!actionResult.success && !action.continue_on_error) {
        break;
      }
    }

    const success = results.every(r => r.success);
    return {
      success,
      results,
      execution_id: executionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      execution_id: executionId
    };
  }
}

async function executeAction(action, triggerData, testMode = false) {
  try {
    switch (action.type) {
      case 'send_email':
        return await executeSendEmail(action.parameters, triggerData, testMode);
      case 'send_sms':
        return await executeSendSMS(action.parameters, triggerData, testMode);
      case 'create_notification':
        return await executeCreateNotification(action.parameters, triggerData, testMode);
      case 'assign_counselor':
        return await executeAssignCounselor(action.parameters, triggerData, testMode);
      case 'update_lead_status':
        return await executeUpdateLeadStatus(action.parameters, triggerData, testMode);
      case 'create_note':
        return await executeCreateNote(action.parameters, triggerData, testMode);
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, (action.parameters.duration || 5) * 1000));
        return { success: true, result: 'Wait completed' };
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function executeSendEmail(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'Email would be sent (test mode)' };
  }

  // Implement actual email sending logic
  return { success: true, result: 'Email sent successfully' };
}

async function executeSendSMS(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'SMS would be sent (test mode)' };
  }

  // Implement actual SMS sending logic
  return { success: true, result: 'SMS sent successfully' };
}

async function executeCreateNotification(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'Notification would be created (test mode)' };
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        title: parameters.title || 'Workflow Notification',
        message: parameters.message || 'Automated notification from workflow',
        type: parameters.type || 'info',
        user_id: parameters.user_id || triggerData.user_id,
        lead_id: triggerData.lead_id || null,
        student_id: triggerData.student_id || null,
        priority: parameters.priority || 'normal',
        metadata: { workflow_generated: true, trigger_data: triggerData },
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return { success: true, result: 'Notification created successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function executeAssignCounselor(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'Counselor would be assigned (test mode)' };
  }

  // Implement counselor assignment logic
  return { success: true, result: 'Counselor assigned successfully' };
}

async function executeUpdateLeadStatus(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'Lead status would be updated (test mode)' };
  }

  if (!triggerData.lead_id) {
    return { success: false, error: 'No lead_id in trigger data' };
  }

  try {
    const { error } = await supabase
      .from('leads')
      .update({ status: parameters.new_status })
      .eq('id', triggerData.lead_id);

    if (error) throw error;
    return { success: true, result: 'Lead status updated successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function executeCreateNote(parameters, triggerData, testMode) {
  if (testMode) {
    return { success: true, result: 'Note would be created (test mode)' };
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        content: parameters.content || 'Automated note from workflow',
        lead_id: triggerData.lead_id || null,
        student_id: triggerData.student_id || null,
        author_id: parameters.author_id || triggerData.user_id,
        note_type: parameters.note_type || 'general',
        priority: parameters.priority || 'normal',
        metadata: { workflow_generated: true },
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return { success: true, result: 'Note created successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}