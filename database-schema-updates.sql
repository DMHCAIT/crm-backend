-- Database Schema Updates for Enhanced CRM Backend
-- Run this script to align your database with the implemented APIs

-- 0. Add assigned_to column to users table (CRITICAL FIX)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Add foreign key constraint and index for assigned_to
ALTER TABLE public.users 
ADD CONSTRAINT IF NOT EXISTS users_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_to ON public.users(assigned_to);

COMMENT ON COLUMN public.users.assigned_to IS 'References the user ID of who this user is assigned to (supervisor/manager)';

-- 1. Create missing data_exports table for enhanced-data-export.js
CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  export_type character varying NOT NULL,
  format character varying NOT NULL DEFAULT 'csv',
  status character varying DEFAULT 'pending' CHECK (status::text = ANY (ARRAY['pending', 'processing', 'completed', 'failed']::text[])),
  filters jsonb DEFAULT '{}'::jsonb,
  filename character varying,
  file_url text,
  file_size integer,
  record_count integer,
  created_by_id uuid NOT NULL,
  completed_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_message text,
  download_count integer DEFAULT 0,
  last_downloaded_at timestamp with time zone,
  CONSTRAINT data_exports_pkey PRIMARY KEY (id),
  CONSTRAINT data_exports_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id)
);

-- 2. Update system_settings table to match our API expectations
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS key character varying;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS value text;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS data_type character varying DEFAULT 'string' CHECK (data_type::text = ANY (ARRAY['string', 'number', 'boolean', 'json', 'encrypted']::text[]));

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS is_sensitive boolean DEFAULT false;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT false;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS validation_rules jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS default_value text;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS created_by_id uuid;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS updated_by_id uuid;

-- Add foreign key constraints for system_settings
ALTER TABLE public.system_settings 
DROP CONSTRAINT IF EXISTS system_settings_created_by_id_fkey;

ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);

ALTER TABLE public.system_settings 
DROP CONSTRAINT IF EXISTS system_settings_updated_by_id_fkey;

ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.users(id);

-- Add unique constraint on key and category combination
ALTER TABLE public.system_settings 
DROP CONSTRAINT IF EXISTS system_settings_key_category_unique;

ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_key_category_unique UNIQUE (key, category);

-- 3. Update user_sessions table to match our API requirements
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active' CHECK (status::text = ANY (ARRAY['active', 'logged_out', 'revoked', 'expired']::text[]));

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS logged_out_at timestamp with time zone;

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone;

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS revoked_by uuid;

-- Update user_sessions foreign key to reference public.users instead of auth.users
ALTER TABLE public.user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- 4. Add missing foreign key constraints for better data integrity

-- Communications table foreign keys
ALTER TABLE public.communications 
DROP CONSTRAINT IF EXISTS communications_lead_id_fkey;

ALTER TABLE public.communications 
ADD CONSTRAINT communications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);

ALTER TABLE public.communications 
DROP CONSTRAINT IF EXISTS communications_campaign_id_fkey;

ALTER TABLE public.communications 
ADD CONSTRAINT communications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);

-- Notes table foreign keys
ALTER TABLE public.notes 
DROP CONSTRAINT IF EXISTS notes_lead_id_fkey;

ALTER TABLE public.notes 
ADD CONSTRAINT notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);

-- Notifications table foreign keys
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_lead_id_fkey;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);

-- Integration logs table foreign keys
ALTER TABLE public.integration_logs 
DROP CONSTRAINT IF EXISTS integration_logs_lead_id_fkey;

ALTER TABLE public.integration_logs 
ADD CONSTRAINT integration_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);

-- Analytics events table foreign keys
ALTER TABLE public.analytics_events 
DROP CONSTRAINT IF EXISTS analytics_events_lead_id_fkey;

ALTER TABLE public.analytics_events 
ADD CONSTRAINT analytics_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);

-- 5. Create indexes for better performance on commonly queried fields

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_lead_id ON public.analytics_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_student_id ON public.analytics_events(student_id);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_student_id ON public.communications(student_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_type ON public.communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON public.documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_student_id ON public.notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Data exports indexes
CREATE INDEX IF NOT EXISTS idx_data_exports_created_by_id ON public.data_exports(created_by_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON public.data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_created_at ON public.data_exports(created_at);

-- 6. Add Row Level Security (RLS) policies for better security

-- Enable RLS on sensitive tables
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS data_exports_policy ON public.data_exports;
CREATE POLICY data_exports_policy ON public.data_exports
  FOR ALL USING (created_by_id = auth.uid());

DROP POLICY IF EXISTS user_sessions_policy ON public.user_sessions;
CREATE POLICY user_sessions_policy ON public.user_sessions
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS system_settings_policy ON public.system_settings;
CREATE POLICY system_settings_policy ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- 7. Create helpful views for common queries

-- Create view for active user sessions with user details
CREATE OR REPLACE VIEW public.active_user_sessions AS
SELECT 
  us.*,
  u.name,
  u.email,
  u.role
FROM public.user_sessions us
JOIN public.users u ON us.user_id = u.id
WHERE us.status = 'active' 
  AND us.expires_at > NOW();

-- Create view for recent communications with lead/student details
CREATE OR REPLACE VIEW public.recent_communications AS
SELECT 
  c.*,
  l."fullName" as lead_name,
  s.name as student_name,
  u.name as user_name
FROM public.communications c
LEFT JOIN public.leads l ON c.lead_id = l.id
LEFT JOIN public.students s ON c.student_id = s.id
LEFT JOIN public.users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

-- Create view for document verification queue
CREATE OR REPLACE VIEW public.document_verification_queue AS
SELECT 
  d.*,
  s.name as student_name,
  s.email as student_email,
  u.name as uploaded_by_name
FROM public.documents d
LEFT JOIN public.students s ON d.student_id = s.id
LEFT JOIN public.users u ON d.uploaded_by = u.id
WHERE d.status = 'pending'
ORDER BY d.created_at ASC;

-- 8. Create functions for common operations

-- Function to update user last activity
CREATE OR REPLACE FUNCTION update_user_last_activity(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET last_login = NOW() 
  WHERE id = user_uuid;
  
  UPDATE public.user_sessions 
  SET last_activity = NOW() 
  WHERE user_id = user_uuid 
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.user_sessions 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- 9. Handle existing NOT NULL constraint on setting_key by copying key to setting_key
-- First, update any existing records to ensure consistency
UPDATE public.system_settings 
SET setting_key = key 
WHERE key IS NOT NULL AND setting_key IS NULL;

UPDATE public.system_settings 
SET setting_value = value 
WHERE value IS NOT NULL AND setting_value IS NULL;

-- Insert default system settings with both old and new column names
INSERT INTO public.system_settings (
  setting_key, setting_value, setting_type, category, description, default_value, 
  is_public, is_encrypted, modified_by, validation_rules,
  key, value, data_type, is_sensitive, is_required, created_by_id, updated_by_id
)
VALUES 
  ('smtp_server', '', 'string', 'email_config', 'SMTP server for sending emails', '', false, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'smtp_server', '', 'string', false, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('smtp_port', '587', 'string', 'email_config', 'SMTP server port', '587', false, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'smtp_port', '587', 'number', false, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('smtp_username', '', 'string', 'email_config', 'SMTP username', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'smtp_username', '', 'string', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('smtp_password', '', 'string', 'email_config', 'SMTP password', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'smtp_password', '', 'encrypted', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('sms_api_key', '', 'string', 'sms_config', 'SMS service API key', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'sms_api_key', '', 'encrypted', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('whatsapp_access_token', '', 'string', 'whatsapp_config', 'WhatsApp Business API access token', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'whatsapp_access_token', '', 'encrypted', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('razorpay_key_id', '', 'string', 'payment_config', 'Razorpay key ID', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'razorpay_key_id', '', 'string', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1)),
  ('razorpay_key_secret', '', 'string', 'payment_config', 'Razorpay key secret', '', false, true, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), '{}',
   'razorpay_key_secret', '', 'encrypted', true, false, 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1), 
   (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1))
ON CONFLICT (setting_key) DO NOTHING;

-- Script completed successfully
SELECT 'Database schema updates completed successfully!' as result;