const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = async (req, res) => {
  // Authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return errorResponse(res, 'No token provided', 401, 'UNAUTHORIZED');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
  } catch (error) {
    return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'send':
        return await sendEmail(req, res);
      case 'send-template':
        return await sendTemplateEmail(req, res);
      case 'send-bulk':
        return await sendBulkEmail(req, res);
      default:
        return errorResponse(res, 'Invalid action', 400, 'INVALID_ACTION');
    }
  } catch (error) {
    logger.error('Email API error', { action, error: error.message });
    return errorResponse(res, error.message, 500, 'EMAIL_ERROR');
  }
};

async function sendEmail(req, res) {
  const { to, subject, text, html, attachments } = req.body;

  if (!to || !subject || (!text && !html)) {
    return errorResponse(res, 'Missing required fields: to, subject, and text or html', 400, 'MISSING_PARAMS');
  }

  const result = await emailService.send({
    to,
    subject,
    text,
    html,
    attachments
  });

  if (!result.success) {
    return errorResponse(res, result.error || 'Failed to send email', 500, 'SEND_FAILED');
  }

  logger.info('Email sent successfully', { to, subject });
  return successResponse(res, { messageId: result.messageId }, 'Email sent successfully');
}

async function sendTemplateEmail(req, res) {
  const { template, to, data } = req.body;

  if (!template || !to || !data) {
    return errorResponse(res, 'Missing required fields: template, to, data', 400, 'MISSING_PARAMS');
  }

  const validTemplates = ['welcome', 'leadAssigned', 'leadStatusChange', 'passwordReset', 'dailyReport'];
  if (!validTemplates.includes(template)) {
    return errorResponse(res, `Invalid template. Valid templates: ${validTemplates.join(', ')}`, 400, 'INVALID_TEMPLATE');
  }

  const result = await emailService.sendTemplate(template, {
    to,
    ...data
  });

  if (!result.success) {
    return errorResponse(res, result.error || 'Failed to send template email', 500, 'SEND_FAILED');
  }

  logger.info('Template email sent successfully', { template, to });
  return successResponse(res, { messageId: result.messageId }, 'Template email sent successfully');
}

async function sendBulkEmail(req, res) {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return errorResponse(res, 'emails array is required and must not be empty', 400, 'MISSING_PARAMS');
  }

  // Validate all emails have required fields
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    if (!email.to || !email.subject || (!email.text && !email.html)) {
      return errorResponse(res, `Email at index ${i} is missing required fields`, 400, 'INVALID_EMAIL');
    }
  }

  const results = await emailService.sendBulk(emails);

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info('Bulk email operation completed', { total: emails.length, success: successCount, failed: failureCount });

  return successResponse(res, {
    total: emails.length,
    success: successCount,
    failed: failureCount,
    results
  }, `Sent ${successCount} of ${emails.length} emails`);
}
