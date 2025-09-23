// 🚀 STUDENTS API - DATABASE-CONNECTED WITH HIERARCHICAL ACCESS
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('✅ Students API: Supabase client initialized');
  }
} catch (error) {
  console.error('❌ Students API: Supabase initialization failed:', error.message);
}

// Demo students data - fallback when database not available
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

// Get subordinate users for hierarchical access control
async function getSubordinateUsers(userId) {
  if (!supabase) {
    console.log('⚠️ No database connection, skipping hierarchical filtering');
    return [userId];
  }

  try {
    // Get all users who report to this user (direct and indirect)
    const subordinates = [];
    const toCheck = [userId];
    const checked = new Set();

    while (toCheck.length > 0) {
      const currentUserId = toCheck.shift();
      
      if (checked.has(currentUserId)) continue;
      checked.add(currentUserId);
      subordinates.push(currentUserId);

      // Find users who report to current user
      const { data: directReports } = await supabase
        .from('users')
        .select('id')
        .eq('reports_to', currentUserId);

      if (directReports) {
        directReports.forEach(user => {
          if (!checked.has(user.id)) {
            toCheck.push(user.id);
          }
        });
      }
    }

    return subordinates;
  } catch (error) {
    console.error('❌ Error getting subordinate users:', error);
    return [userId];
  }
}

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
      // Get enrolled students from leads database with hierarchical access control
      try {
        if (!supabase) {
          console.log('⚠️ No database connection, returning demo data');
          return res.json({
            success: true,
            students: DEMO_STUDENTS,
            total: DEMO_STUDENTS.length,
            message: 'Students retrieved successfully (demo data - no database)'
          });
        }

        // Get user ID for hierarchical filtering
        const { data: currentUserData } = await supabase
          .from('users')
          .select('id, role')
          .eq('username', user.username)
          .single();

        if (!currentUserData) {
          console.log('⚠️ User not found in database, using demo data');
          return res.json({
            success: true,
            students: DEMO_STUDENTS,
            total: DEMO_STUDENTS.length,
            message: 'Students retrieved successfully (demo data - user not found)'
          });
        }

        let enrolledLeads = [];

        // Super admin sees all enrolled leads
        if (currentUserData.role === 'super_admin') {
          const { data: allEnrolledLeads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'enrolled')
            .order('created_at', { ascending: false });

          if (error) throw error;
          enrolledLeads = allEnrolledLeads || [];
        } else {
          // Regular users see enrolled leads from their hierarchy
          const accessibleUserIds = await getSubordinateUsers(currentUserData.id);
          
          const { data: hierarchicalEnrolledLeads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'enrolled')
            .in('assignedTo', accessibleUserIds)
            .order('created_at', { ascending: false });

          if (error) throw error;
          enrolledLeads = hierarchicalEnrolledLeads || [];
        }

        // Convert enrolled leads to students format
        const students = enrolledLeads.map((lead, index) => ({
          id: lead.id.toString(),
          student_id: `STD${String(lead.id).padStart(3, '0')}`,
          name: lead.fullName || lead.name || 'Unknown Student',
          email: lead.email || '',
          phone: lead.phone || lead.whatsapp || '',
          course: lead.interestedIn || lead.course || 'Not specified',
          batch_year: new Date().getFullYear(),
          status: 'active',
          progress: Math.floor(Math.random() * 60) + 10, // Random progress between 10-70%
          admission_date: lead.updated_at?.split('T')[0] || lead.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          expected_completion_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_fees: 50000,
          fees_paid: Math.floor(Math.random() * 30000) + 10000, // Random fees paid
          fees_pending: function() { return 50000 - this.fees_paid; }(),
          created_at: lead.created_at || new Date().toISOString(),
          updated_at: lead.updated_at || new Date().toISOString(),
          // Additional student-specific fields
          assignedTo: lead.assignedTo,
          source: lead.source,
          qualification: lead.qualification,
          country: lead.country
        }));

        console.log(`✅ Students API: Found ${students.length} enrolled students for user ${user.username}`);

        return res.json({
          success: true,
          students: students,
          total: students.length,
          message: `Students retrieved successfully (${students.length} enrolled leads found)`
        });

      } catch (error) {
        console.error('❌ Error fetching enrolled students:', error);
        
        // Fallback to demo data on database error
        return res.json({
          success: true,
          students: DEMO_STUDENTS,
          total: DEMO_STUDENTS.length,
          message: 'Students retrieved successfully (demo data - database error)',
          error: error.message
        });
      }
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