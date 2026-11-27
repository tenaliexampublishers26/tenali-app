-- ==============================================================================
-- TENALI POST: 1-Level Topic Folders for YouTube Video Lessons
-- 20261127_004_video_folders.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.video_folders (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_folders_exam ON public.video_folders(exam_id, display_order);

ALTER TABLE public.video_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read video_folders" ON public.video_folders;
CREATE POLICY "Public read video_folders"
    ON public.video_folders
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Admins manage video_folders" ON public.video_folders;
CREATE POLICY "Admins manage video_folders"
    ON public.video_folders
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Extend public.videos with folder support, thumbnail, duration, and ordering
ALTER TABLE public.videos
    ALTER COLUMN chapter_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES public.video_folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT 'Video',
    ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_videos_folder ON public.videos(exam_id, folder_id, display_order);

-- Allow anon/authenticated students to read published videos (matching exams/chapters pattern)
DROP POLICY IF EXISTS "Public read published videos" ON public.videos;
CREATE POLICY "Public read published videos"
    ON public.videos
    FOR SELECT
    TO authenticated, anon
    USING (is_published = true OR public.is_admin());
