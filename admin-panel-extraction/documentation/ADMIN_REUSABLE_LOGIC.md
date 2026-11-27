# Reusable Business Logic & Algorithms (Next.js -> Dart Porting Guide)

> **Source Scope:** Pure domain logic extracted from `src/lib/mcq-importer.ts`, `src/lib/totp.ts`, `src/lib/admin-guard.ts`, `src/app/api/admin/mcq/topics/route.ts`, `src/app/api/admin/notes/folders/[id]/route.ts`, `src/app/api/live-tests/[testId]/submit/route.ts`, `src/app/api/mcq/test/[setId]/submit/route.ts`, and `src/app/admin/notes/page.tsx`.

---

## 1. MCQ CSV / JSON / Excel Parser & Validator (`src/lib/mcq-importer.ts`)

This module is **100% shared** between `/admin/mcq` and `/admin/live-tests`. Port it directly into a pure Dart service (`McqImportParser`):

### 1.1 Quote-Aware CSV Parser Rules (`parseCSV`)
- Handles `\r\n` and `\n`, multiline quoted values, and RFC 4180 escaped double-quotes (`""` -> `"`).
- First non-empty row becomes lowercased, trimmed, BOM-stripped headers (`text.replace(/^\uFEFF/, '')`).
- Blank rows (all empty cells) are skipped cleanly.

### 1.2 Flexible Header Alias Mapping (`validateAndNormalizeQuestions`)
When porting to Dart, check keys case-insensitively after trimming whitespace:
- `question_text` <- `['question_text', 'question', 'q', 'prompt']`
- `option_a` <- `['option_a', 'a', 'option1', 'opt_a']`
- `option_b` <- `['option_b', 'b', 'option2', 'opt_b']`
- `option_c` <- `['option_c', 'c', 'option3', 'opt_c']`
- `option_d` <- `['option_d', 'd', 'option4', 'opt_d']`
- `correct_option` <- `['correct_option', 'correct', 'answer', 'ans', 'right_option']`
- `explanation` <- `['explanation', 'solution', 'hint', 'reason']` *(optional, defaults to `''`)*
- `question_key` <- `['question_key', 'key', 'id', 'qno', 'sr_no']` *(optional, defaults to `'Q${rowNumber}'`)*

### 1.3 Correct Answer Normalization
```text
Input value (trimmed, uppercased) -> Normalized Output
"A" | "1" | "OPTION A"             -> "A"
"B" | "2" | "OPTION B"             -> "B"
"C" | "3" | "OPTION C"             -> "C"
"D" | "4" | "OPTION D"             -> "D"
Anything else                      -> Row Validation Error
```

### 1.4 Duplicate Question Detection
- Maintain `Map<String, int> seenQuestions` keyed by:
  `questionText.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ')`
- If already seen, attach validation error citing the earlier row number.
- Commit proceeds **only if `invalidCount == 0`** and `validCount > 0`.

---

## 2. Server-Side Scoring & Ranking Logic

### 2.1 MCQ Practice Scoring (`src/app/api/mcq/test/[setId]/submit/route.ts`)
- Fetch `id, correct_option` for all questions in `question_set_id`.
- For each question:
  - Lookup submitted option (`A|B|C|D` uppercased).
  - If present: increment `attemptedCount`; if equal to `correct_option`, increment `correctCount`.
- `score = correctCount` (1 mark per correct option; 0 negative marking).
- Persist summary to `mcq_attempts` (`question_set_version`, `total_questions`, `attempted_count`, `correct_count`, `score`) and individual rows to `mcq_attempt_answers`.

### 2.2 Live Test Scoring & Leaderboard Ranking (`src/app/api/live-tests/[testId]/submit/route.ts` & `results/route.ts`)
- Pre-check: `live_tests.status == 'published'` (reject `draft` or `closed`).
- Load all `live_test_questions` for `test_id` server-side (`correct_option` never comes from client).
- Scoring formulas:
  - `totalQuestions = questions.length`
  - `attemptedCount` = count of valid `'A'|'B'|'C'|'D'` student responses
  - `correctCount` = count where student response == `question.correct_option`
  - `wrongCount = attemptedCount - correctCount`
  - `marksObtained = correctCount`
  - `percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toStringAsFixed(2) : 0`
- Deduplication / Upsert key: `UNIQUE(test_id, phone_number)` (`10`-digit normalized phone).
- **Merit Rank Tie-Breaker**:
  1. Primary sort: `marks_obtained DESC`
  2. Tie-breaker: `submitted_at ASC` (earlier submission ranks higher)

---

## 3. Recursive Tree Traversal (`mcq_topics` & `note_folders`)

Used both for breadcrumb building, recursive size/count aggregation, and cascading folder/topic deletion:
- **Client-Side Breadcrumb & Counts (`src/app/admin/notes/page.tsx` & `mcq/page.tsx`)**:
  - Store flat list of nodes in memory keyed by `Map<String, Node>`.
  - Breadcrumb path: walk `node.parent_id` upwards until `null`, guarding against cycles with a `visited` `Set<String>`.
  - Subtree aggregation (recursive memoized/DFS):
    - Total notes in folder = direct notes + sum of child folder notes.
    - Total folder size bytes = sum of `parseSizeToBytes(note.file_size)` across folder + descendants.
- **Cascade Delete Algorithm (`DELETE /api/admin/notes/folders/[id]` & `/api/admin/mcq/topics`)**:
  - Collect `[rootId]` then BFS/DFS or SQL `WITH RECURSIVE` to collect all descendant IDs (`visited` set prevents loops).
  - Delete leaf assets first (Storage PDFs / DB `pdf_materials` / `mcq_attempts` -> `mcq_questions` -> `mcq_question_sets` -> `mcq_chapters`), then delete the folder/topic rows.
- **Move Loop Prevention (`PUT /api/admin/notes/folders/[id]` & `/api/admin/mcq/topics`)**:
  - Reject if `newParentId == targetId` OR if `targetId` is an ancestor of `newParentId`.

---

## 4. RFC 4648 / RFC 4226 TOTP Algorithm (`src/lib/totp.ts`)

If keeping Google Authenticator 2FA inside the Flutter LMS (implemented in Edge Function/backend, never storing the secret in Flutter APK):
- Base32 Alphabet: `'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'`
- Period: `30` seconds (`Math.floor(epochSeconds / 30)` packed into 8-byte big-endian counter)
- HMAC: `HMAC-SHA1(decodedSecret, counterBytes)`
- Dynamic Truncation: 4-byte offset `hmac[19] & 0x0f` -> `(bits & 0x7fffffff) % 1_000_000`, zero-padded to 6 digits.
- Skew Window: `window = 1` checks `[step - 1, step, step + 1]` (`±30s`) using constant-time equality.
- URI format: `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

---

## 5. File Size Parser & Storage Key Sanitizer (`src/app/admin/notes/page.tsx` & `/api/admin/notes`)

- **Size Formatting (Upload)**:
  ```dart
  String formatBytes(int bytes) {
    if (bytes >= 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    return '${(bytes / 1024).round()} KB';
  }
  ```
- **Folder Size Aggregation**: Parses stored strings (`'1.24 MB'`, `'512 KB'`, `'0.5 GB'`) via regex `^([\d.]+)\s*([a-zA-Z]+)?$` to compute folder-level MB totals.
- **Unique Safe Object Key**: `note-${DateTime.now().millisecondsSinceEpoch}-${random}-${safeFilename}`.
