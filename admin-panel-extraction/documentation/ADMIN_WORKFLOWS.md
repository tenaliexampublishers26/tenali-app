# End-to-End Admin & Student Workflows

> **Source Scope:** Traced directly across Next.js UI pages, API routes, and PostgreSQL state transitions.

---

## Workflow 1: Admin Authentication & Session Entry

1. Admin opens `/admin` -> `src/proxy.ts` checks for `tep_session` or `tep_user_role === 'admin'`; if missing, redirects to `/login?redirect=/admin`.
2. Admin logs in via Email/Password (`POST /api/auth/login`) or Google OAuth (`POST /api/auth/sync`).
3. Backend verifies `users.role = 'admin'` in PostgreSQL and sets `tep_session` (HMAC-SHA256 HTTP-only cookie, 30 days) and `tep_user_role = 'admin'`.
4. `src/app/admin/layout.tsx` hydrates `AuthContext` -> renders Sidebar + Dashboard.
5. **Sensitive Actions (Settings / Profile)**: Admin clicks Save -> `Admin2FAModal` prompts for 6-digit TOTP -> request includes `x-totp-code` -> `verifyAdmin2FA` verifies against `admin_2fa_secrets` (`master_admin_2fa`) -> executes DB mutation -> inserts record into `admin_audit_logs`.

---

## Workflow 2: MCQ Hierarchy Creation, Bulk Import & Publishing

### Admin Workflow
1. **Create Topics & Subtopics**: Admin creates top-level topic (`parent_id = null`) or drills into a topic and adds nested subtopics (`parent_id = currentTopic.id`).
2. **Create Chapter**: Inside a topic, admin creates a chapter (`title`, `description`, `display_order`, `is_published`).
3. **Attach Language Medium**: Inside the chapter, admin attaches a language from `mcq_mediums` (or adds a new medium like `'ta'`/`Tamil`). Creates `draft` `mcq_question_sets` (`version = 1`).
4. **Upload & Preview Questions (`POST /api/admin/mcq/import`, `mode: 'preview'`)**:
   - Admin selects `.csv`, `.xlsx`, `.json` file or pastes JSON array.
   - Server parses & validates every row (`question_text`, `option_a..d`, `correct_option` in `A-D` or `1-4`, duplicates).
   - If `invalidCount > 0`: Admin sees exact row error list and import is blocked.
   - If `valid`: UI displays sample preview table + count.
5. **Confirm Commit (`mode: 'commit'`)**:
   - Admin chooses `publishImmediately` (true/false) and `replaceExisting` (true/false).
   - If `replaceExisting`: increments `version` (`MAX(version) + 1`), inserts new `mcq_question_sets` row; if `publishImmediately`, archives older `'published'` sets for `(chapter_id, medium_id)`.
   - Inserts `mcq_questions` in order and writes a record to `mcq_import_logs`.
6. **Post-Import Curation**: Admin can quick-fix any `correct_option` (1-click pill), edit text/options/explanation, delete 1 question, or click `Publish` / `Unpublish` (`POST /api/admin/mcq/publish`).

### Student Practice Workflow
1. App checks `GET /api/settings/mcq-enabled` (if `false`, displays "Coming Soon").
2. Student browses published `mcq_topics` -> subtopics -> `mcq_chapters` -> available mediums (`GET /api/mcq/chapters/[chapterId]/mediums`).
3. Selecting a medium loads the latest `published` question set (`GET /api/mcq/test/[setId]`, requires `resolveStudentAuth`). Because this is **practice mode**, `correct_option` & `explanation` are returned so the student receives immediate feedback after selecting an option.
4. On completion, `POST /api/mcq/test/[setId]/submit` computes `score`, `correct_count`, `attempted_count` server-side and saves `mcq_attempts` + `mcq_attempt_answers` for attempt history (`GET /api/mcq/attempts/[attemptId]`).

---

## Workflow 3: Live Test Lifecycle (Admin & Student)

### Admin Workflow
1. Ensure global `live_test_enabled = true` (`PUT /api/admin/live-tests/toggle`).
2. **Create Test**: Title, description, `test_date` (`POST /api/admin/live-tests` -> `status = 'draft'`).
3. **Populate Questions**: Add single MCQs (`POST /questions`) OR bulk import CSV/JSON/Excel (`POST /import` preview -> commit).
4. **Make Live (`POST /publish`, `status = 'published'`)**: Requires `question_count >= 1`. Test immediately appears to students and remains open (no countdown timer).
5. **Monitor & Close (`POST /publish`, `status = 'closed'`)**: Admin monitors `attempts_count`; when exam window finishes, admin closes the test, blocking all further submissions.
6. **Release Official Answer Key (`POST /release-answers`, `answers_released = true`)**: Unlocks correct answers and explanations for students.
7. **Rank & Export (`GET /results` & `GET /export?format=excel|pdf`)**: View leaderboard ordered by `marks_obtained DESC, submitted_at ASC`, or download official `.xlsx` / `.pdf` merit list.

### Student Workflow
1. Open Live Tests list (`GET /api/live-tests`) -> sees `published` and `closed` tests.
2. Enter a `published` test -> `GET /api/live-tests/[testId]` returns questions **WITHOUT `correct_option` or `explanation`**.
3. Fill registration details (`studentName`, `phoneNumber`, `location`, `email`), answer questions, and submit (`POST /api/live-tests/[testId]/submit`).
4. Server validates `status === 'published'`, scores answers against DB `correct_option`, and upserts `live_test_submissions` keyed by `(test_id, phone_number)`.
5. Before `answers_released === true`, calling `/answers` returns `403 ANSWERS_NOT_RELEASED`. Once admin releases answers, student can review every question with correct answer + explanation alongside their submission.

---

## Workflow 4: Notes Folder Management & Controlled PDF Access

1. **Organize Folders**: Admin creates Subject Folders and nested Subfolders (`note_folders`).
2. **Upload PDF (`POST /api/admin/notes`)**: Selects PDF (`<= 50 MB`), enters title/description, picks destination folder, sets **`is_previewable`** (default ON) and **`allow_download`** (default OFF).
3. **Modify Controls Anytime**:
   - Inline toggle for `allow_download` directly on note row, OR Edit modal to change both `is_previewable` and `allow_download`, move `folder_id`, or replace the PDF file.
4. **Delete Folder / Note**:
   - Deleting a note removes DB row + backing storage file.
   - Deleting a folder via 3-dots menu recursively deletes all child folders, notes inside them, and their backing storage files.
5. **Student Access Flow**:
   - Students navigate folders (`note_folders`) -> notes list.
   - **Preview (`is_previewable = true`)**: Opens in-app canvas PDF reader (`/api/notes/[id]/preview`). If `allow_download = false`, download UI, right-click, `Ctrl+S`/`Ctrl+P`, and direct tab navigation are blocked.
   - **Download (`allow_download = true`)**: Calls `/api/notes/[id]/download`, increments `download_count`, and saves PDF. If `false`, returns `403 DOWNLOAD_DISABLED`.
   - *(Note: In Flutter LMS, enforce this via private bucket + Edge Function signed URLs rather than public Storage URLs.)*
