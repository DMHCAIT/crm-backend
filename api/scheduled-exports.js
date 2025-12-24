const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials for scheduled exports');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// JWT verification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Export data functions
const exportLeads = async (userId, userRole) => {
  try {
    let query = supabase.from('leads').select('*');
    
    // Apply hierarchical filtering
    if (userRole !== 'super_admin') {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Export leads error:', error);
    throw error;
  }
};

const exportStudents = async (userId, userRole) => {
  try {
    let query = supabase.from('students').select('*');
    
    if (userRole !== 'super_admin') {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Export students error:', error);
    throw error;
  }
};

const generateCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue}"` 
          : stringValue;
      }).join(',')
    )
  ].join('\n');
  
  return csv;
};

const sendExportEmail = async (email, exportType, format, data) => {
  try {
    const transporter = createEmailTransporter();
    const csv = generateCSV(data);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `Scheduled Export: ${exportType.toUpperCase()} - ${new Date().toLocaleDateString()}`,
      text: `Your scheduled ${exportType} export is ready.\n\nExport date: ${new Date().toLocaleString()}\nRecords: ${data.length}\nFormat: ${format.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Scheduled Export is Ready</h2>
          <p>Export details:</p>
          <ul>
            <li><strong>Type:</strong> ${exportType.toUpperCase()}</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Records:</strong> ${data.length}</li>
            <li><strong>Format:</strong> ${format.toUpperCase()}</li>
          </ul>
          <p>Please find the exported data attached to this email.</p>
        </div>
      `,
      attachments: [{
        filename: `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`,
        content: csv
      }]
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Send export email error:', error);
    throw error;
  }
};

// GET all scheduled exports
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ schedules: data || [] });
  } catch (error) {
    console.error('Get scheduled exports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create scheduled export
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { name, exportType, format, frequency, time, email, nextRun, status } = req.body;

    const { data, error } = await supabase
      .from('scheduled_exports')
      .insert({
        user_id: req.user.id,
        name,
        export_type: exportType,
        format,
        frequency,
        schedule_time: time,
        email,
        next_run: nextRun,
        status: status || 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule the cron job
    scheduleExportJob(data);

    res.json({ schedule: data });
  } catch (error) {
    console.error('Create scheduled export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update scheduled export
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('scheduled_exports')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Reschedule if status changed
    if (updates.status) {
      scheduleExportJob(data);
    }

    res.json({ schedule: data });
  } catch (error) {
    console.error('Update scheduled export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE scheduled export
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('scheduled_exports')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Scheduled export deleted successfully' });
  } catch (error) {
    console.error('Delete scheduled export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run export job manually
router.post('/:id/run', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { data: schedule, error } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    await executeExport(schedule);

    res.json({ message: 'Export executed successfully' });
  } catch (error) {
    console.error('Run export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute export function
const executeExport = async (schedule) => {
  try {
    console.log(`Executing export: ${schedule.name}`);
    
    let data;
    switch (schedule.export_type) {
      case 'leads':
        data = await exportLeads(schedule.user_id, 'super_admin'); // Will need actual role
        break;
      case 'students':
        data = await exportStudents(schedule.user_id, 'super_admin');
        break;
      default:
        throw new Error('Invalid export type');
    }

    await sendExportEmail(schedule.email, schedule.export_type, schedule.format, data);

    // Update last run
    await supabase
      .from('scheduled_exports')
      .update({
        last_run: new Date().toISOString(),
        next_run: calculateNextRun(schedule.frequency, schedule.schedule_time)
      })
      .eq('id', schedule.id);

    console.log(`Export completed: ${schedule.name}`);
  } catch (error) {
    console.error(`Export failed: ${schedule.name}`, error);
    
    // Update status to error
    await supabase
      .from('scheduled_exports')
      .update({ status: 'error' })
      .eq('id', schedule.id);
  }
};

const calculateNextRun = (frequency, time) => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  if (nextRun <= now) {
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }
  }
  
  return nextRun.toISOString();
};

// Schedule cron jobs
const scheduledJobs = new Map();

const scheduleExportJob = (schedule) => {
  if (schedule.status !== 'active') {
    if (scheduledJobs.has(schedule.id)) {
      scheduledJobs.get(schedule.id).stop();
      scheduledJobs.delete(schedule.id);
    }
    return;
  }

  // Stop existing job if any
  if (scheduledJobs.has(schedule.id)) {
    scheduledJobs.get(schedule.id).stop();
  }

  // Create cron expression
  const [hours, minutes] = schedule.schedule_time.split(':');
  let cronExpression;
  
  switch (schedule.frequency) {
    case 'daily':
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case 'weekly':
      cronExpression = `${minutes} ${hours} * * 1`; // Monday
      break;
    case 'monthly':
      cronExpression = `${minutes} ${hours} 1 * *`; // 1st of month
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`;
  }

  const job = cron.schedule(cronExpression, () => {
    executeExport(schedule);
  });

  scheduledJobs.set(schedule.id, job);
  console.log(`Scheduled export job: ${schedule.name} (${cronExpression})`);
};

// Load and schedule all active exports on startup
const initializeSchedules = async () => {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    data.forEach(schedule => {
      scheduleExportJob(schedule);
    });

    console.log(`Initialized ${data.length} scheduled exports`);
  } catch (error) {
    console.error('Initialize schedules error:', error);
  }
};

// Initialize on module load
initializeSchedules();

module.exports = router;
