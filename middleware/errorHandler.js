const logger = require('../utils/logger');

/**
 * Async error wrapper - catches async errors and passes to error handler
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler - 404 errors
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
};

/**
 * Global Error Handler - catches all errors
 */
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    user: req.user?.id || 'anonymous'
  });

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details || err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY'
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Referenced resource not found',
      code: 'FOREIGN_KEY_VIOLATION'
    });
  }

  if (err.code === '23502') { // Not null violation
    return res.status(400).json({
      success: false,
      error: 'Required field missing',
      code: 'REQUIRED_FIELD_MISSING'
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size too large',
      code: 'FILE_TOO_LARGE'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  // Don't leak error details in production
  const response = {
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR'
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details || {};
  }

  res.status(statusCode).json(response);
};

/**
 * Database error wrapper
 * Converts Supabase errors to standardized format
 */
const handleDatabaseError = (error) => {
  if (!error) return null;

  const dbError = new Error(error.message || 'Database operation failed');
  dbError.code = error.code || 'DB_ERROR';
  dbError.statusCode = 500;

  // Map specific database errors
  if (error.message?.includes('duplicate key')) {
    dbError.statusCode = 409;
    dbError.code = 'DUPLICATE_ENTRY';
    dbError.message = 'Resource already exists';
  }

  if (error.message?.includes('foreign key')) {
    dbError.statusCode = 400;
    dbError.code = 'FOREIGN_KEY_VIOLATION';
    dbError.message = 'Referenced resource not found';
  }

  if (error.message?.includes('not found')) {
    dbError.statusCode = 404;
    dbError.code = 'NOT_FOUND';
    dbError.message = 'Resource not found';
  }

  return dbError;
};

/**
 * Success response helper
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error response helper
 */
const errorResponse = (res, message, statusCode = 500, code = 'ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code
  });
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler,
  handleDatabaseError,
  successResponse,
  errorResponse
};
