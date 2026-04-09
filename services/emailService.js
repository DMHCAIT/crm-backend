const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Email service configuration
class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' or 'sendgrid'
    this.transporter = null;
    
    if (this.provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('Email service initialized', { provider: 'SendGrid' });
    } else if (this.provider === 'smtp') {
      this.initSMTP();
    } else {
      logger.warn('Email service not configured properly');
    }
  }

  initSMTP() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        logger.error('SMTP connection failed', { error: error.message });
      } else {
        logger.info('Email service initialized', { provider: 'SMTP' });
      }
    });
  }

  async send({ to, subject, text, html, from, attachments = [] }) {
    try {
      const fromAddress = from || process.env.EMAIL_FROM || 'noreply@dmhca.com';
      
      if (this.provider === 'sendgrid') {
        const msg = {
          to,
          from: fromAddress,
          subject,
          text,
          html: html || text,
          attachments
        };

        await sgMail.send(msg);
        logger.info('Email sent via SendGrid', { to, subject });
        return { success: true, provider: 'SendGrid' };
      } else if (this.transporter) {
        const mailOptions = {
          from: fromAddress,
          to,
          subject,
          text,
          html: html || text,
          attachments
        };

        const info = await this.transporter.sendMail(mailOptions);
        logger.info('Email sent via SMTP', { to, subject, messageId: info.messageId });
        return { success: true, provider: 'SMTP', messageId: info.messageId };
      } else {
        throw new Error('Email service not configured');
      }
    } catch (error) {
      logger.error('Email send failed', { 
        to, 
        subject, 
        error: error.message 
      });
      throw error;
    }
  }

  async sendTemplate(template, data) {
    const templates = {
      welcome: {
        subject: 'Welcome to DMHCA CRM',
        html: `
          <h1>Welcome, ${data.name}!</h1>
          <p>Thank you for joining DMHCA CRM. We're excited to have you on board.</p>
          <p>Your account has been created successfully.</p>
          <p>Login at: <a href="${data.loginUrl}">${data.loginUrl}</a></p>
          <br/>
          <p>Best regards,<br/>DMHCA Team</p>
        `
      },
      leadAssigned: {
        subject: `New Lead Assigned: ${data.leadName}`,
        html: `
          <h2>New Lead Assignment</h2>
          <p>A new lead has been assigned to you:</p>
          <ul>
            <li><strong>Name:</strong> ${data.leadName}</li>
            <li><strong>Email:</strong> ${data.leadEmail || 'Not provided'}</li>
            <li><strong>Phone:</strong> ${data.leadPhone || 'Not provided'}</li>
            <li><strong>Source:</strong> ${data.leadSource}</li>
          </ul>
          <p><a href="${data.crmUrl}/leads/${data.leadId}">View Lead in CRM</a></p>
          <br/>
          <p>DMHCA CRM</p>
        `
      },
      leadStatusChange: {
        subject: `Lead Status Updated: ${data.leadName}`,
        html: `
          <h2>Lead Status Update</h2>
          <p>Lead status has been changed:</p>
          <ul>
            <li><strong>Lead:</strong> ${data.leadName}</li>
            <li><strong>Previous Status:</strong> ${data.oldStatus}</li>
            <li><strong>New Status:</strong> ${data.newStatus}</li>
            <li><strong>Updated By:</strong> ${data.updatedBy}</li>
          </ul>
          <p><a href="${data.crmUrl}/leads/${data.leadId}">View Lead</a></p>
        `
      },
      passwordReset: {
        subject: 'Password Reset Request - DMHCA CRM',
        html: `
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${data.resetUrl}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <br/>
          <p>DMHCA CRM Team</p>
        `
      },
      dailyReport: {
        subject: `Daily CRM Report - ${data.date}`,
        html: `
          <h2>Daily CRM Summary</h2>
          <p>Here's your daily report for ${data.date}:</p>
          <h3>Statistics</h3>
          <ul>
            <li>New Leads: ${data.newLeads}</li>
            <li>Converted Leads: ${data.convertedLeads}</li>
            <li>Total Revenue: ₹${data.revenue}</li>
            <li>Active Users: ${data.activeUsers}</li>
          </ul>
          <p><a href="${data.crmUrl}/dashboard">View Dashboard</a></p>
        `
      }
    };

    const templateData = templates[template];
    if (!templateData) {
      throw new Error(`Unknown email template: ${template}`);
    }

    return this.send({
      to: data.to,
      subject: templateData.subject,
      html: templateData.html
    });
  }

  async sendBulk(emails) {
    const results = [];
    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push({ ...result, to: email.to });
      } catch (error) {
        results.push({ 
          success: false, 
          to: email.to, 
          error: error.message 
        });
      }
    }
    return results;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
