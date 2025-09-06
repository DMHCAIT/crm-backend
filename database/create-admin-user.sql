-- ========================================
-- SETUP EXISTING USERS: Create Profiles & Login Credentials
-- Run this in your Supabase SQL Editor
-- ========================================

-- Setup for existing users in your Supabase Auth system
-- Based on the users visible in your dashboard:
-- 1. laharesh@dmhca.in
-- 2. santoshapplication@dmhca.in

DO $$
DECLARE
    user_record RECORD;
    admin_profile_id UUID;
    password_salt TEXT;
    password_hash TEXT;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Setting up profiles and credentials for existing users...';
    RAISE NOTICE '';
    
    -- Process all existing users
    FOR user_record IN 
        SELECT id, email, created_at, email_confirmed_at
        FROM auth.users 
        WHERE email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in')
        ORDER BY created_at
    LOOP
        RAISE NOTICE '👤 Processing user: %', user_record.email;
        
        -- Check if profile exists
        SELECT id INTO admin_profile_id 
        FROM user_profiles 
        WHERE user_id = user_record.id 
        LIMIT 1;
        
        IF admin_profile_id IS NULL THEN
            -- Create user profile
            INSERT INTO user_profiles (
                user_id,
                full_name,
                role,
                department,
                is_active,
                timezone
            ) VALUES (
                user_record.id,
                CASE 
                    WHEN user_record.email = 'laharesh@dmhca.in' THEN 'Laharesh - DMHCA Admin'
                    WHEN user_record.email = 'santoshapplication@dmhca.in' THEN 'Santosh - Application Manager'
                    ELSE 'DMHCA Team Member'
                END,
                CASE 
                    WHEN user_record.email = 'laharesh@dmhca.in' THEN 'super_admin'
                    ELSE 'admin'
                END,
                'Administration',
                true,
                'Asia/Kolkata'
            ) RETURNING id INTO admin_profile_id;
            
            RAISE NOTICE '   ✅ Profile created with ID: %', admin_profile_id;
        ELSE
            RAISE NOTICE '   ✅ Profile already exists: %', admin_profile_id;
        END IF;
        
        -- Check if login credentials exist
        IF NOT EXISTS (SELECT 1 FROM login_credentials WHERE email = user_record.email) THEN
            -- Generate salt and hash
            password_salt := encode(gen_random_bytes(32), 'hex');
            password_hash := 'supabase_managed_' || encode(gen_random_bytes(16), 'hex');
            
            -- Insert login credentials
            INSERT INTO login_credentials (
                email,
                password_hash,
                salt,
                is_active,
                is_verified,
                email_verified_at,
                user_profile_id,
                login_count
            ) VALUES (
                user_record.email,
                password_hash,
                password_salt,
                true,
                true,
                COALESCE(user_record.email_confirmed_at, NOW()),
                admin_profile_id,
                0
            );
            
            RAISE NOTICE '   ✅ Login credentials created';
        ELSE
            -- Update existing credentials to ensure active
            UPDATE login_credentials SET
                is_active = true,
                is_verified = true,
                failed_login_attempts = 0,
                locked_until = NULL,
                email_verified_at = COALESCE(email_verified_at, NOW()),
                user_profile_id = admin_profile_id
            WHERE email = user_record.email;
            
            RAISE NOTICE '   ✅ Login credentials updated';
        END IF;
        
        processed_count := processed_count + 1;
        RAISE NOTICE '';
    END LOOP;
    
    IF processed_count = 0 THEN
        RAISE NOTICE '❌ No users found with emails: laharesh@dmhca.in, santoshapplication@dmhca.in';
        RAISE NOTICE '🔧 Available users in auth.users:';
        
        FOR user_record IN SELECT email FROM auth.users ORDER BY created_at LOOP
            RAISE NOTICE '   • %', user_record.email;
        END LOOP;
        
        RETURN;
    END IF;
    
    RAISE NOTICE '🎉 ===============================================';
    RAISE NOTICE '🎉 USER SETUP COMPLETE! (% users processed)', processed_count;
    RAISE NOTICE '🎉 ===============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Your existing users are now ready for CRM login:';
    RAISE NOTICE '';
    RAISE NOTICE '👤 laharesh@dmhca.in (Super Admin)';
    RAISE NOTICE '👤 santoshapplication@dmhca.in (Admin)';
    RAISE NOTICE '';
    RAISE NOTICE '� Use the same passwords you set in Supabase Dashboard';
    RAISE NOTICE '✅ You can now login to your CRM system!';
    
END $$;

-- ========================================
-- Verify the setup for your existing users
-- ========================================
SELECT 
    'auth.users' as table_name,
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at
FROM auth.users au
WHERE au.email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in')

UNION ALL

SELECT 
    'user_profiles' as table_name,
    up.id,
    up.role || ' - ' || COALESCE(up.full_name, 'No name'),
    up.created_at,
    CASE WHEN up.is_active THEN up.updated_at ELSE NULL END
FROM user_profiles up
WHERE up.user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in')
)

UNION ALL

SELECT 
    'login_credentials' as table_name,
    lc.id,
    CASE 
        WHEN lc.is_active AND lc.is_verified THEN 'ACTIVE & VERIFIED'
        WHEN lc.is_active THEN 'ACTIVE but not verified'
        ELSE 'INACTIVE'
    END,
    lc.created_at,
    lc.last_login
FROM login_credentials lc
WHERE lc.email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in');

-- ========================================
-- Create some sample data for testing
-- ========================================

-- Insert a sample lead for testing
INSERT INTO leads (
    name,
    full_name,
    email,
    phone,
    country,
    source,
    status,
    course,
    score,
    lead_quality
) VALUES (
    'John Doe',
    'John Doe',
    'john.doe@example.com',
    '+1234567890',
    'India',
    'website',
    'new',
    'MBBS',
    75,
    'hot'
) ON CONFLICT DO NOTHING;

-- Insert sample course
INSERT INTO courses (
    name,
    description,
    duration_weeks,
    fee,
    status
) VALUES (
    'MBBS Program',
    'Bachelor of Medicine and Bachelor of Surgery',
    260,
    500000,
    'active'
) ON CONFLICT DO NOTHING;

-- ========================================
-- Final verification and instructions for existing users
-- ========================================
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    credential_count INTEGER;
    lead_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users WHERE email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in');
    SELECT COUNT(*) INTO profile_count FROM user_profiles WHERE user_id IN (
        SELECT id FROM auth.users WHERE email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in')
    );
    SELECT COUNT(*) INTO credential_count FROM login_credentials WHERE email IN ('laharesh@dmhca.in', 'santoshapplication@dmhca.in');
    SELECT COUNT(*) INTO lead_count FROM leads;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 SETUP VERIFICATION:';
    RAISE NOTICE '   • Auth users: %', user_count;
    RAISE NOTICE '   • User profiles: %', profile_count;
    RAISE NOTICE '   • Login credentials: %', credential_count;
    RAISE NOTICE '   • Sample leads: %', lead_count;
    RAISE NOTICE '';
    
    IF user_count >= 1 AND profile_count >= 1 AND credential_count >= 1 THEN
        RAISE NOTICE '✅ ALL SYSTEMS GO! Your CRM is ready to use.';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Next Steps:';
        RAISE NOTICE '1. Open your CRM frontend';
        RAISE NOTICE '2. Login with: laharesh@dmhca.in (Super Admin)';
        RAISE NOTICE '3. Or login with: santoshapplication@dmhca.in (Admin)';
        RAISE NOTICE '4. Use the passwords you set in Supabase Dashboard';
        RAISE NOTICE '5. Enjoy your fully functional CRM!';
    ELSE
        RAISE NOTICE '⚠️  Setup incomplete. Please check the errors above.';
        RAISE NOTICE '   Expected: user_count >= 1, profile_count >= 1, credential_count >= 1';
        RAISE NOTICE '   Actual: user_count = %, profile_count = %, credential_count = %', user_count, profile_count, credential_count;
    END IF;
END $$;
