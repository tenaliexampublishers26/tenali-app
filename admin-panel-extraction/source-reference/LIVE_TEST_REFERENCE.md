# Live Test Administration & Student Flow Reference

> **Source Scope:** Verified from `src/app/admin/live-tests/page.tsx`, `src/app/api/admin/live-tests/**`, `src/app/api/live-tests/**`, `src/lib/mcq-importer.ts`, `src/lib/live-test-cache.ts`, and `src/contexts/LiveTestEnabledContext.tsx`.

---

## 1. Global Feature Flag & Timing Behaviour

- **Global Feature Switch (`settings.live_test_enabled`)**:
  - Admin toggles via `PUT /api/admin/live-tests/toggle` (`{ enabled: boolean }`).
  - Cached server-side for `5,000 ms` in `src/lib/live-test-cache.ts` (`invalidateLiveTestCache()` called on write).
  - Public endpoint `GET /api/settings/live-test-enabled` feeds `LiveTestEnabledContext` to show/hide Live Test navigation links.
  - When disabled, `GET /api/live-tests` returns `{ enabled: false, tests: [] }`.
- **No Countdown Timer (Actual Behaviour)**:
  - `live_tests` has **no** `duration_minutes`, `start_time`, or `end_time` columns.
  - Tests remain **untimed** from the moment `status = 'published'` until the admin manually clicks **Close Test** (`status = 'closed'`).

---

## 2. Live Test Lifecycle State Machine

```
[draft] ──(Make Live: >= 1 question required)──> [published]
   ^                                                 │
   │                                           (Close Test)
   │                                                 v
   └──────────────(To Draft)───────────────────── [closed]
                                                     │
                                        (Release Answers toggle)
                                                     v
                                        [closed + answers_released = true]
```

### Valid Statuses (`live_tests.status`)
1. **`draft`**: Created via `POST /api/admin/live-tests` (`title`, `description`, `test_date`). Invisible to students (`Allow public read active live tests` RLS & public API filter `'published'`/`'closed'`). Questions can be added/edited/imported freely.
2. **`published`**: Requires `question_count >= 1` (`POST /api/admin/live-tests/[testId]/publish`). Visible in student live test list and open for attempts/submissions.
3. **`closed`**: Blocks new submissions (`POST /api/live-tests/[testId]/submit` checks `test.status === 'published'`, returning `403` otherwise). Unlocks the **Release Answers** button in Admin UI (`src/app/admin/live-tests/page.tsx`). Can also be reverted to `'draft'`.
4. **`answers_released` (`boolean`)**: Independent toggle controlled by `POST /api/admin/live-tests/[testId]/release-answers` (`{ answers_released: boolean }`). Defaults to `false`.

---

## 3. Admin Capabilities (`src/app/admin/live-tests/page.tsx`)

1. **Test CRUD**:
   - Create test (`POST /api/admin/live-tests`), Edit title/description/date (`PUT /api/admin/live-tests/[testId]`), Delete test (`DELETE /api/admin/live-tests/[testId]` — cascades to `live_test_questions` and `live_test_submissions`).
2. **Manual Question CRUD (`/api/admin/live-tests/[testId]/questions`)**:
   - View all questions in Manage Questions modal.
   - Add single question (`POST`), edit full question + options + explanation (`PUT`), 1-click quick-switch `correct_option` (`PUT`), delete 1 question or `Clear All` (`DELETE`).
   - Every mutation updates `live_tests.question_count`.
3. **Bulk Question Import (`/api/admin/live-tests/[testId]/import`)**:
   - Reuses `parseAndValidateCSV`, `parseAndValidateJSON`, `parseAndValidateExcel` from `src/lib/mcq-importer.ts`.
   - Supports **File Upload** (`.csv`, `.json`, `.xlsx`, `.xls`) OR **Paste JSON/Text** tabs.
   - 2-step `mode: 'preview'` -> `mode: 'commit'` with optional `replaceExisting` flag (deletes existing questions in `live_test_questions` before inserting new batch).
4. **Live Participation Metrics & Results**:
   - Dashboard shows `attempts_count` (`COUNT(live_test_submissions.id)`).
   - Results endpoint `GET /api/admin/live-tests/[testId]/results` ranks submissions strictly by:
     ```sql
     ORDER BY marks_obtained DESC, submitted_at ASC
     ```
5. **Official Excel & PDF Export (`/api/admin/live-tests/[testId]/export`)**:
   - `?format=excel`: Uses `xlsx` (`XLSX.utils.json_to_sheet`) to generate `<test>_Results.xlsx` containing Rank, Student Name, Phone, Email, Location, Correct, Wrong, Attempted, Total Questions, Marks Obtained, Percentage, Submitted At.
   - `?format=pdf`: Uses `jspdf` to render an A4/landscape formatted result report with header summary and ranked student rows.

---

## 4. Student Live Test Flow & Anti-Cheat Protection

### Step-by-Step Student Flow
1. **List Active Tests (`GET /api/live-tests`)**:
   - Returns `'published'` and `'closed'` tests with `question_count`, `attempts_count`, and `answers_released`.
2. **Check Prior Attempt (`GET /api/live-tests/[testId]/check-attempt`)**:
   - *Current Code Reality Note:* Although this route accepts a phone query param and queries `live_test_submissions`, line 42 currently returns `{ hasSubmitted: false }` so students are not blocked upfront; duplicate submissions are instead handled atomically during `POST /submit`.
3. **Fetch Exam Questions (`GET /api/live-tests/[testId]`)**:
   - Only allows tests where `status === 'published'`.
   - **Security Guard**: SQL query explicitly selects ONLY:
     `id, question_key, question_text, option_a, option_b, option_c, option_d, display_order`.
   - **`correct_option` and `explanation` are NEVER returned** while taking the test.
4. **Submit Attempt (`POST /api/live-tests/[testId]/submit`)**:
   - Requires `studentName`, `phoneNumber` (normalized 10-digit), `location`, `email`, and `answers` map (`{ [questionId]: 'A' | 'B' | 'C' | 'D' }`).
   - Re-verifies `live_tests.status === 'published'`.
   - Loads `live_test_questions` (`id, correct_option`) **server-side** from PostgreSQL.
   - Computes:
     - `total_questions = questions.length`
     - `attempted_count` = count of answered questions in `A|B|C|D`
     - `correct_count` = answers matching `q.correct_option`
     - `wrong_count = attempted_count - correct_count`
     - `marks_obtained = correct_count` (1 mark per correct answer; `0` negative marking)
     - `percentage = Math.round((correct_count / total_questions) * 10000) / 100`
   - Inserts or updates `live_test_submissions` via:
     `ON CONFLICT (test_id, phone_number) DO UPDATE SET ...` (preventing duplicate phone rows while persisting `user_id` if logged in).
5. **View Official Answer Key (`GET /api/live-tests/[testId]/answers`)**:
   - **Strict Server Gate**: Checks `if (!test.answers_released)` -> returns HTTP `403` `{ error: 'Answer key has not been released yet.', code: 'ANSWERS_NOT_RELEASED' }`.
   - Only when `answers_released === true` does it return `correct_option` and `explanation` alongside each question (plus the student's submitted answers if requested with phone/user match).
