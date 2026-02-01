-- ============================================================================
-- Seed Data for ElectriGo
-- ============================================================================

-- This file runs after migrations to populate initial data

-- NOTE: For test users with auth, use the Supabase Dashboard or Admin API
-- Manual password hashing in SQL is not recommended.
-- For local development, you can create users via:
-- 1. Sign up through the app
-- 2. Use SQL below (with properly generated hash)
-- 3. Use Supabase Dashboard

-- For now, we'll use a properly formatted user creation
-- The trigger will automatically create the public.users record

DO $$
DECLARE
    test_user_id uuid := '550e8400-e29b-41d4-a716-446655440000'; -- Fixed UUID for consistency
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
        -- Insert into auth.users with Supabase-compatible password hash
        -- This is the bcrypt hash for 'asdf1234' using cost factor 10
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            test_user_id,
            'authenticated',
            'authenticated',
            'tushar21211@iiitd.ac.in',
            -- Password: asdf1234 (Supabase-compatible bcrypt hash)
            crypt('asdf1234', gen_salt('bf')), -- Use PostgreSQL's crypt function with bcrypt
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Tushar Chandra","password":"asdf1234"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    END IF;
END $$;
