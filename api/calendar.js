const logger = require('../utils/logger');
const calendarService = require('../services/calendarService');
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
      case 'list':
        return await listEvents(req, res);
      case 'create':
        return await createEvent(req, res);
      case 'get':
        return await getEvent(req, res);
      case 'update':
        return await updateEvent(req, res);
      case 'delete':
        return await deleteEvent(req, res);
      case 'upcoming':
        return await getUpcomingEvents(req, res);
      case 'today':
        return await getTodayEvents(req, res);
      case 'check-conflicts':
        return await checkConflicts(req, res);
      default:
        return errorResponse(res, 'Invalid action', 400, 'INVALID_ACTION');
    }
  } catch (error) {
    logger.error('Calendar API error', { action, error: error.message });
    return errorResponse(res, error.message, 500, 'CALENDAR_ERROR');
  }
};

async function listEvents(req, res) {
  const { start_date, end_date, type, status } = req.query;
  
  if (!start_date || !end_date) {
    return errorResponse(res, 'start_date and end_date required', 400, 'MISSING_PARAMS');
  }

  const result = await calendarService.getEvents({
    user_id: req.user.userId,
    start_date,
    end_date,
    type,
    status
  });

  return successResponse(res, result.data, 'Events fetched successfully');
}

async function createEvent(req, res) {
  const { title, description, start_time, end_time, type, attendees, lead_id, location, reminder_minutes } = req.body;

  if (!title || !start_time || !end_time) {
    return errorResponse(res, 'title, start_time, and end_time required', 400, 'MISSING_PARAMS');
  }

  // Check for conflicts
  const conflicts = await calendarService.checkConflicts(req.user.userId, start_time, end_time);
  if (conflicts.hasConflicts) {
    return errorResponse(res, 'Time slot conflicts with existing event', 409, 'CONFLICT');
  }

  const result = await calendarService.createEvent({
    title,
    description,
    start_time,
    end_time,
    type,
    attendees,
    lead_id,
    user_id: req.user.userId,
    location,
    reminder_minutes
  });

  // Send email notification
  try {
    await emailService.send({
      to: req.user.email,
      subject: `New Event: ${title}`,
      html: `
        <h2>Event Created</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>When:</strong> ${new Date(start_time).toLocaleString()}</p>
        <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      `
    });
  } catch (emailError) {
    logger.warn('Failed to send event notification email', { error: emailError.message });
  }

  return successResponse(res, result.data, 'Event created successfully', 201);
}

async function getEvent(req, res) {
  const { id } = req.query;

  if (!id) {
    return errorResponse(res, 'Event ID required', 400, 'MISSING_PARAMS');
  }

  const result = await calendarService.getEventById(id);
  return successResponse(res, result.data, 'Event fetched successfully');
}

async function updateEvent(req, res) {
  const { id } = req.query;
  const updates = req.body;

  if (!id) {
    return errorResponse(res, 'Event ID required', 400, 'MISSING_PARAMS');
  }

  // Check conflicts if time is being updated
  if (updates.start_time && updates.end_time) {
    const conflicts = await calendarService.checkConflicts(
      req.user.userId,
      updates.start_time,
      updates.end_time,
      id
    );
    if (conflicts.hasConflicts) {
      return errorResponse(res, 'Time slot conflicts with existing event', 409, 'CONFLICT');
    }
  }

  const result = await calendarService.updateEvent(id, updates);
  return successResponse(res, result.data, 'Event updated successfully');
}

async function deleteEvent(req, res) {
  const { id } = req.query;

  if (!id) {
    return errorResponse(res, 'Event ID required', 400, 'MISSING_PARAMS');
  }

  await calendarService.deleteEvent(id);
  return successResponse(res, null, 'Event deleted successfully');
}

async function getUpcomingEvents(req, res) {
  const result = await calendarService.getUpcomingEvents(req.user.userId);
  return successResponse(res, result.data, 'Upcoming events fetched');
}

async function getTodayEvents(req, res) {
  const result = await calendarService.getTodayEvents(req.user.userId);
  return successResponse(res, result.data, 'Today\'s events fetched');
}

async function checkConflicts(req, res) {
  const { start_time, end_time, exclude_event_id } = req.query;

  if (!start_time || !end_time) {
    return errorResponse(res, 'start_time and end_time required', 400, 'MISSING_PARAMS');
  }

  const result = await calendarService.checkConflicts(
    req.user.userId,
    start_time,
    end_time,
    exclude_event_id
  );

  return successResponse(res, result, 'Conflict check completed');
}
