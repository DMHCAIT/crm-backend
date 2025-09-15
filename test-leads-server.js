// Simple test server to check leads functionality
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

// Supabase configuration
const supabaseUrl = 'https://sxdmrxwclxmuymlvocjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZG1yeHdjbHhtdXltbHZvY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NDIzNzcsImV4cCI6MjA1MDUxODM3N30.6VY9t1X5nEUda-FP2fp8m1Ex4LJfipnW9mLMNlhM29E';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Test leads endpoint
app.get('/api/leads', async (req, res) => {
    try {
        console.log('📋 Fetching leads from database...');
        
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Database error',
                details: error.message 
            });
        }

        console.log(`✅ Found ${leads ? leads.length : 0} leads`);
        
        res.json({
            success: true,
            data: leads || [],
            count: leads ? leads.length : 0
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Test health endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'Lead test server is running',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`🚀 Lead test server running on http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/leads');
});