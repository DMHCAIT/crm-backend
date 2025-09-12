-- SQL Script to create leads table with correct schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)

-- Drop existing leads table if it has wrong schema
DROP TABLE IF EXISTS public.leads CASCADE;

-- Create leads table with correct schema
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    course_interest VARCHAR(100),
    lead_source VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(50) DEFAULT 'new',
    stage VARCHAR(50) DEFAULT 'inquiry', 
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID,
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (allows all operations for now)
CREATE POLICY "Allow all operations on leads" ON public.leads
    FOR ALL USING (true) WITH CHECK (true);

-- Insert a test lead to verify table works
INSERT INTO public.leads (name, email, phone, course_interest, status)
VALUES ('Test Lead', 'test@dmhca.com', '9876543210', 'Healthcare Course', 'new');

-- Verify the table was created correctly
SELECT * FROM public.leads;

-- Clean up test data (optional)
DELETE FROM public.leads WHERE email = 'test@dmhca.com';