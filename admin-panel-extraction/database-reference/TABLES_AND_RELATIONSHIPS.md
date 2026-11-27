# Database Tables & Relationships Reference

> **Source Scope:** Audited directly from the live PostgreSQL catalog (`information_schema.columns`, `information_schema.table_constraints`, `pg_indexes`, `information_schema.routines`) and repository migrations (`Supbase/schema.sql`, `Supbase/migrate_live_tests.sql`, `Supbase/migrate_notes_download_permissions.sql`, `scripts/mcq-schema-migration.mjs`, `scripts/add-mcq-nested-folders.mjs`, `scripts/add-answers-released.mjs`).
> **Runtime Note:** The Next.js backend connects via `src/lib/db.ts` (`postgres` library against `DATABASE_URL` transaction pooler), which connects as the database owner role and bypasses Row-Level Security (RLS). A native Flutter LMS using the Supabase SDK (`anon` / `authenticated` JWT) is subject to RLS and grants documented in [RLS_POLICIES.md](./RLS_POLICIES.md).

---

## 1. Table Classification (LMS Migration Scope)

The live `public` schema contains **31 tables**:

### A. Core & Admin Infrastructure (Include in LMS)
| Table | Purpose | Primary Key |
|---|---|---|
| `users` | User accounts (students and admins via `role`) | `id` (`uuid`) |
| `admin_2fa_secrets` | Master TOTP secret for admin 2FA verification | `user_id` (`varchar`) |
| `admin_audit_logs` | Immutable audit trail for 2FA-gated admin actions | `id` (`uuid`) |
| `settings` | Key-value global config (`maintenance_mode`, `mcq_enabled`, `live_test_enabled`, `live_notification_*`) | `key` (`varchar`) |

### B. MCQ Hierarchy, Questions & Practice (Include in LMS)
| Table | Purpose | Primary Key |
|---|---|---|
| `mcq_topics` | Self-referential recursive folder tree (`parent_id` -> `mcq_topics.id`) | `id` (`uuid`) |
| `mcq_chapters` | Chapters grouped under a topic (`topic_id` -> `mcq_topics.id`) | `id` (`uuid`) |
| `mcq_mediums` | Question mediums/languages (`en`, `te`, `hi`, etc.) | `id` (`uuid`) |
| `mcq_question_sets` | Versioned question sets per `(chapter_id, medium_id, version)` with `draft`/`published`/`archived` status | `id` (`uuid`) |
| `mcq_questions` | Individual MCQ items linked to `question_set_id` (and legacy `chapter_id`/`category_id`) | `id` (`uuid`) |
| `mcq_import_logs` | Import audit log per CSV/JSON/Excel upload | `id` (`uuid`) |
| `mcq_attempts` | Student practice attempt headers (score, counts, version) | `id` (`uuid`) |
| `mcq_attempt_answers` | Per-question student answers inside an `mcq_attempts` record | `id` (`uuid`) |
| `mcq_bookmarks` | Student bookmarked questions (`UNIQUE(user_id, question_id)`) | `id` (`uuid`) |

### C. Live Tests & Rankings (Include in LMS)
| Table | Purpose | Primary Key |
|---|---|---|
| `live_tests` | Live exam headers (`draft`, `published`, `closed`, `answers_released`) | `id` (`uuid`) |
| `live_test_questions` | Questions belonging to a `live_tests` record | `id` (`uuid`) |
| `live_test_submissions` | Student submissions (`UNIQUE(test_id, phone_number)`), score, answers JSONB | `id` (`uuid`) |

### D. Study Notes & Folder Tree (Include in LMS)
| Table | Purpose | Primary Key |
|---|---|---|
| `note_folders` | Self-referential recursive folder tree for PDFs (`parent_id` -> `note_folders.id`) | `id` (`uuid`) |
| `pdf_materials` | Uploaded study PDFs with `allow_download`, `is_previewable`, `folder_id`, `download_count` | `id` (`uuid`) |

### E. Legacy / Unused Educational Tables (Present in DB, Superseded)
| Table | Status in Live Codebase |
|---|---|
| `mcq_categories` | Legacy flat category table (`Supbase/schema.sql`); superseded by `mcq_topics` tree, though `mcq_questions.category_id` FK still exists (nullable). |
| `mcq_options` | Legacy normalized option table; current importer & UI store `option_a..d` and `correct_option` directly on `mcq_questions`. `mcq_attempts.selected_option_id` still references it (nullable). |
| `pdf_uploads` | Unused PDF-extraction job table (`chapter_id`, `uploaded_by`). Current MCQ bulk import uses CSV/JSON/Excel (`mcq_import_logs`). |
| `user_quiz_attempts` | Legacy flat quiz summary table keyed by `category_code`; superseded by `mcq_attempts` + `mcq_attempt_answers`. |
| `subscription_plans` | Planned monetization table; currently unused by admin or student LMS flows. |
| `user_subscriptions` | Planned monetization table; currently unused. |

### F. E-Commerce Tables (STRICTLY EXCLUDED from Flutter LMS)
`products`, `orders`, `order_items`, `payment_sessions`, `addresses`, `user_addresses`, `wishlist_items`.

---

## 2. Entity-Relationship Diagram (LMS Domain)

```
users (id, role)
 ├──< mcq_attempts (user_id) ──< mcq_attempt_answers (attempt_id) >── mcq_questions
 ├──< mcq_bookmarks (user_id, question_id)
 └──< live_test_submissions (user_id, test_id)

mcq_topics (id, parent_id -> mcq_topics.id)
 ├──< mcq_chapters (topic_id)
 │     └──< mcq_question_sets (chapter_id, medium_id, version, status)
 │           ├──< mcq_questions (question_set_id, correct_option)
 │           └──< mcq_attempts (question_set_id)
 └──< mcq_import_logs (topic_id, chapter_id, medium_id)

mcq_mediums (id, code, display_name)
 ├──< mcq_question_sets (medium_id)
 └──< mcq_import_logs (medium_id)

live_tests (id, status, answers_released)
 ├──< live_test_questions (test_id, display_order)
 └──< live_test_submissions (test_id, phone_number UNIQUE)

note_folders (id, parent_id -> note_folders.id)
 └──< pdf_materials (folder_id, allow_download, is_previewable)
```

---

## 3. Exact Column Specifications (Verified from Live DB)

### 3.1 `users`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `name` | `character varying` | NO | — | Display name |
| `email` | `character varying` | YES | — | **UNIQUE** (`users_email_key`) |
| `phone` | `character varying` | YES | — | Mobile number |
| `role` | `character varying` | YES | `'customer'::character varying` | `'admin'` or `'customer'` |
| `image` | `text` | YES | — | Avatar URL |
| `password_hash` | `character varying` | YES | — | bcrypt hash (NULL for OAuth-only users) |
| `created_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `updated_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |

### 3.2 `admin_2fa_secrets`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `user_id` | `character varying` | NO | — | **PK** (API always uses key `'master_admin_2fa'`) |
| `secret` | `character varying` | NO | — | RFC 4648 Base32 TOTP secret |
| `enabled` | `boolean` | YES | `true` | Active flag |
| `updated_at` | `timestamp with time zone` | YES | `now()` | |

### 3.3 `admin_audit_logs`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `admin_id` | `character varying` | YES | — | Acting admin ID |
| `admin_name` | `character varying` | YES | — | Acting admin name |
| `admin_email` | `character varying` | YES | — | Acting admin email |
| `action_type` | `character varying` | NO | — | e.g., `'UPDATE_SETTINGS'`, `'UPDATE_PROFILE'` |
| `target_type` | `character varying` | YES | — | e.g., `'settings'`, `'profile'` |
| `target_name` | `character varying` | YES | — | Human-readable target label |
| `previous_value` | `jsonb` | YES | — | Snapshot before mutation |
| `new_value` | `jsonb` | YES | — | Snapshot after mutation |
| `totp_verified` | `boolean` | YES | `true` | Whether 2FA verified |
| `ip_address` | `character varying` | YES | — | Client IP header |
| `created_at` | `timestamp with time zone` | YES | `now()` | |
| `location_name` | `character varying` | YES | `'Tenali, Andhra Pradesh, India'` | |

### 3.4 `settings`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `key` | `character varying` | NO | — | **PK** |
| `value` | `character varying` | NO | — | Stringified config (`'true'`/`'false'` or text) |
| `updated_at` | `timestamp without time zone` | YES | `CURRENT_TIMESTAMP` | |

Observed runtime keys in `settings`:
- `maintenance_mode` (`'true'` | `'false'`)
- `mcq_enabled` (`'true'` | `'false'`)
- `live_test_enabled` (`'true'` | `'false'`)
- `live_notification_enabled` (`'true'` | `'false'`)
- `live_notification_text` (string)
- `live_notification_link` (string)

### 3.5 `mcq_topics`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `slug` | `character varying` | NO | — | **UNIQUE** (`mcq_topics_slug_key`) |
| `name` | `character varying` | NO | — | Topic / folder display name |
| `category` | `character varying` | NO | — | Grouping label (defaults to `'General'` in API) |
| `description` | `text` | YES | — | Optional description |
| `icon` | `character varying` | YES | `'book-open'` | Icon identifier |
| `order_index` | `integer` | YES | `0` | Legacy sort field |
| `is_active` | `boolean` | YES | `true` | Active toggle |
| `created_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `updated_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `display_order` | `integer` | YES | `1` | Primary sort field used in current queries |
| `is_published` | `boolean` | YES | `true` | Student visibility flag |
| `parent_id` | `uuid` | YES | — | **FK** -> `mcq_topics(id)` (recursive nesting) |

Index: `idx_mcq_topics_parent_id` ON `(parent_id)`.

### 3.6 `mcq_chapters`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `topic_id` | `uuid` | YES | — | **FK** -> `mcq_topics(id)` |
| `name` | `character varying` | NO | — | Legacy/sync chapter title |
| `description` | `text` | YES | — | |
| `order_index` | `integer` | YES | `0` | Legacy sort field |
| `is_active` | `boolean` | YES | `true` | |
| `created_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `updated_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `title` | `character varying` | YES | — | Current UI/API chapter title (`COALESCE(title, name)`) |
| `slug` | `character varying` | YES | — | Chapter slug |
| `display_order` | `integer` | YES | `1` | Current UI sort order |
| `is_published` | `boolean` | YES | `true` | Student visibility flag |

Indexes: `idx_mcq_chapters_topic` and `idx_mcq_chapters_topic_id` ON `(topic_id)`.

### 3.7 `mcq_mediums`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `code` | `character varying` | NO | — | **UNIQUE** (`mcq_mediums_code_key`, e.g., `'en'`, `'te'`, `'hi'`) |
| `display_name` | `character varying` | NO | — | e.g., `'English'`, `'Telugu'`, `'Hindi'` |
| `is_active` | `boolean` | YES | `true` | Soft enable/disable |
| `created_at` | `timestamp with time zone` | YES | `now()` | |

### 3.8 `mcq_question_sets`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `chapter_id` | `uuid` | NO | — | **FK** -> `mcq_chapters(id)` |
| `medium_id` | `uuid` | NO | — | **FK** -> `mcq_mediums(id)` |
| `version` | `integer` | NO | `1` | Incremented on replace-import |
| `status` | `character varying` | NO | `'draft'` | `'draft'`, `'published'`, `'archived'` |
| `question_count` | `integer` | NO | `0` | Denormalized count |
| `created_by` | `character varying` | YES | — | Admin user ID |
| `created_at` | `timestamp with time zone` | YES | `now()` | |
| `published_at` | `timestamp with time zone` | YES | — | Timestamp when published |

Constraints & Indexes:
- **UNIQUE** `mcq_question_sets_chapter_id_medium_id_version_key` ON `(chapter_id, medium_id, version)`
- Index `idx_mcq_qsets_chapter_status` ON `(chapter_id, status)`

### 3.9 `mcq_questions`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `category_id` | `uuid` | YES | — | Legacy **FK** -> `mcq_categories(id)` |
| `category_code` | `character varying` | YES | — | Legacy category code |
| `question_text` | `text` | NO | — | Question body |
| `option_a` | `text` | YES | — | Option A text |
| `option_b` | `text` | YES | — | Option B text |
| `option_c` | `text` | YES | — | Option C text |
| `option_d` | `text` | YES | — | Option D text |
| `correct_option` | `character varying` | YES | — | CHECK constraint `mcq_questions_correct_option_check` (`'A'|'B'|'C'|'D'`) |
| `explanation` | `text` | YES | — | Solution explanation |
| `language` | `character varying` | YES | `'en'` | Medium code |
| `subject` | `character varying` | YES | `'General'` | Legacy metadata |
| `difficulty` | `character varying` | YES | `'medium'` | `'easy'`/`'medium'`/`'hard'` |
| `marks` | `integer` | YES | `1` | |
| `is_active` | `boolean` | YES | `true` | |
| `created_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `updated_at` | `timestamp with time zone` | YES | `CURRENT_TIMESTAMP` | |
| `chapter_id` | `uuid` | YES | — | **FK** -> `mcq_chapters(id)` |
| `status` | `character varying` | YES | `'draft'` | Question status |
| `order_index` | `integer` | YES | `0` | Legacy order |
| `question_set_id` | `uuid` | YES | — | **FK** -> `mcq_question_sets(id)` |
| `question_key` | `character varying` | YES | — | External key (e.g. `Q1`) |
| `display_order` | `integer` | YES | `1` | Sequence inside set |

Indexes: `idx_mcq_questions_category`, `idx_mcq_questions_chapter`, `idx_mcq_questions_lang`, `idx_mcq_questions_set`.

### 3.10 `mcq_import_logs`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | **PK** |
| `topic_id` | `uuid` | YES | — | **FK** -> `mcq_topics(id)` |
| `chapter_id` | `uuid` | YES | — | **FK** -> `mcq_chapters(id)` |
| `medium_id` | `uuid` | YES | — | **FK** -> `mcq_mediums(id)` |
| `file_name` | `character varying` | NO | — | Uploaded filename |
| `file_type` | `character varying` | NO | — | `'csv'`, `'json'`, `'xlsx'` |
| `status` | `character varying` | NO | — | `'success'` / `'failed'` |
| `total_rows` | `integer` | YES | `0` | |
| `valid_rows` | `integer` | YES | `0` | |
| `invalid_rows` | `integer` | YES | `0` | |
| `error_summary` | `text` | YES | — | Validation error summary |
| `created_by` | `character varying` | YES | — | Admin user ID |
| `created_at` | `timestamp with time zone` | YES | `now()` | |

### 3.11 `mcq_attempts` & `mcq_attempt_answers` & `mcq_bookmarks`
**`mcq_attempts`**:
- `id` (`uuid` PK), `user_id` (`uuid` FK -> `users.id`), `question_id` (`uuid` FK -> `mcq_questions.id`, legacy nullable), `selected_option_id` (`uuid` FK -> `mcq_options.id`, legacy nullable), `is_correct` (`boolean` NOT NULL — legacy column, set `true`/`false` or derived on submission), `time_taken_seconds` (`integer` default 0), `attempted_at` (`timestamptz`), `question_set_id` (`uuid` FK -> `mcq_question_sets.id`), `question_set_version` (`integer` default 1), `status` (`varchar` default `'completed'`), `total_questions` (`integer` default 0), `attempted_count` (`integer` default 0), `correct_count` (`integer` default 0), `score` (`numeric` default 0), `started_at` (`timestamptz`), `submitted_at` (`timestamptz`).
- Index: `idx_mcq_attempts_user` ON `(user_id)`.

**`mcq_attempt_answers`**:
- `id` (`uuid` PK), `attempt_id` (`uuid` NOT NULL FK -> `mcq_attempts.id`), `question_id` (`uuid` NOT NULL FK -> `mcq_questions.id`), `selected_option` (`varchar` NULL), `is_correct` (`boolean` default false), `answered_at` (`timestamptz` default `now()`).
- Unique constraint: `mcq_attempt_answers_attempt_id_question_id_key` ON `(attempt_id, question_id)`.

**`mcq_bookmarks`**:
- `id` (`uuid` PK), `user_id` (`uuid` FK -> `users.id`), `question_id` (`uuid` FK -> `mcq_questions.id`), `created_at` (`timestamptz`).
- Unique constraint: `(user_id, question_id)`.

### 3.12 `live_tests`, `live_test_questions`, `live_test_submissions`
**`live_tests`**:
- `id` (`uuid` PK), `title` (`varchar` NOT NULL), `description` (`text` NULL), `test_date` (`date` NOT NULL default `CURRENT_DATE`), `status` (`varchar` NOT NULL default `'draft'` — `'draft' | 'published' | 'closed'`), `question_count` (`integer` NOT NULL default 0), `created_by` (`varchar` NULL), `created_at`, `updated_at`, `answers_released` (`boolean` NOT NULL default `false`).
- Index: `idx_live_tests_status` ON `(status, test_date DESC)`.

**`live_test_questions`**:
- `id` (`uuid` PK), `test_id` (`uuid` NOT NULL FK -> `live_tests.id`), `question_key` (`varchar` NULL), `question_text` (`text` NOT NULL), `option_a`..`option_d` (`text` NOT NULL), `correct_option` (`varchar` NOT NULL), `explanation` (`text` NULL), `display_order` (`integer` NOT NULL default 1), `created_at`.
- Index: `idx_live_test_questions_test_order` ON `(test_id, display_order)`.

**`live_test_submissions`**:
- `id` (`uuid` PK), `test_id` (`uuid` NOT NULL FK -> `live_tests.id`), `user_id` (`uuid` NULL FK -> `users.id`), `student_name` (`varchar` NOT NULL), `phone_number` (`varchar` NOT NULL), `location` (`varchar` NOT NULL), `email` (`varchar` NOT NULL), `total_questions` (`integer` default 0), `attempted_count` (`integer` default 0), `correct_count` (`integer` default 0), `wrong_count` (`integer` default 0), `marks_obtained` (`numeric` default 0), `percentage` (`numeric` default 0), `answers` (`jsonb` NOT NULL default `'{}'`), `submitted_at` (`timestamptz` NOT NULL default `now()`), `created_at`.
- Unique constraint & index: `uq_live_test_phone_per_test` ON `(test_id, phone_number)`.
- Ranking index: `idx_live_test_submissions_rank` ON `(test_id, marks_obtained DESC, submitted_at)`.

### 3.13 `note_folders` & `pdf_materials`
**`note_folders`**:
- `id` (`uuid` PK), `name` (`varchar` NOT NULL), `parent_id` (`uuid` NULL FK -> `note_folders.id`), `created_at`, `updated_at`.
- Index: `idx_note_folders_parent_id` ON `(parent_id)`.

**`pdf_materials`**:
- `id` (`uuid` PK), `title` (`varchar` NOT NULL), `description` (`text` NULL), `category_code` (`varchar` NOT NULL — legacy default `'NOTES'` or derived from folder), `pdf_url` (`text` NOT NULL), `file_size` (`varchar` NULL), `pages_count` (`integer` default 1), `is_free` (`boolean` default `true`), `download_count` (`integer` default 0), `created_at`, `updated_at`, `allow_download` (`boolean` NOT NULL default `false`), `is_previewable` (`boolean` NOT NULL default `true`), `folder_id` (`uuid` NULL FK -> `note_folders.id`).
- Indexes: `idx_pdf_materials_cat`, `idx_pdf_materials_folder_id`.

---

## 4. Database Routines & Event Triggers

- `public.auto_enable_rls_for_new_tables()` (`event_trigger`): Automatically enables Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) whenever a new table is created in `public`.

---

## 5. Dynamic vs. Hardcoded Fields Summary

| Domain | Dynamic (DB-Driven) | Hardcoded / Fixed in App |
|---|---|---|
| MCQ Hierarchy | Topics, nested subtopics, chapters, display orders, publish flags, language mediums (`mcq_mediums`), question sets, versions | Question options schema fixed to 4 options (`A`, `B`, `C`, `D`) and `correct_option` in `{'A','B','C','D'}` |
| Practice Scoring | Question sets & answers | Default `+1` mark per correct answer, `0` negative marks (`marks` column exists on `mcq_questions` but submit route counts correct answers) |
| Live Tests | Title, description, date, status, questions, `answers_released` | No timer columns (`live_tests` are untimed until admin closes the test); scoring fixed at `1` mark per correct option; tie-breaker fixed at `marks_obtained DESC, submitted_at ASC` |
| Notes | Folder names, nested `parent_id`, PDF title, description, `allow_download`, `is_previewable` | Default `category_code = 'NOTES'`, `is_free = true`, `pages_count = 1`; upload size cap `50MB` in Next.js API |
| Settings | `maintenance_mode`, `mcq_enabled`, `live_test_enabled`, `live_notification_*` | 2FA key literal `'master_admin_2fa'`; default audit location `'Tenali, Andhra Pradesh, India'` |
