# Admin Database Schema & LMS Data Model

> **Summary Document:** Synthesizes the complete LMS-relevant PostgreSQL schema verified from live database inspection (`31` public tables) and migration scripts. Full column-by-column specifications for all tables reside in [TABLES_AND_RELATIONSHIPS.md](../database-reference/TABLES_AND_RELATIONSHIPS.md).

---

## 1. LMS Scope Summary (24 Relevant/Legacy Tables vs. 7 Excluded E-Commerce Tables)

- **Active Admin & LMS Tables (17 Tables)**:
  - Auth, Security & Config: `users`, `admin_2fa_secrets`, `admin_audit_logs`, `settings`
  - MCQ System: `mcq_topics`, `mcq_chapters`, `mcq_mediums`, `mcq_question_sets`, `mcq_questions`, `mcq_import_logs`, `mcq_attempts`, `mcq_attempt_answers`, `mcq_bookmarks`
  - Live Tests: `live_tests`, `live_test_questions`, `live_test_submissions`
  - Notes: `note_folders`, `pdf_materials`
- **Legacy / Unused Tables (6 Tables — Do Not Build New Features On)**:
  `mcq_categories`, `mcq_options`, `pdf_uploads`, `user_quiz_attempts`, `subscription_plans`, `user_subscriptions`
- **E-Commerce Tables (7 Tables — EXCLUDE COMPLETELY)**:
  `products`, `orders`, `order_items`, `payment_sessions`, `addresses`, `user_addresses`, `wishlist_items`

---

## 2. Core Table Relationships & Constraints

### 2.1 Recursive Folder Trees (`mcq_topics` & `note_folders`)
Both modules support arbitrary nesting depth via nullable self-referencing `parent_id`:
- `mcq_topics.parent_id` -> `mcq_topics.id` (index: `idx_mcq_topics_parent_id`, unique `slug`)
- `note_folders.parent_id` -> `note_folders.id` (index: `idx_note_folders_parent_id`)
- **Important Behavioral Detail**: In `DELETE /api/admin/mcq/topics` and `DELETE /api/admin/notes/folders/[id]`, deletion runs top-down by collecting all descendant folder/topic IDs recursively before clearing child content and deleting folders. Add `ON DELETE CASCADE` or retain recursive RPC deletion in Flutter backend.

### 2.2 Question Versioning Model (`mcq_chapters` -> `mcq_question_sets` -> `mcq_questions`)
- `mcq_question_sets` has `UNIQUE(chapter_id, medium_id, version)` (`mcq_question_sets_chapter_id_medium_id_version_key`).
- Multiple versions can coexist for `(chapter_id, medium_id)`, where at most one is `'published'` and older published sets move to `'archived'`.
- `mcq_questions.correct_option` has a PostgreSQL `CHECK` constraint (`'A'`, `'B'`, `'C'`, `'D'`).
- `mcq_attempts` stores `question_set_id` + `question_set_version` so historical student attempt scores stay tied to the exact set version they practiced.

### 2.3 Live Test Submission & Leaderboard Constraints
- `live_test_questions.test_id` -> `live_tests.id` (`idx_live_test_questions_test_order` on `(test_id, display_order)`).
- `live_test_submissions.test_id` -> `live_tests.id`, `.user_id` -> `users.id` (nullable if guest submission).
- `UNIQUE(test_id, phone_number)` (`uq_live_test_phone_per_test`): guarantees one submission record per student phone number per test (`ON CONFLICT DO UPDATE` on re-submit while test is `published`).
- Leaderboard index `idx_live_test_submissions_rank` on `(test_id, marks_obtained DESC, submitted_at)`.

### 2.4 Notes Access Flags (`pdf_materials`)
- `folder_id` -> `note_folders.id` (`idx_pdf_materials_folder_id`).
- `allow_download BOOLEAN NOT NULL DEFAULT false`
- `is_previewable BOOLEAN NOT NULL DEFAULT true`
- `download_count INTEGER DEFAULT 0`

---

## 3. Supabase Client / Flutter RLS Requirements

All 31 tables have **RLS enabled** (enforced automatically by database event trigger `auto_enable_rls_for_new_tables`).
Because current policies were designed for a privileged server pooler (`postgres` user bypassing RLS):
1. **Admin writes** currently have `service_role` policies only (no `authenticated` admin write policy exists).
2. **`note_folders`** has RLS enabled with **zero policies**, blocking non-service-role reads completely.
3. **`live_test_questions`** exposes `correct_option` & `explanation` to public `SELECT` when `published` — must be restricted via RPC or column-level grants before connecting a native Flutter client directly.

Full SQL definitions and recommended `public.is_admin()` policies are documented in [RLS_POLICIES.md](../database-reference/RLS_POLICIES.md).
