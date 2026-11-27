# Admin & LMS Backend API Reference

> **Source Scope:** Audited from every route file under `src/app/api/admin/**`, `src/app/api/auth/**`, `src/app/api/mcq/**`, `src/app/api/live-tests/**`, `src/app/api/notes/**`, and `src/app/api/settings/**`.
> **E-Commerce Exclusions:** `/api/admin/products*`, `/api/admin/orders*`, `/api/admin/analytics/revenue`, `/api/orders*`, `/api/payments*`, `/api/checkout*`, `/api/products*` are excluded from the Flutter LMS blueprint (noted briefly only where shared files like `/api/admin/analytics` mix metrics).

---

## 1. Admin Auth, Profile & Security APIs

| Endpoint | Method | Guard | Request Input | Response / Behavior | Source File |
|---|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public | `{ identifier, password }` | Verifies bcrypt password hash; sets HTTP-only HMAC `tep_session` & `tep_user_role` cookies | `src/app/api/auth/login/route.ts` |
| `/api/auth/register` | `POST` | Public | `{ name, email, phone, password }` | Creates `users` row (`role='customer'`) + Supabase Auth user | `src/app/api/auth/register/route.ts` |
| `/api/auth/sync` | `POST` | Supabase Auth | `{}` | Syncs OAuth user into `users`; sets `tep_user_id`, `tep_user_role`, and `tep_session` if admin | `src/app/api/auth/sync/route.ts` |
| `/api/auth/me` | `GET` | Session | — | Returns verified user profile `{ user }` from `tep_session` or Supabase Auth | `src/app/api/auth/me/route.ts` |
| `/api/auth/logout` | `POST` | Public | — | Clears `tep_session` & `tep_user_role` cookies | `src/app/api/auth/logout/route.ts` |
| `/api/admin/2fa` | `GET` | `requireAdmin` | — | Fetches or creates `master_admin_2fa` secret; returns `{ qrCodeDataUrl, manualKey, enabled }` | `src/app/api/admin/2fa/route.ts` |
| `/api/admin/2fa` | `DELETE` | `requireAdmin` | — | Deletes master 2FA secret to force QR regeneration | `src/app/api/admin/2fa/route.ts` |
| `/api/admin/profile` | `PUT` | `verifyAdminAccess` + `verifyAdmin2FA` | `{ name, phone, currentPassword, newPassword }`, header `x-totp-code` | Updates admin `name`/`phone` or bcrypt password; writes `UPDATE_PROFILE` audit log | `src/app/api/admin/profile/route.ts` |
| `/api/admin/history` | `GET` | `verifyAdminAccess` | — | Lists `admin_audit_logs` ordered by `created_at DESC` (limit 100) | `src/app/api/admin/history/route.ts` |

---

## 2. Admin Settings, Analytics & Users APIs

| Endpoint | Method | Guard | Request Input | Response / Behavior | Source File |
|---|---|---|---|---|---|
| `/api/admin/settings` | `GET` | `verifyAdminAccess` | — | Returns `maintenanceMode`, `liveNotification: { enabled, text, link }` | `src/app/api/admin/settings/route.ts` |
| `/api/admin/settings` | `PUT` | `verifyAdminAccess` + `verifyAdmin2FA` | `{ maintenanceMode, liveNotification }`, `x-totp-code` | Upserts keys into `settings`; updates `tep_maintenance` cookie; logs `UPDATE_SETTINGS` | `src/app/api/admin/settings/route.ts` |
| `/api/admin/settings/mcq-toggle` | `GET` | `verifyAdminAccess` | — | Returns `{ enabled: boolean }` from `settings.mcq_enabled` (default `true`) | `src/app/api/admin/settings/mcq-toggle/route.ts` |
| `/api/admin/settings/mcq-toggle` | `PUT` | `verifyAdminAccess` | `{ enabled: boolean }` | Upserts `mcq_enabled` in `settings` and calls `invalidateMcqCache()` | `src/app/api/admin/settings/mcq-toggle/route.ts` |
| `/api/admin/users` | `GET` | `verifyAdminAccess` | `?search=...` | Lists all `users` (`id, name, email, phone, role, created_at`) plus `orders` breakdown (e-commerce orders should be replaced with MCQ/Live Test attempt counts in LMS) | `src/app/api/admin/users/route.ts` |
| `/api/admin/analytics` | `GET` | `verifyAdminAccess` | `?period=...` | Currently computes e-commerce KPIs (`totalRevenue`, `totalOrders`, `lowStockProducts`) plus `totalUsers` and recent orders (replace e-commerce queries with LMS metrics in Flutter) | `src/app/api/admin/analytics/route.ts` |
| `/api/admin/upload` | `POST` | `verifyAdminAccess` | `multipart/form-data` (`file`, `folder`) | Uploads image to Supabase bucket `products` (10MB cap, local fallback in dev) | `src/app/api/admin/upload/route.ts` |

---

## 3. Admin MCQ Management APIs

All MCQ admin routes use `verifyAdminAccess` (`admin-guard.ts`).

| Endpoint | Method | Request Parameters / Body | Behavior | Source File |
|---|---|---|---|---|
| `/api/admin/mcq/topics` | `GET` | — | Returns all `mcq_topics` with recursive/direct `chapter_count` & `question_count` | `src/app/api/admin/mcq/topics/route.ts` |
| `/api/admin/mcq/topics` | `POST` | `{ name, slug?, category?, description?, icon?, display_order?, is_published?, parent_id? }` | Creates topic or nested subtopic (auto-generates unique slug if omitted) | `src/app/api/admin/mcq/topics/route.ts` |
| `/api/admin/mcq/topics` | `PUT` | `{ id, name?, slug?, category?, description?, icon?, display_order?, is_published?, parent_id? }` | Partial update of topic metadata/visibility/order (prevents self-parenting) | `src/app/api/admin/mcq/topics/route.ts` |
| `/api/admin/mcq/topics` | `DELETE` | `?id=<uuid>` | Recursively collects descendant subtopics via CTE/BFS and cascades deletion of chapters, sets, questions, and topic rows | `src/app/api/admin/mcq/topics/route.ts` |
| `/api/admin/mcq/chapters` | `GET` | `?topicId=<uuid>` | Returns `mcq_chapters` for topic (or all) with per-language `question_count` & `published_sets_count` | `src/app/api/admin/mcq/chapters/route.ts` |
| `/api/admin/mcq/chapters` | `POST` | `{ topic_id, title, slug?, description?, display_order?, is_published? }` | Creates chapter syncing both legacy (`name`, `order_index`, `is_active`) and current columns | `src/app/api/admin/mcq/chapters/route.ts` |
| `/api/admin/mcq/chapters` | `PUT` | `{ id, title?, description?, display_order?, is_published? }` | Updates chapter fields | `src/app/api/admin/mcq/chapters/route.ts` |
| `/api/admin/mcq/chapters` | `DELETE` | `?id=<uuid>` | Cascades delete of `mcq_attempt_answers`, `mcq_attempts`, `mcq_questions`, `mcq_question_sets`, `mcq_import_logs`, then chapter | `src/app/api/admin/mcq/chapters/route.ts` |
| `/api/admin/mcq/mediums` | `GET` | — | Lists all `mcq_mediums` ordered by `display_name` | `src/app/api/admin/mcq/mediums/route.ts` |
| `/api/admin/mcq/mediums` | `POST` | `{ code, display_name }` | Lowercases `code`, checks duplicate, inserts active language medium | `src/app/api/admin/mcq/mediums/route.ts` |
| `/api/admin/mcq/mediums` | `PUT` | `{ id, display_name?, is_active? }` | Updates medium display name or `is_active` flag | `src/app/api/admin/mcq/mediums/route.ts` |
| `/api/admin/mcq/mediums` | `DELETE` | `?id=<uuid>` | Deletes medium if unreferenced; soft-deactivates (`is_active=false`) if linked to question sets | `src/app/api/admin/mcq/mediums/route.ts` |
| `/api/admin/mcq/chapter-languages` | `GET` | `?chapterId=<uuid>` | Returns language summary per medium (draft/published set IDs, versions, counts) | `src/app/api/admin/mcq/chapter-languages/route.ts` |
| `/api/admin/mcq/chapter-languages` | `POST` | `{ chapterId, mediumId }` | Creates initial empty `draft` `mcq_question_sets` row (`version = 1`) if absent | `src/app/api/admin/mcq/chapter-languages/route.ts` |
| `/api/admin/mcq/chapter-languages` | `DELETE` | `?chapterId=<uuid>&mediumId=<uuid>` | Deletes all question sets & questions for that `(chapter_id, medium_id)` | `src/app/api/admin/mcq/chapter-languages/route.ts` |
| `/api/admin/mcq/questions` | `GET` | `?questionSetId=<uuid>` or `?chapterId=<uuid>&mediumId=<uuid>` | Lists questions in latest/requested question set ordered by `display_order ASC` | `src/app/api/admin/mcq/questions/route.ts` |
| `/api/admin/mcq/questions` | `PUT` | `{ questionId, question_text?, option_a?, option_b?, option_c?, option_d?, correct_option?, explanation? }` | Updates question fields (1-click correct_option fix or full edit modal) | `src/app/api/admin/mcq/questions/route.ts` |
| `/api/admin/mcq/questions` | `DELETE` | `?questionId=<uuid>` OR `?questionSetId=<uuid>&clearAll=true` | Deletes single question or clears entire set and updates `question_count` | `src/app/api/admin/mcq/questions/route.ts` |
| `/api/admin/mcq/import` | `POST` | `multipart/form-data` or JSON (`mode: 'preview'|'commit'`, `topicId`, `chapterId`, `mediumId`, `file` or `jsonData`, `publishImmediately`, `replaceExisting`) | Validates CSV/JSON/Excel (`src/lib/mcq-importer.ts`); `preview` returns validation errors & sample rows; `commit` inserts into `mcq_question_sets` + `mcq_questions` + `mcq_import_logs` | `src/app/api/admin/mcq/import/route.ts` |
| `/api/admin/mcq/publish` | `POST` | `{ questionSetId?, chapterId?, mediumId?, action: 'publish'|'unpublish' }` | Publishes target draft set (archiving prior published versions for `(chapter_id, medium_id)`) or reverts to `draft` | `src/app/api/admin/mcq/publish/route.ts` |
| `/api/admin/mcq/logs` | `GET` | `?chapterId=...&limit=...` | Fetches `mcq_import_logs` joined with topic/chapter/medium names | `src/app/api/admin/mcq/logs/route.ts` |
| `/api/admin/mcq/templates` | `GET` | `?format=csv|json&type=sample|blank` | Downloads import template file (`Content-Disposition: attachment`) | `src/app/api/admin/mcq/templates/route.ts` |

---

## 4. Admin Live Test APIs

All Live Test admin routes use `verifyAdminAccess`.

| Endpoint | Method | Request Parameters / Body | Behavior | Source File |
|---|---|---|---|---|
| `/api/admin/live-tests` | `GET` | — | Lists all `live_tests` with live `attempts_count` (`COUNT(live_test_submissions.id)`) | `src/app/api/admin/live-tests/route.ts` |
| `/api/admin/live-tests` | `POST` | `{ title, description?, test_date? }` | Creates `live_tests` row in `'draft'` status | `src/app/api/admin/live-tests/route.ts` |
| `/api/admin/live-tests/toggle` | `GET` | — | Returns global `{ enabled: boolean }` from `settings.live_test_enabled` | `src/app/api/admin/live-tests/toggle/route.ts` |
| `/api/admin/live-tests/toggle` | `PUT` | `{ enabled: boolean }` | Updates `settings.live_test_enabled` and calls `invalidateLiveTestCache()` | `src/app/api/admin/live-tests/toggle/route.ts` |
| `/api/admin/live-tests/[testId]` | `GET` | — | Fetches single test metadata + all questions ordered by `display_order` | `src/app/api/admin/live-tests/[testId]/route.ts` |
| `/api/admin/live-tests/[testId]` | `PUT` | `{ title?, description?, test_date?, status? }` | Updates test details/status (`draft` \| `published` \| `closed`) | `src/app/api/admin/live-tests/[testId]/route.ts` |
| `/api/admin/live-tests/[testId]` | `DELETE` | — | Deletes test (`ON DELETE CASCADE` removes questions & submissions) | `src/app/api/admin/live-tests/[testId]/route.ts` |
| `/api/admin/live-tests/[testId]/questions` | `GET` | — | Fetches questions + attempts count for test | `src/app/api/admin/live-tests/[testId]/questions/route.ts` |
| `/api/admin/live-tests/[testId]/questions` | `POST` | `{ question_text, option_a..d, correct_option, explanation?, question_key? }` | Appends single manual MCQ to `live_test_questions` and updates `question_count` | `src/app/api/admin/live-tests/[testId]/questions/route.ts` |
| `/api/admin/live-tests/[testId]/questions` | `PUT` | `{ questionId, question_text?, option_a..d?, correct_option?, explanation? }` | Updates single live test question | `src/app/api/admin/live-tests/[testId]/questions/route.ts` |
| `/api/admin/live-tests/[testId]/questions` | `DELETE` | `?questionId=<uuid>` or `?clearAll=true` | Deletes 1 or all questions and syncs `live_tests.question_count` | `src/app/api/admin/live-tests/[testId]/questions/route.ts` |
| `/api/admin/live-tests/[testId]/import` | `POST` | `multipart/form-data` (`mode: 'preview'|'commit'`, `file` or `pastedText`, `replaceExisting`) | Validates CSV/JSON/Excel via `src/lib/mcq-importer.ts`; `commit` optionally clears & inserts into `live_test_questions` | `src/app/api/admin/live-tests/[testId]/import/route.ts` |
| `/api/admin/live-tests/[testId]/publish` | `POST` | `{ status: 'draft'|'published'|'closed' }` | Requires `>= 1` question before setting `'published'` | `src/app/api/admin/live-tests/[testId]/publish/route.ts` |
| `/api/admin/live-tests/[testId]/release-answers` | `POST` | `{ answers_released: boolean }` | Toggles `live_tests.answers_released` (blocks release if test is not closed unless explicitly toggled) | `src/app/api/admin/live-tests/[testId]/release-answers/route.ts` |
| `/api/admin/live-tests/[testId]/results` | `GET` | — | Returns ranked leaderboard (`marks_obtained DESC, submitted_at ASC`) + summary stats | `src/app/api/admin/live-tests/[testId]/results/route.ts` |
| `/api/admin/live-tests/[testId]/export` | `GET` | `?format=excel|pdf` (defaults to excel) | Streams `.xlsx` (via `xlsx`) or `.pdf` (via `jspdf`) ranked result sheet | `src/app/api/admin/live-tests/[testId]/export/route.ts` |

---

## 5. Admin & Student Notes APIs

| Endpoint | Method | Guard | Request / Behavior | Source File |
|---|---|---|---|---|
| `/api/admin/notes` | `GET` | `verifyAdminAccess` | Lists all `pdf_materials` joined with `note_folders.name` ordered by `created_at DESC` | `src/app/api/admin/notes/route.ts` |
| `/api/admin/notes` | `POST` | `verifyAdminAccess` | Multipart upload (`.pdf`, max 50MB) to Supabase bucket `notes` -> inserts `pdf_materials` with `allow_download` (default `false`) & `is_previewable` (default `true`) | `src/app/api/admin/notes/route.ts` |
| `/api/admin/notes/[id]` | `PUT` | `verifyAdminAccess` | Updates title, description, `folder_id`, `allow_download`, `is_previewable`, and optionally replaces PDF file | `src/app/api/admin/notes/[id]/route.ts` |
| `/api/admin/notes/[id]` | `DELETE` | `verifyAdminAccess` | Deletes `pdf_materials` row and best-effort removes file from Supabase `notes` bucket / local fallback | `src/app/api/admin/notes/[id]/route.ts` |
| `/api/admin/notes/folders` | `GET` | `verifyAdminAccess` | Lists `note_folders` with direct `note_count` and `subfolder_count` | `src/app/api/admin/notes/folders/route.ts` |
| `/api/admin/notes/folders` | `POST` | `verifyAdminAccess` | Creates folder (`{ name, parent_id? }`) | `src/app/api/admin/notes/folders/route.ts` |
| `/api/admin/notes/folders/[id]` | `PUT` | `verifyAdminAccess` | Renames or moves folder (prevents self-parenting / loops) | `src/app/api/admin/notes/folders/[id]/route.ts` |
| `/api/admin/notes/folders/[id]` | `DELETE` | `verifyAdminAccess` | Recursively collects descendant folders, deletes notes + storage files inside them, deletes folders | `src/app/api/admin/notes/folders/[id]/route.ts` |
| `/api/notes` | `GET` | Public | Returns all `pdf_materials` ordered by `created_at DESC` | `src/app/api/notes/route.ts` |
| `/api/notes/folders` | `GET` | Public | Returns all `note_folders` with `note_count` & `subfolder_count` | `src/app/api/notes/folders/route.ts` |
| `/api/notes/[id]/preview` | `GET` | Public | Checks `is_previewable === true` (else `403 PREVIEW_DISABLED`), blocks direct top-level browser tab navigation when `!allow_download` (`sec-fetch-dest === 'document'`), streams inline PDF bytes (`Cache-Control: no-store`) | `src/app/api/notes/[id]/preview/route.ts` |
| `/api/notes/[id]/download` | `GET` | Public | Checks `allow_download === true` (else `403 DOWNLOAD_DISABLED`), increments `download_count`, streams attachment PDF or redirects | `src/app/api/notes/[id]/download/route.ts` |

---

## 6. Student Consumption & Public Settings APIs (For Context)

| Endpoint | Method | Purpose | Source File |
|---|---|---|---|
| `/api/settings/mcq-enabled` | `GET` | Cached (`5s` TTL) global `mcq_enabled` flag | `src/app/api/settings/mcq-enabled/route.ts` |
| `/api/settings/live-test-enabled` | `GET` | Cached (`5s` TTL) global `live_test_enabled` flag | `src/app/api/settings/live-test-enabled/route.ts` |
| `/api/settings/live-notification` | `GET` | Global marquee notification banner `{ enabled, text, link }` | `src/app/api/settings/live-notification/route.ts` |
| `/api/settings/maintenance` | `GET` | Global maintenance status `{ maintenanceMode }` | `src/app/api/settings/maintenance/route.ts` |
| `/api/mcq/topics` | `GET` | Published `mcq_topics` (`parent_id`, chapter & published question counts) | `src/app/api/mcq/topics/route.ts` |
| `/api/mcq/topics/[slug]/chapters` | `GET` | Topic info, child subtopics, and published chapters for `[slug]` | `src/app/api/mcq/topics/[slug]/chapters/route.ts` |
| `/api/mcq/chapters/[chapterId]/mediums` | `GET` | Active mediums having `'published'` `mcq_question_sets` for chapter | `src/app/api/mcq/chapters/[chapterId]/mediums/route.ts` |
| `/api/mcq/test/[setId]` | `GET` | Requires `resolveStudentAuth`; returns published questions (`option_a..d`, `correct_option`, `explanation` for instant practice feedback) | `src/app/api/mcq/test/[setId]/route.ts` |
| `/api/mcq/test/[setId]/submit` | `POST` | Requires `resolveStudentAuth`; grades answers, inserts `mcq_attempts` + `mcq_attempt_answers` | `src/app/api/mcq/test/[setId]/submit/route.ts` |
| `/api/mcq/attempts/[attemptId]` | `GET` | Requires `resolveStudentAuth`; returns graded review scoped to requesting `userId` | `src/app/api/mcq/attempts/[attemptId]/route.ts` |
| `/api/live-tests` | `GET` | Lists `'published'` and `'closed'` tests with participant counts (gated by `live_test_enabled`) | `src/app/api/live-tests/route.ts` |
| `/api/live-tests/[testId]` | `GET` | Fetches `'published'` test metadata + questions **strictly omitting `correct_option` & `explanation`** | `src/app/api/live-tests/[testId]/route.ts` |
| `/api/live-tests/[testId]/check-attempt` | `GET` | Checks submission by phone (currently stubbed `{ hasSubmitted: false }`) | `src/app/api/live-tests/[testId]/check-attempt/route.ts` |
| `/api/live-tests/[testId]/submit` | `POST` | Grades server-side (`live_tests.status === 'published'`), upserts `live_test_submissions` `ON CONFLICT (test_id, phone_number) DO UPDATE` | `src/app/api/admin/live-tests/...` -> `src/app/api/live-tests/[testId]/submit/route.ts` |
| `/api/live-tests/[testId]/answers` | `GET` | Returns questions WITH `correct_option` & `explanation` **only if `answers_released === true`** (else `403 ANSWERS_NOT_RELEASED`) | `src/app/api/live-tests/[testId]/answers/route.ts` |
