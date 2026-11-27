# MCQ & Content Hierarchy Management Reference

> **Source Scope:** Verified from `src/app/admin/mcq/page.tsx`, `src/app/admin/mcq/import/page.tsx`, `src/lib/mcq-importer.ts`, `src/app/api/admin/mcq/*`, and `src/app/api/mcq/*`.

---

## 1. 4-Level Content Hierarchy

```
mcq_topics (recursive tree via parent_id: Topic -> Subtopic -> ...)
  └── mcq_chapters (topic_id)
        └── mcq_question_sets (chapter_id + medium_id + version + status)
              └── mcq_questions (question_set_id, display_order)
```

### 1.1 Topics & Recursive Subtopics (`/api/admin/mcq/topics`)
- **Fields**: `id`, `name`, `slug` (unique), `category`, `description`, `icon`, `display_order`, `is_published`, `is_active`, `parent_id` (`uuid | null`).
- **Admin UI (`src/app/admin/mcq/page.tsx`)**:
  - Uses URL query parameters (`?topicId=...&chapterId=...&mediumId=...`) so browser back/forward tracks drill-down level.
  - Supports creating root topics (`parent_id = null`) and arbitrary nested subtopics (`parent_id = currentTopic.id`).
  - Toggle switches allow inline activation/publishing (`is_published`) without deleting content.
  - **Cascade Delete**: Deleting a topic uses a recursive `WITH RECURSIVE` CTE (in `DELETE /api/admin/mcq/topics`) to locate all descendant subtopic IDs, deletes linked `mcq_attempt_answers`, `mcq_attempts`, `mcq_questions`, `mcq_question_sets`, `mcq_import_logs`, `mcq_chapters`, and finally all collected `mcq_topics`.

### 1.2 Chapters (`/api/admin/mcq/chapters`)
- **Fields**: `id`, `topic_id`, `title`, `name` (kept synced with `title`), `slug`, `description`, `display_order`, `order_index` (synced), `is_published`, `is_active` (synced).
- **Dynamic vs. Hardcoded**:
  - Dynamic: Topic assignment, title, description, `display_order`, `is_published`.
  - Auto-generated: `slug` derived from `title` if not specified.
- **Cascade Delete**: Deletes `mcq_attempt_answers`, `mcq_attempts`, `mcq_questions`, `mcq_question_sets`, `mcq_import_logs`, then the chapter row.

### 1.3 Languages / Mediums (`/api/admin/mcq/mediums` & `chapter-languages`)
- **Global Languages Table (`mcq_mediums`)**:
  - Stores reusable mediums (`code` like `'en'`, `'te'`, `'hi'`; `display_name` like `'English'`, `'Telugu'`, `'Hindi'`; `is_active`).
  - Admin can add new global languages from the UI (`POST /api/admin/mcq/mediums`), deactivate them (`PUT`), or delete unreferenced ones (`DELETE`).
- **Chapter-to-Language Linking (`mcq_question_sets`)**:
  - Adding a language to a chapter creates an empty `draft` row in `mcq_question_sets` (`version = 1`).
  - Only languages with a `published` `mcq_question_sets` row appear to students via `GET /api/mcq/chapters/[chapterId]/mediums`.

---

## 2. Question Set Versioning & Publishing Workflow

- Each `(chapter_id, medium_id)` pair can have multiple `version` rows in `mcq_question_sets`:
  - `draft`: Being edited or newly imported.
  - `published`: Currently live for students (`published_at` set).
  - `archived`: Superseded previous version preserved so historical `mcq_attempts` rows remain intact (`question_set_version`).
- **Publishing (`POST /api/admin/mcq/publish`)**:
  - Requires either `questionSetId` or `(chapterId, mediumId)`.
  - For `action === 'publish'`: Verifies `question_count > 0` (or at least 1 row in `mcq_questions`), archives existing `'published'` sets for the same `(chapter_id, medium_id)`, and marks the target set `status = 'published'`, `published_at = NOW()`. Also sets `mcq_questions.status = 'published'`.
  - For `action === 'unpublish'`: Reverts set and its questions back to `'draft'`.

---

## 3. Single Question Editing & Preview (`src/app/admin/mcq/page.tsx` & `/api/admin/mcq/questions`)

- **Preview**: Inside the selected language/medium panel, all imported questions render with green-highlighted correct option (`A`/`B`/`C`/`D`) and optional `explanation`.
- **1-Click Correct Option Fix**: Clicking option pill `A`/`B`/`C`/`D` calls `PUT /api/admin/mcq/questions` directly to update `correct_option`.
- **Full Edit Modal**: Allows editing `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, and `explanation`.
- **Delete Controls**:
  - Delete single question (`DELETE ?questionId=...`), recalculating `mcq_question_sets.question_count`.
  - `Clear All MCQs` button (`DELETE ?questionSetId=...&clearAll=true`), wiping all questions in the set.
- **Note on Images**: Neither `mcq_questions` nor `src/lib/mcq-importer.ts` currently stores or imports `question_image_url`. All imported and edited MCQs are strictly text-based.

---

## 4. CSV, JSON & Excel Bulk Import Engine (`src/lib/mcq-importer.ts`)

### 4.1 Supported Formats & Limits
- File extensions / modes supported by `POST /api/admin/mcq/import`:
  - **CSV** (`.csv`, RFC 4180 quote-aware state-machine `parseCSV` handling multi-line fields and escaped `""` quotes)
  - **JSON** (`.json` file upload or pasted JSON payload)
  - **Excel** (`.xlsx`, `.xls` parsed via `xlsx` `XLSX.read` into JSON objects via `XLSX.utils.sheet_to_json`)

### 4.2 Expected Column Names / Keys (Case-Insensitive Aliases)
`validateAndNormalizeQuestions` maps flexible aliases:
- **Question Text (Required)**: `question_text`, `question`, `q`, `prompt`
- **Option A (Required)**: `option_a`, `a`, `option1`, `opt_a`
- **Option B (Required)**: `option_b`, `b`, `option2`, `opt_b`
- **Option C (Required)**: `option_c`, `c`, `option3`, `opt_c`
- **Option D (Required)**: `option_d`, `d`, `option4`, `opt_d`
- **Correct Option (Required)**: `correct_option`, `correct`, `answer`, `ans`, `right_option`
- **Explanation (Optional)**: `explanation`, `solution`, `hint`, `reason`
- **Question Key (Optional)**: `question_key`, `key`, `id`, `qno`, `sr_no` (auto-defaults to `Q1`, `Q2`, ...)

### 4.3 Validation Rules
1. Non-empty dataset check (`> 0` rows).
2. `question_text` non-empty.
3. All four options (`option_a`, `option_b`, `option_c`, `option_d`) must be non-empty strings.
4. **Correct Answer Normalization**:
   - Accepts `A`, `B`, `C`, `D` (case-insensitive) OR numeric strings `1`->`A`, `2`->`B`, `3`->`C`, `4`->`D` OR `OPTION A`..`OPTION D`.
   - Any other value fails row validation with exact error message (`row`, `field`, `message`).
5. **Duplicate Detection**:
   - Normalizes lowercase whitespace-collapsed `question_text` into a `Set` per import batch and flags duplicates within the file (`Duplicate question found (first appeared at row X)`).
6. **Strict All-or-Nothing Gate**:
   - In `mode = 'preview'` or `'commit'`, if **any** row has an error (`invalidCount > 0`), commit is blocked and errors (first 10 displayed in UI; full summary written to `mcq_import_logs` on failed commit) are returned.

### 4.4 Actual Example Templates (From `src/lib/mcq-importer.ts`)

**CSV Format (`SAMPLE_CSV_TEMPLATE`)**:
```csv
question_key,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
Q1,"Which article of the Indian Constitution deals with the Right to Equality?",Article 12,Article 14,Article 19,Article 21,B,"Article 14 guarantees equality before law and equal protection of the laws."
Q2,"What is the maximum weight limit for an Inland Letter Card in India Post?",3 grams,5 grams,10 grams,15 grams,B,"An Inland Letter Card has a maximum permissible weight limit of 5 grams."
```

**JSON Format (`SAMPLE_JSON_TEMPLATE`)**:
```json
[
  {
    "question_key": "Q1",
    "question_text": "Which article of the Indian Constitution deals with the Right to Equality?",
    "option_a": "Article 12",
    "option_b": "Article 14",
    "option_c": "Article 19",
    "option_d": "Article 21",
    "correct_option": "B",
    "explanation": "Article 14 guarantees equality before law and equal protection of the laws."
  }
]
```
*(Downloadable live via `GET /api/admin/mcq/templates?format=csv|json&type=sample|blank`.)*

### 4.5 End-to-End Import Flow (Upload -> Preview -> Commit -> Publish)
1. Admin selects Topic -> Chapter -> Language in `/admin/mcq`.
2. Selects `.csv`/`.json`/`.xlsx` file or switches to JSON paste tab and clicks **Validate & Preview**.
3. UI posts `mode='preview'` to `/api/admin/mcq/import`. Server parses + validates and returns `{ valid, totalRows, validCount, invalidCount, errors, sampleQuestions }`.
4. Admin reviews sample table, toggles `Publish immediately` (`publishImmediately`) and/or `Replace existing questions in this language` (`replaceExisting`), and clicks **Confirm & Import**.
5. UI posts `mode='commit'` to `/api/admin/mcq/import`:
   - Re-validates payload server-side.
   - If `replaceExisting`: determines `nextVersion = MAX(version) + 1`, inserts new `mcq_question_sets` row; if `publishImmediately`, marks prior published sets `'archived'`.
   - If `!replaceExisting`: appends into existing editable draft/current set (or creates version 1) and increments `question_count`.
   - Bulk inserts `mcq_questions` (`display_order` sequential) and records an entry in `mcq_import_logs`.
   - Refreshes question list immediately.
