const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {String} source - 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', { 
        path: req.path, 
        errors,
        source 
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Authentication
  login: Joi.object({
    username: Joi.string().email().required().messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    })
  }),

  // Lead creation/update
  createLead: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().pattern(/^[0-9+\-() ]+$/).allow('', null),
    source: Joi.string().valid('website', 'referral', 'social', 'advertisement', 'other').default('other'),
    status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost').default('new'),
    assigned_to: Joi.string().uuid().allow(null),
    notes: Joi.string().max(5000).allow('', null),
    tags: Joi.array().items(Joi.string()).default([]),
    custom_fields: Joi.object().default({})
  }),

  updateLead: Joi.object({
    name: Joi.string().min(2).max(255),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().pattern(/^[0-9+\-() ]+$/).allow('', null),
    source: Joi.string().valid('website', 'referral', 'social', 'advertisement', 'other'),
    status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
    assigned_to: Joi.string().uuid().allow(null),
    notes: Joi.string().max(5000).allow('', null),
    tags: Joi.array().items(Joi.string()),
    custom_fields: Joi.object()
  }).min(1), // At least one field required

  // User creation/update
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(255).required(),
    role: Joi.string().valid('admin', 'manager', 'sales', 'support').default('sales'),
    department: Joi.string().max(100).allow('', null),
    reports_to: Joi.string().uuid().allow(null)
  }),

  updateUser: Joi.object({
    email: Joi.string().email(),
    fullName: Joi.string().min(2).max(255),
    role: Joi.string().valid('admin', 'manager', 'sales', 'support'),
    department: Joi.string().max(100).allow('', null),
    reports_to: Joi.string().uuid().allow(null),
    isActive: Joi.boolean()
  }).min(1),

  // Communication
  createCommunication: Joi.object({
    type: Joi.string().valid('email', 'call', 'whatsapp', 'sms', 'meeting').required(),
    direction: Joi.string().valid('inbound', 'outbound').default('outbound'),
    subject: Joi.string().max(500).allow('', null),
    content: Joi.string().max(10000).required(),
    lead_id: Joi.string().uuid().required(),
    scheduled_at: Joi.date().iso().allow(null),
    status: Joi.string().valid('draft', 'scheduled', 'sent', 'delivered', 'failed').default('draft')
  }),

  // Payment
  createPayment: Joi.object({
    lead_id: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default('INR'),
    payment_method: Joi.string().valid('cash', 'card', 'upi', 'bank_transfer', 'cheque').required(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').default('pending'),
    notes: Joi.string().max(1000).allow('', null)
  }),

  // Analytics query params
  analyticsQuery: Joi.object({
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
    user_id: Joi.string().uuid(),
    event_type: Joi.string().valid('page_view', 'lead_created', 'lead_updated', 'lead_converted', 'user_login'),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().max(50),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // UUID param
  uuidParam: Joi.object({
    id: Joi.string().uuid().required()
  })
};

// Sanitization middleware
const sanitize = (req, res, next) => {
  // Remove potential XSS attacks from strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

module.exports = {
  validate,
  schemas,
  sanitize
};
