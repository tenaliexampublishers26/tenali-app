-- ==============================================================================
-- TENALI POST LMS: Production Supabase Hardening & Admin Panel Migration
-- Migration: 20261125_003_lms_admin_hardening.sql
-- Scope: Strictly LMS tables (17 active tables). Excludes all e-commerce tables.
-- ==============================================================================

-- 1. Authoritative Admin Helper Function (SECURITY DEFINER)
-- Checks public.users.role = 'admin' for the authenticated Supabase Auth user.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id::text = auth.uid()::text
      AND role = 'admin'
  );
$$;

-- 2. Prevent users.role Self-Escalation & Allow Admin Read/Manage on public.users
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own non-role profile" ON public.users;
CREATE POLICY "Users can update own non-role profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      id::text = auth.uid()::text
      AND role IS NOT DISTINCT FROM (
        SELECT u.role FROM public.users u WHERE u.id::text = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin());

-- 3. Fix note_folders Missing RLS Policies & Add pdf_materials.storage_path
ALTER TABLE public.pdf_materials ADD COLUMN IF NOT EXISTS storage_path TEXT;

DROP POLICY IF EXISTS "Authenticated users read note_folders" ON public.note_folders;
CREATE POLICY "Authenticated users read note_folders"
  ON public.note_folders
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage note_folders" ON public.note_folders;
CREATE POLICY "Admins manage note_folders"
  ON public.note_folders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage pdf_materials" ON public.pdf_materials;
CREATE POLICY "Admins manage pdf_materials"
  ON public.pdf_materials
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Admin Policies Across LMS Tables (settings, audit logs, MCQ, Live Tests)
-- Note: admin_2fa_secrets intentionally remains service_role ONLY.
DROP POLICY IF EXISTS "Admins manage settings" ON public.settings;
CREATE POLICY "Admins manage settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins read audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_topics" ON public.mcq_topics;
CREATE POLICY "Admins manage mcq_topics"
  ON public.mcq_topics
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_chapters" ON public.mcq_chapters;
CREATE POLICY "Admins manage mcq_chapters"
  ON public.mcq_chapters
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_mediums" ON public.mcq_mediums;
CREATE POLICY "Admins manage mcq_mediums"
  ON public.mcq_mediums
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_question_sets" ON public.mcq_question_sets;
CREATE POLICY "Admins manage mcq_question_sets"
  ON public.mcq_question_sets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_questions" ON public.mcq_questions;
CREATE POLICY "Admins manage mcq_questions"
  ON public.mcq_questions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage mcq_import_logs" ON public.mcq_import_logs;
CREATE POLICY "Admins manage mcq_import_logs"
  ON public.mcq_import_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read all mcq_attempts" ON public.mcq_attempts;
CREATE POLICY "Admins read all mcq_attempts"
  ON public.mcq_attempts
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admins read all mcq_attempt_answers" ON public.mcq_attempt_answers;
CREATE POLICY "Admins read all mcq_attempt_answers"
  ON public.mcq_attempt_answers
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read all mcq_bookmarks" ON public.mcq_bookmarks;
CREATE POLICY "Admins read all mcq_bookmarks"
  ON public.mcq_bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage live_tests" ON public.live_tests;
CREATE POLICY "Admins manage live_tests"
  ON public.live_tests
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage live_test_questions" ON public.live_test_questions;
CREATE POLICY "Admins manage live_test_questions"
  ON public.live_test_questions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage live_test_submissions" ON public.live_test_submissions;
CREATE POLICY "Admins manage live_test_submissions"
  ON public.live_test_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Hardened Live Test Answer-Key Masking & Server-Side Scoring RPCs
-- Prevent direct student table SELECT of live_test_questions (hides correct_option & explanation)
DROP POLICY IF EXISTS "Allow public read questions for published live tests" ON public.live_test_questions;
DROP POLICY IF EXISTS "Only admins read live_test_questions directly" ON public.live_test_questions;
CREATE POLICY "Only admins read live_test_questions directly"
  ON public.live_test_questions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Safe student question fetch (strips correct_option & explanation)
CREATE OR REPLACE FUNCTION public.get_student_live_test_questions(p_test_id UUID)
RETURNS TABLE (
  id UUID,
  test_id UUID,
  question_key VARCHAR,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.live_tests WHERE public.live_tests.id = p_test_id;
  IF v_status IS NULL OR (v_status <> 'published' AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Live test is not currently open.';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.test_id,
    q.question_key,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.display_order
  FROM public.live_test_questions q
  WHERE q.test_id = p_test_id
  ORDER BY q.display_order ASC;
END;
$$;

-- Server-side grading & deduplicated upsert by (test_id, phone_number)
CREATE OR REPLACE FUNCTION public.submit_live_test(
  p_test_id UUID,
  p_student_name TEXT,
  p_phone_number TEXT,
  p_location TEXT,
  p_email TEXT,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_total INT := 0;
  v_attempted INT := 0;
  v_correct INT := 0;
  v_wrong INT := 0;
  v_pct NUMERIC := 0;
  v_clean_phone TEXT;
  v_q RECORD;
  v_chosen TEXT;
  v_submission_id UUID;
BEGIN
  SELECT status INTO v_status FROM public.live_tests WHERE id = p_test_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Live test not found.';
  END IF;
  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'Live test is not accepting submissions (status: %).', v_status;
  END IF;

  v_clean_phone := regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
  IF length(v_clean_phone) > 10 THEN
    v_clean_phone := right(v_clean_phone, 10);
  END IF;
  IF length(v_clean_phone) < 10 THEN
    RAISE EXCEPTION 'A valid 10-digit phone number is required.';
  END IF;

  FOR v_q IN
    SELECT id, UPPER(TRIM(correct_option)) AS correct_option
    FROM public.live_test_questions
    WHERE test_id = p_test_id
  LOOP
    v_total := v_total + 1;
    v_chosen := UPPER(TRIM(COALESCE(p_answers ->> v_q.id::text, '')));
    IF v_chosen IN ('A', 'B', 'C', 'D') THEN
      v_attempted := v_attempted + 1;
      IF v_chosen = v_q.correct_option THEN
        v_correct := v_correct + 1;
      END IF;
    END IF;
  END LOOP;

  v_wrong := v_attempted - v_correct;
  IF v_total > 0 THEN
    v_pct := ROUND((v_correct::numeric / v_total::numeric) * 100.0, 2);
  END IF;

  INSERT INTO public.live_test_submissions (
    test_id,
    user_id,
    student_name,
    phone_number,
    location,
    email,
    total_questions,
    attempted_count,
    correct_count,
    wrong_count,
    marks_obtained,
    percentage,
    answers,
    submitted_at
  )
  VALUES (
    p_test_id,
    auth.uid(),
    TRIM(p_student_name),
    v_clean_phone,
    TRIM(p_location),
    TRIM(p_email),
    v_total,
    v_attempted,
    v_correct,
    v_wrong,
    v_correct,
    v_pct,
    COALESCE(p_answers, '{}'::jsonb),
    now()
  )
  ON CONFLICT (test_id, phone_number) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.live_test_submissions.user_id),
    student_name = EXCLUDED.student_name,
    location = EXCLUDED.location,
    email = EXCLUDED.email,
    total_questions = EXCLUDED.total_questions,
    attempted_count = EXCLUDED.attempted_count,
    correct_count = EXCLUDED.correct_count,
    wrong_count = EXCLUDED.wrong_count,
    marks_obtained = EXCLUDED.marks_obtained,
    percentage = EXCLUDED.percentage,
    answers = EXCLUDED.answers,
    submitted_at = now()
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'total_questions', v_total,
    'attempted_count', v_attempted,
    'correct_count', v_correct,
    'wrong_count', v_wrong,
    'marks_obtained', v_correct,
    'percentage', v_pct
  );
END;
$$;

-- Gated answer key release RPC (requires answers_released = true OR is_admin())
CREATE OR REPLACE FUNCTION public.get_live_test_answers(p_test_id UUID)
RETURNS TABLE (
  id UUID,
  question_key VARCHAR,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option VARCHAR,
  explanation TEXT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released BOOLEAN;
BEGIN
  SELECT answers_released INTO v_released FROM public.live_tests WHERE public.live_tests.id = p_test_id;
  IF NOT COALESCE(v_released, false) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ANSWERS_NOT_RELEASED';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.question_key,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.correct_option,
    q.explanation,
    q.display_order
  FROM public.live_test_questions q
  WHERE q.test_id = p_test_id
  ORDER BY q.display_order ASC;
END;
$$;

-- 6. Recursive Admin Cascade Helpers & Question Set Publish RPC
CREATE OR REPLACE FUNCTION public.publish_mcq_question_set(p_set_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id UUID;
  v_medium_id UUID;
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required.';
  END IF;

  SELECT chapter_id, medium_id INTO v_chapter_id, v_medium_id
  FROM public.mcq_question_sets
  WHERE id = p_set_id;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'Question set not found.';
  END IF;

  IF p_action = 'publish' THEN
    SELECT COUNT(*) INTO v_count FROM public.mcq_questions WHERE question_set_id = p_set_id;
    IF v_count < 1 THEN
      RAISE EXCEPTION 'Cannot publish an empty question set.';
    END IF;

    UPDATE public.mcq_question_sets
    SET status = 'archived'
    WHERE chapter_id = v_chapter_id
      AND medium_id = v_medium_id
      AND status = 'published'
      AND id <> p_set_id;

    UPDATE public.mcq_question_sets
    SET status = 'published',
        question_count = v_count,
        published_at = now()
    WHERE id = p_set_id;

    UPDATE public.mcq_questions
    SET status = 'published'
    WHERE question_set_id = p_set_id;
  ELSE
    UPDATE public.mcq_question_sets
    SET status = 'draft'
    WHERE id = p_set_id;

    UPDATE public.mcq_questions
    SET status = 'draft'
    WHERE question_set_id = p_set_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_mcq_topic_tree(p_topic_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_ids UUID[];
  v_chapter_ids UUID[];
  v_set_ids UUID[];
  v_question_ids UUID[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required.';
  END IF;

  WITH RECURSIVE tree AS (
    SELECT id FROM public.mcq_topics WHERE id = p_topic_id
    UNION ALL
    SELECT t.id FROM public.mcq_topics t INNER JOIN tree tr ON t.parent_id = tr.id
  )
  SELECT ARRAY_AGG(id) INTO v_topic_ids FROM tree;

  IF v_topic_ids IS NULL OR array_length(v_topic_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT ARRAY_AGG(id) INTO v_chapter_ids
  FROM public.mcq_chapters WHERE topic_id = ANY(v_topic_ids);

  IF v_chapter_ids IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO v_set_ids
    FROM public.mcq_question_sets WHERE chapter_id = ANY(v_chapter_ids);

    IF v_set_ids IS NOT NULL THEN
      SELECT ARRAY_AGG(id) INTO v_question_ids
      FROM public.mcq_questions WHERE question_set_id = ANY(v_set_ids);

      IF v_question_ids IS NOT NULL THEN
        DELETE FROM public.mcq_bookmarks WHERE question_id = ANY(v_question_ids);
        DELETE FROM public.mcq_attempt_answers WHERE question_id = ANY(v_question_ids);
      END IF;

      DELETE FROM public.mcq_attempts WHERE question_set_id = ANY(v_set_ids);
      DELETE FROM public.mcq_questions WHERE question_set_id = ANY(v_set_ids);
      DELETE FROM public.mcq_question_sets WHERE id = ANY(v_set_ids);
    END IF;

    DELETE FROM public.mcq_import_logs WHERE chapter_id = ANY(v_chapter_ids);
    DELETE FROM public.mcq_chapters WHERE id = ANY(v_chapter_ids);
  END IF;

  DELETE FROM public.mcq_import_logs WHERE topic_id = ANY(v_topic_ids);
  DELETE FROM public.mcq_topics WHERE id = ANY(v_topic_ids);

  RETURN array_length(v_topic_ids, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_note_folder_tree(p_folder_id UUID)
RETURNS TABLE (deleted_storage_path TEXT, deleted_pdf_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_ids UUID[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required.';
  END IF;

  WITH RECURSIVE tree AS (
    SELECT id FROM public.note_folders WHERE id = p_folder_id
    UNION ALL
    SELECT f.id FROM public.note_folders f INNER JOIN tree tr ON f.parent_id = tr.id
  )
  SELECT ARRAY_AGG(id) INTO v_folder_ids FROM tree;

  IF v_folder_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  DELETE FROM public.pdf_materials
  WHERE folder_id = ANY(v_folder_ids)
  RETURNING storage_path, pdf_url;

  DELETE FROM public.note_folders WHERE id = ANY(v_folder_ids);
END;
$$;

-- 7. Switch 'notes' Storage Bucket to Private & Restrict Direct Student Downloads
UPDATE storage.buckets
SET public = false
WHERE id = 'notes';

DROP POLICY IF EXISTS "Admins manage notes storage objects" ON storage.objects;
CREATE POLICY "Admins manage notes storage objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'notes' AND public.is_admin())
  WITH CHECK (bucket_id = 'notes' AND public.is_admin());
