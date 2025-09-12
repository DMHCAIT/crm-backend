// Payment Processing API (Razorpay)
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

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
  console.log('Payments module: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // Set CORS headers for production domain
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

  // Handle GET - Retrieve payments
  if (req.method === 'GET') {
    try {
      const { student_id, status, limit = 50 } = req.query;
      
      let query = supabase
        .from('payments')
        .select('*, students(name, email)')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Apply filters
      if (student_id) query = query.eq('student_id', student_id);
      if (status) query = query.eq('status', status);

      const { data: payments, error } = await query;

      if (error) throw error;

      return res.json({
        success: true,
        data: payments || [],
        count: payments?.length || 0
      });
    } catch (error) {
      console.error('Payments GET error:', error);
      return res.status(500).json({
        error: 'Failed to fetch payments',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'create-order') {
      return await createPaymentOrder(req, res);
    } else if (action === 'webhook') {
      return await handlePaymentWebhook(req, res);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};

async function createPaymentOrder(req, res) {
  try {
    const { amount, currency = 'INR', studentId, courseId, description } = req.body;

    if (!amount || !studentId) {
      return res.status(400).json({
        error: 'Amount and student ID required'
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: 'Payment gateway not configured'
      });
    }

    // Create Razorpay order
    const orderResponse = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: amount, // in paise
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: { description, studentId, courseId }
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET
        }
      }
    );

    const order = orderResponse.data;

    // Save payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        student_id: studentId,
        course_id: courseId,
        amount: amount / 100, // Convert paise to rupees
        currency,
        status: 'pending',
        gateway_order_id: order.id,
        description
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      error: 'Failed to create payment order',
      details: error.message
    });
  }
}

async function handlePaymentWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      
      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          gateway_payment_id: payment.id,
          paid_at: new Date().toISOString()
        })
        .eq('gateway_order_id', payment.order_id);

      // Update student enrollment status
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('student_id, course_id')
        .eq('gateway_order_id', payment.order_id)
        .single();

      if (paymentRecord) {
        await supabase
          .from('students')
          .update({
            payment_status: 'paid',
            status: 'active'
          })
          .eq('id', paymentRecord.student_id);

        console.log('Payment processed successfully for student:', paymentRecord.student_id);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).send('Error');
  }
}
