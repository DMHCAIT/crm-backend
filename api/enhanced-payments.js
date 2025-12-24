// Enhanced Payments Processing API with Transaction Management
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');


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
  logger.info('Payments module: Supabase initialization failed:', error.message);
}

// Initialize Razorpay (conditionally)
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
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

module.exports = async (req, res) => {
    // Set CORS headers
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
        if (action === 'student' && urlParts.length > 1) {
          const studentId = urlParts[urlParts.length - 1];
          await handleGetPaymentsByStudent(req, res, studentId);
        } else if (action === 'analytics') {
          await handleGetPaymentAnalytics(req, res);
        } else if (action === 'receipt') {
          const paymentId = urlParts[urlParts.length - 2];
          await handleGetReceipt(req, res, paymentId);
        } else {
          await handleGetPayments(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'create-order') {
          await handleCreateOrder(req, res);
        } else if (action === 'process') {
          const paymentId = urlParts[urlParts.length - 2];
          await handleProcessPayment(req, res, paymentId);
        } else if (action === 'refund') {
          const paymentId = urlParts[urlParts.length - 2];
          await handleRefundPayment(req, res, paymentId);
        } else if (action === 'webhook') {
          await handleWebhook(req, res);
        } else {
          await handleCreatePayment(req, res);
        }
        break;
      
      case 'PUT':
        await handleUpdatePayment(req, res, id);
        break;
      
      case 'DELETE':
        await handleDeletePayment(req, res, id);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Payments API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get payments with filtering
async function handleGetPayments(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      status,
      student_id,
      payment_method,
      fee_type,
      academic_year,
      semester,
      start_date,
      end_date,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        student:student_id(name, email, phone, course),
        created_by:created_by_id(name, email),
        processed_by:processed_by_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (student_id) query = query.eq('student_id', student_id);
    if (payment_method) query = query.eq('payment_method', payment_method);
    if (fee_type) query = query.eq('fee_type', fee_type);
    if (academic_year) query = query.eq('academic_year', academic_year);
    if (semester) query = query.eq('semester', semester);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: payments, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      payments: payments || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: payments?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create payment record
async function handleCreatePayment(req, res) {
  try {
    const user = verifyToken(req);
    const {
      amount,
      currency = 'INR',
      student_id,
      payment_method,
      payment_gateway = 'razorpay',
      fee_type,
      academic_year,
      semester,
      due_date,
      notes,
      installment_number,
      total_installments,
      description
    } = req.body;

    if (!amount || !student_id || !fee_type) {
      return res.status(400).json({
        success: false,
        error: 'Amount, student_id, and fee_type are required'
      });
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        amount: parseFloat(amount),
        currency,
        student_id,
        payment_method,
        payment_gateway,
        fee_type,
        academic_year,
        semester,
        due_date,
        notes,
        installment_number: installment_number || 1,
        total_installments: total_installments || 1,
        description: description || `${fee_type} payment for ${student.name}`,
        status: 'pending',
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        student:student_id(name, email, phone, course)
      `)
      .single();

    if (error) throw error;

    // Log payment creation
    await logPaymentActivity(payment.id, 'created', `Payment record created for ${student.name}`, user.id);

    res.json({
      success: true,
      message: 'Payment record created successfully',
      payment
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Create payment order (for online payments)
async function handleCreateOrder(req, res) {
  try {
    const user = verifyToken(req);
    const {
      amount,
      currency = 'INR',
      student_id,
      description,
      fee_type,
      academic_year,
      semester
    } = req.body;

    if (!amount || !student_id || !description) {
      return res.status(400).json({
        success: false,
        error: 'Amount, student_id, and description are required'
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured'
      });
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency,
      receipt: `receipt_${uuidv4()}`,
      notes: {
        student_id,
        student_name: student.name,
        fee_type,
        academic_year,
        semester
      }
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        amount: parseFloat(amount),
        currency,
        student_id,
        payment_method: 'online',
        payment_gateway: 'razorpay',
        fee_type,
        academic_year,
        semester,
        description,
        status: 'pending',
        gateway_order_id: razorpayOrder.id,
        gateway_order_data: razorpayOrder,
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        student:student_id(name, email, phone)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Payment order created successfully',
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      },
      payment,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order',
      details: error.message
    });
  }
}

// Process payment (after successful payment)
async function handleProcessPayment(req, res) {
  try {
    const user = verifyToken(req);
    const paymentId = req.params?.id || req.url.split('/').slice(-2)[0];
    const {
      gateway_transaction_id,
      gateway_payment_id,
      gateway_signature,
      gateway_response
    } = req.body;

    if (!gateway_transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'Gateway transaction ID is required'
      });
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Verify Razorpay signature (if provided)
    if (gateway_signature && payment.gateway_order_id) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(payment.gateway_order_id + '|' + gateway_payment_id)
        .digest('hex');

      if (expectedSignature !== gateway_signature) {
        return res.status(400).json({
          success: false,
          error: 'Payment verification failed'
        });
      }
    }

    // Update payment status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        gateway_transaction_id,
        gateway_payment_id,
        gateway_signature,
        gateway_response,
        processed_by_id: user.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select(`
        *,
        student:student_id(name, email, phone, course)
      `)
      .single();

    if (updateError) throw updateError;

    // Log payment processing
    await logPaymentActivity(paymentId, 'completed', `Payment processed successfully`, user.id);

    // Generate receipt number
    const receiptNumber = `DMHCA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    await supabase
      .from('payments')
      .update({ receipt_number: receiptNumber })
      .eq('id', paymentId);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment: { ...updatedPayment, receipt_number: receiptNumber }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Handle payment refund
async function handleRefundPayment(req, res) {
  try {
    const user = verifyToken(req);
    const paymentId = req.params?.id || req.url.split('/').slice(-2)[0];
    const {
      refund_amount,
      refund_reason,
      refund_notes
    } = req.body;

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed payments can be refunded'
      });
    }

    const refundAmountValue = parseFloat(refund_amount || payment.amount);

    if (refundAmountValue > payment.amount) {
      return res.status(400).json({
        success: false,
        error: 'Refund amount cannot exceed payment amount'
      });
    }

    // Process refund through Razorpay (if applicable)
    let refundResponse = null;
    if (razorpay && payment.gateway_payment_id) {
      try {
        refundResponse = await razorpay.payments.refund(payment.gateway_payment_id, {
          amount: Math.round(refundAmountValue * 100), // Convert to paise
          notes: {
            reason: refund_reason,
            processed_by: user.id
          }
        });
      } catch (refundError) {
        logger.error('Razorpay refund error:', refundError);
        return res.status(500).json({
          success: false,
          error: 'Failed to process refund',
          details: refundError.message
        });
      }
    }

    // Update payment record
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: refundAmountValue === payment.amount ? 'refunded' : 'partial_refund',
        refund_amount: refundAmountValue,
        refund_reason,
        refund_notes,
        refund_processed_at: new Date().toISOString(),
        refund_gateway_id: refundResponse?.id || null,
        refund_gateway_data: refundResponse || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select(`
        *,
        student:student_id(name, email, phone)
      `)
      .single();

    if (updateError) throw updateError;

    // Log refund activity
    const refundType = refundAmountValue === payment.amount ? 'full refund' : 'partial refund';
    await logPaymentActivity(paymentId, 'refunded', `${refundType} processed: ₹${refundAmountValue}`, user.id);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      payment: updatedPayment,
      refund: refundResponse
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get payments by student
async function handleGetPaymentsByStudent(req, res, studentId) {
  try {
    const user = verifyToken(req);

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        created_by:created_by_id(name, email),
        processed_by:processed_by_id(name, email)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate payment summary
    const summary = calculatePaymentSummary(payments || []);

    res.json({
      success: true,
      payments: payments || [],
      summary,
      student_id: studentId
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get payment analytics
async function handleGetPaymentAnalytics(req, res) {
  try {
    const user = verifyToken(req);
    const { period = '30d', fee_type, academic_year } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate);

    if (fee_type) query = query.eq('fee_type', fee_type);
    if (academic_year) query = query.eq('academic_year', academic_year);

    const { data: payments, error } = await query;

    if (error) throw error;

    const analytics = {
      period,
      overview: calculateAnalyticsOverview(payments || []),
      trends: calculatePaymentTrends(payments || [], days),
      byFeeType: groupByFeeType(payments || []),
      byPaymentMethod: groupByPaymentMethod(payments || []),
      byStatus: groupByStatus(payments || [])
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Handle Razorpay webhooks
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund.entity);
        break;
      default:
        logger.info('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Helper functions
function calculatePaymentSummary(payments) {
  const summary = {
    total_payments: payments.length,
    total_amount: 0,
    completed_amount: 0,
    pending_amount: 0,
    refunded_amount: 0,
    by_status: {}
  };

  payments.forEach(payment => {
    summary.total_amount += payment.amount;
    
    if (payment.status === 'completed') {
      summary.completed_amount += payment.amount;
    } else if (payment.status === 'pending') {
      summary.pending_amount += payment.amount;
    } else if (payment.status === 'refunded' || payment.status === 'partial_refund') {
      summary.refunded_amount += (payment.refund_amount || 0);
    }

    summary.by_status[payment.status] = (summary.by_status[payment.status] || 0) + 1;
  });

  return summary;
}

function calculateAnalyticsOverview(payments) {
  return {
    total_payments: payments.length,
    total_revenue: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
    pending_revenue: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    refunded_amount: payments
      .reduce((sum, p) => sum + (p.refund_amount || 0), 0)
  };
}

function calculatePaymentTrends(payments, days) {
  const dailyData = {};
  
  payments.forEach(payment => {
    const date = payment.created_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { date, amount: 0, count: 0 };
    }
    if (payment.status === 'completed') {
      dailyData[date].amount += payment.amount;
    }
    dailyData[date].count++;
  });

  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function groupByFeeType(payments) {
  return payments.reduce((acc, payment) => {
    const type = payment.fee_type || 'other';
    if (!acc[type]) {
      acc[type] = { count: 0, amount: 0 };
    }
    acc[type].count++;
    if (payment.status === 'completed') {
      acc[type].amount += payment.amount;
    }
    return acc;
  }, {});
}

function groupByPaymentMethod(payments) {
  return payments.reduce((acc, payment) => {
    const method = payment.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
}

function groupByStatus(payments) {
  return payments.reduce((acc, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1;
    return acc;
  }, {});
}

async function logPaymentActivity(paymentId, action, description, userId) {
  try {
    await supabase
      .from('payment_activities')
      .insert([{
        payment_id: paymentId,
        action,
        description,
        user_id: userId,
        timestamp: new Date().toISOString()
      }]);
  } catch (error) {
    logger.error('Failed to log payment activity:', error);
  }
}

async function handlePaymentCaptured(payment) {
  // Update payment status when captured via webhook
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      gateway_payment_id: payment.id,
      processed_at: new Date().toISOString()
    })
    .eq('gateway_order_id', payment.order_id);

  if (error) {
    logger.error('Error updating payment from webhook:', error);
  }
}

async function handlePaymentFailed(payment) {
  // Update payment status when failed
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      gateway_payment_id: payment.id,
      gateway_response: payment
    })
    .eq('gateway_order_id', payment.order_id);

  if (error) {
    logger.error('Error updating failed payment:', error);
  }
}