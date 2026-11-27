-- ==============================================================================
-- TENALI POST: Production Database Migration
-- 20261019_001_admin_schema.sql
-- Indian Postal Departmental Exam Preparation System
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is a verified administrator
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
        auth.jwt() ->> 'email' = 'tenaliexamspublishers26@gmail.com'
    );
END;
$$;

CREATE POLICY "Admins can view and manage admin_users"
    ON public.admin_users
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. STUDENT PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    circle TEXT NOT NULL DEFAULT 'Andhra Pradesh',
    cadre TEXT NOT NULL DEFAULT 'GDS',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
    ON public.student_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can update own permitted fields"
    ON public.student_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid() AND status = 'active')
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full access to student_profiles"
    ON public.student_profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. EXAMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active exams"
    ON public.exams
    FOR SELECT
    TO authenticated, anon
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage exams"
    ON public.exams
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. CHAPTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    chapter_number INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published chapters"
    ON public.chapters
    FOR SELECT
    TO authenticated, anon
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage chapters"
    ON public.chapters
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. QUESTIONS TABLE (MULTILINGUAL QUESTION BANK)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    
    -- Multilingual Question Text
    question_text_en TEXT NOT NULL,
    question_text_te TEXT,
    question_text_hi TEXT,
    
    -- Multilingual Option A
    option_a_en TEXT NOT NULL,
    option_a_te TEXT,
    option_a_hi TEXT,
    
    -- Multilingual Option B
    option_b_en TEXT NOT NULL,
    option_b_te TEXT,
    option_b_hi TEXT,
    
    -- Multilingual Option C
    option_c_en TEXT NOT NULL,
    option_c_te TEXT,
    option_c_hi TEXT,
    
    -- Multilingual Option D
    option_d_en TEXT NOT NULL,
    option_d_te TEXT,
    option_d_hi TEXT,
    
    -- Answer key & Explanations
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation_en TEXT,
    explanation_te TEXT,
    explanation_hi TEXT,
    
    -- Metadata
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    citation TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_chapter ON public.questions(exam_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_published ON public.questions(is_published);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read published practice questions"
    ON public.questions
    FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins full management of questions"
    ON public.questions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. LIVE TESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_tests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    chapter_id TEXT REFERENCES public.chapters(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view published live tests"
    ON public.live_tests
    FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage live tests"
    ON public.live_tests
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. LIVE TEST SUBMISSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id TEXT NOT NULL REFERENCES public.live_tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    score INT NOT NULL,
    total_marks INT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_test UNIQUE (test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_test_student ON public.live_test_submissions(test_id, student_id);

ALTER TABLE public.live_test_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submissions"
    ON public.live_test_submissions
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage test submissions"
    ON public.live_test_submissions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. VIDEOS & NOTES TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
    language TEXT NOT NULL DEFAULT 'te' CHECK (language IN ('en', 'te', 'hi')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published videos"
    ON public.videos
    FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage videos"
    ON public.videos
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    storage_path TEXT,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
    language TEXT NOT NULL DEFAULT 'te' CHECK (language IN ('en', 'te', 'hi')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published notes"
    ON public.notes
    FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage notes"
    ON public.notes
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. ADMIN AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.admin_audit_logs(timestamp DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read and insert audit logs"
    ON public.admin_audit_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. SERVER-SIDE SECURE SCORING & ANSWER SECURITY FUNCTION
-- ------------------------------------------------------------------------------
-- Secure function to get questions for an active live test (strips answers if test hasn't ended)
CREATE OR REPLACE FUNCTION public.get_live_test_questions_safe(p_test_id TEXT)
RETURNS TABLE (
    id TEXT,
    chapter_id TEXT,
    exam_id TEXT,
    question_text_en TEXT,
    question_text_te TEXT,
    question_text_hi TEXT,
    option_a_en TEXT,
    option_a_te TEXT,
    option_a_hi TEXT,
    option_b_en TEXT,
    option_b_te TEXT,
    option_b_hi TEXT,
    option_c_en TEXT,
    option_c_te TEXT,
    option_c_hi TEXT,
    option_d_en TEXT,
    option_d_te TEXT,
    option_d_hi TEXT,
    correct_answer TEXT,
    explanation_en TEXT,
    explanation_te TEXT,
    explanation_hi TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_end_time TIMESTAMPTZ;
    v_is_ended BOOLEAN;
    v_is_adm BOOLEAN;
BEGIN
    SELECT end_time INTO v_end_time FROM public.live_tests WHERE id = p_test_id;
    v_is_ended := (now() > v_end_time);
    v_is_adm := public.is_admin();

    RETURN QUERY
    SELECT 
        q.id,
        q.chapter_id,
        q.exam_id,
        q.question_text_en,
        q.question_text_te,
        q.question_text_hi,
        q.option_a_en,
        q.option_a_te,
        q.option_a_hi,
        q.option_b_en,
        q.option_b_te,
        q.option_b_hi,
        q.option_c_en,
        q.option_c_te,
        q.option_c_hi,
        q.option_d_en,
        q.option_d_te,
        q.option_d_hi,
        -- Hide correct answer and explanations until test end date has passed or user is admin
        CASE WHEN (v_is_ended OR v_is_adm) THEN q.correct_answer ELSE NULL END,
        CASE WHEN (v_is_ended OR v_is_adm) THEN q.explanation_en ELSE NULL END,
        CASE WHEN (v_is_ended OR v_is_adm) THEN q.explanation_te ELSE NULL END,
        CASE WHEN (v_is_ended OR v_is_adm) THEN q.explanation_hi ELSE NULL END
    FROM public.questions q
    WHERE q.id IN (
        SELECT jsonb_array_elements_text(lt.question_ids)
        FROM public.live_tests lt
        WHERE lt.id = p_test_id
    );
END;
$$;

-- Secure server-side function to calculate and record test score
CREATE OR REPLACE FUNCTION public.submit_live_test_secure(
    p_test_id TEXT,
    p_answers JSONB -- Map of question_id -> chosen_answer ('A','B','C','D')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_student_name TEXT;
    v_student_email TEXT;
    v_score INT := 0;
    v_total INT := 0;
    v_q_id TEXT;
    v_chosen TEXT;
    v_real_ans TEXT;
    v_test RECORD;
BEGIN
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to submit test.';
    END IF;

    -- Fetch student profile
    SELECT full_name, email INTO v_student_name, v_student_email
    FROM public.student_profiles WHERE id = v_student_id;

    IF v_student_email IS NULL THEN
        v_student_email := auth.jwt() ->> 'email';
        v_student_name := COALESCE(auth.jwt() ->> 'name', 'Aspirant');
    END IF;

    -- Fetch live test
    SELECT * INTO v_test FROM public.live_tests WHERE id = p_test_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Live test not found.';
    END IF;

    -- Evaluate each question in the test
    FOR v_q_id IN SELECT jsonb_array_elements_text(v_test.question_ids)
    LOOP
        v_total := v_total + 1;
        SELECT correct_answer INTO v_real_ans FROM public.questions WHERE id = v_q_id;
        v_chosen := p_answers ->> v_q_id;

        IF v_chosen IS NOT NULL AND UPPER(v_chosen) = UPPER(v_real_ans) THEN
            v_score := v_score + 1;
        END IF;
    END LOOP;

    -- Upsert submission
    INSERT INTO public.live_test_submissions (
        test_id,
        student_id,
        student_name,
        student_email,
        score,
        total_marks,
        submitted_at
    ) VALUES (
        p_test_id,
        v_student_id,
        v_student_name,
        v_student_email,
        v_score,
        v_total,
        now()
    )
    ON CONFLICT (test_id, student_id) DO UPDATE SET
        score = EXCLUDED.score,
        total_marks = EXCLUDED.total_marks,
        submitted_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'score', v_score,
        'total', v_total
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. INITIAL ADMIN PROVISIONING TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Provision student profile automatically
    INSERT INTO public.student_profiles (id, email, full_name, circle, cadre)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'circle', 'Andhra Pradesh'),
        COALESCE(NEW.raw_user_meta_data->>'cadre', 'GDS')
    )
    ON CONFLICT (id) DO NOTHING;

    -- If designated admin email, auto-promote to admin_users table
    IF NEW.email = 'tenaliexamspublishers26@gmail.com' THEN
        INSERT INTO public.admin_users (user_id, email, role)
        VALUES (NEW.id, NEW.email, 'superadmin')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();
