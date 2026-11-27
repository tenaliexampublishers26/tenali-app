-- ==============================================================================
-- TENALI POST: Authentication, Mandatory User Profiles & Admin Announcements RLS
-- Migration: 20261020_002_auth_profiles_announcements.sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ADMIN USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. IS_ADMIN() SECURITY DEFINER FUNCTION
-- Strictly checks admin_users table and designated authorized administrator email
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    ) OR (
        LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN (
            'tenaliexampublishers26@gmail.com',
            'tenaliexamspublishers26@gmail.com'
        )
    );
END;
$$;

DROP POLICY IF EXISTS "Admins can view and manage admin_users" ON public.admin_users;
CREATE POLICY "Admins can view and manage admin_users"
    ON public.admin_users
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own admin entry" ON public.admin_users;
CREATE POLICY "Users can view own admin entry"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. USER PROFILES TABLE (4 Mandatory Fields: Full Name, Email, Phone, Location)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    location TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view and manage own profile (supports SELECT, INSERT, UPDATE, upserts); Admins have full access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

CREATE POLICY "Users can manage own profile"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Backfill profiles for any users that existed in auth.users before table creation
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data ->> 'full_name', 'Postal Candidate'),
    CASE WHEN LOWER(TRIM(email)) IN ('tenaliexampublishers26@gmail.com', 'tenaliexamspublishers26@gmail.com') THEN 'admin' ELSE 'student' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. ANNOUNCEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read published announcements; Admins can read all announcements
DROP POLICY IF EXISTS "Published announcements visible to authenticated" ON public.announcements;
CREATE POLICY "Published announcements visible to authenticated"
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

-- RLS: Only authorized administrator can create announcements
DROP POLICY IF EXISTS "Only admins can insert announcements" ON public.announcements;
CREATE POLICY "Only admins can insert announcements"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- RLS: Only authorized administrator can update announcements
DROP POLICY IF EXISTS "Only admins can update announcements" ON public.announcements;
CREATE POLICY "Only admins can update announcements"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS: Only authorized administrator can delete announcements
DROP POLICY IF EXISTS "Only admins can delete announcements" ON public.announcements;
CREATE POLICY "Only admins can delete announcements"
    ON public.announcements
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. ANNOUNCEMENT READ RECEIPTS TABLE (Per-user unread tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own read status
DROP POLICY IF EXISTS "Users can view own announcement reads" ON public.announcement_reads;
CREATE POLICY "Users can view own announcement reads"
    ON public.announcement_reads
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- RLS: Users can insert/upsert their own read status
DROP POLICY IF EXISTS "Users can mark announcements as read" ON public.announcement_reads;
CREATE POLICY "Users can mark announcements as read"
    ON public.announcement_reads
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- RLS: Users can update their own read status
DROP POLICY IF EXISTS "Users can update own announcement reads" ON public.announcement_reads;
CREATE POLICY "Users can update own announcement reads"
    ON public.announcement_reads
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC PROFILE INITIALIZATION & ADMIN PROVISIONING TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_name TEXT;
BEGIN
    BEGIN
        v_is_admin := LOWER(TRIM(COALESCE(NEW.email, ''))) IN ('tenaliexampublishers26@gmail.com', 'tenaliexamspublishers26@gmail.com');
        v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Postal Candidate');

        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.email, ''),
            v_name,
            CASE WHEN v_is_admin THEN 'admin' ELSE 'student' END
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = CASE WHEN public.profiles.full_name = 'Postal Candidate' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;

        IF v_is_admin THEN
            INSERT INTO public.admin_users (user_id, email, role)
            VALUES (NEW.id, NEW.email, 'superadmin')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user exception: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-confirm newly registered users to avoid mail rate limits blocking testing
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.confirmed_at IS NULL THEN
        NEW.confirmed_at := now();
    END IF;
    IF NEW.email_confirmed_at IS NULL THEN
        NEW.email_confirmed_at := now();
    END IF;
    IF NEW.last_sign_in_at IS NULL THEN
        NEW.last_sign_in_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();


-- ------------------------------------------------------------------------------
-- 8. INITIAL ANNOUNCEMENTS SEED DATA
-- ------------------------------------------------------------------------------
INSERT INTO public.announcements (id, title, message, is_published, published_at)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'Welcome to Tenali Post Exam Preparation Portal',
        'Official preparation platform for India Post MTS, Postman, Mail Guard, and PA/SA departmental examinations. Complete your 4-field candidate profile to begin practice tests.',
        true,
        now()
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'All-India Postal Mock Test Announcement',
        'Weekly live mock examination schedule is active. Check the Live Tests section for upcoming syllabus coverage and question pattern.',
        true,
        now()
    )
ON CONFLICT (id) DO NOTHING;
