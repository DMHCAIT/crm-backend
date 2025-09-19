// 🚀 SIMPLIFIED STUDENTS API - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Demo students data
const DEMO_STUDENTS = [
  {
    id: '1',
    student_id: 'STD001',
    name: 'Alice Wilson',
    email: 'alice.wilson@email.com',
    phone: '+91-9876543220',
    course: 'Web Development',
    batch_year: 2025,
    status: 'active',
    progress: 65.5,
    admission_date: '2025-01-15',
    expected_completion_date: '2025-12-15',
    total_fees: 50000,
    fees_paid: 30000,
    fees_pending: 20000,
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-09-19T00:00:00.000Z'
  },
  {
    id: '2',
    student_id: 'STD002',
    name: 'Bob Martinez',
    email: 'bob.martinez@email.com',
    phone: '+91-9876543221',
    course: 'Data Science',
    batch_year: 2025,
    status: 'active',
    progress: 45.2,
    admission_date: '2025-02-01',
    expected_completion_date: '2026-01-31',
    total_fees: 75000,
    fees_paid: 45000,
    fees_pending: 30000,
    created_at: '2025-02-01T00:00:00.000Z',
    updated_at: '2025-09-19T00:00:00.000Z'
  }
];

// Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

module.exports = async (req, res) => {
  // Simple CORS
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication for all requests
    const user = verifyToken(req);
    console.log('🔍 Students API request from:', user.username);

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Get all students
      return res.json({
        success: true,
        students: DEMO_STUDENTS,
        total: DEMO_STUDENTS.length,
        message: 'Students retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { name, email, phone, course } = req.body;
      
      // Simulate creating a new student
      const newStudent = {
        id: String(DEMO_STUDENTS.length + 1),
        student_id: `STD${String(DEMO_STUDENTS.length + 1).padStart(3, '0')}`,
        name: name || 'New Student',
        email: email || 'newstudent@email.com',
        phone: phone || '+91-0000000000',
        course: course || 'General Course',
        batch_year: 2025,
        status: 'enrolled',
        progress: 0,
        admission_date: new Date().toISOString().split('T')[0],
        expected_completion_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_fees: 50000,
        fees_paid: 0,
        fees_pending: 50000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        student: newStudent,
        message: 'Student created successfully (demo mode)'
      });
    }

    return res.json({
      success: true,
      message: 'Students API working (demo mode)'
    });

  } catch (error) {
    console.log('❌ Students API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};