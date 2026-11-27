# Complete Admin Panel Architecture & Functional Documentation

> **Extraction Audit Package:** Existing Next.js E-Commerce + Educational Admin Website -> Target Native Android LMS (Flutter / Dart + Supabase).
> **Strict Audit Rule:** Every capability, route, column, and security property documented here reflects verified source files and live PostgreSQL inspection. Where the source codebase has gaps or relies on server-only database access, those gaps are documented explicitly.

---

## 1. Executive Architecture Overview

The existing platform is a **Next.js 16 (App Router) + TypeScript + Supabase** web application serving two distinct domains:
1. **Educational LMS Domain (Target for Flutter Migration):**
   - Hierarchical MCQ Practice Bank (`Topics -> Recursive Subtopics -> Chapters -> Language Mediums -> Versioned Question Sets -> MCQs`)
   - Bulk CSV / JSON / Excel Question Importer with preview/validation/versioning & import logs
   - Untimed Live Tests with server-side grading, ranking leaderboard, Excel/PDF exports, and gated answer-key release
   - Hierarchical Study Notes (`note_folders` tree + `pdf_materials` with 4-state Preview/Download permissions)
   - Global Feature Flags (`mcq_enabled`, `live_test_enabled`, `maintenance_mode`, Live Notification Marquee)
   - Role-Based Admin Access (`users.role = 'admin'`), TOTP 2FA, and `admin_audit_logs`
2. **E-Commerce Domain (STRICTLY EXCLUDED from Flutter LMS):**
   - Books catalog (`/admin/products`), Book Orders & India Post Dispatch Slips (`/admin/orders`), Razorpay checkout/refunds, Invoices, Cart/Wishlist, Addresses, and Revenue Analytics.

---

## 2. How Admin & Student Roles Work

1. **Identity Storage (`public.users`)**:
   - Every user (student or admin) has a row in `public.users` with `role` defaulting to `'customer'`.
   - Admins are identified exclusively by **`users.role = 'admin'`**.
2. **Authentication Flows**:
   - Email/Phone + bcrypt password login (`POST /api/auth/login`) -> sets HTTP-only HMAC-SHA256 signed `tep_session` cookie (30-day TTL) + `tep_user_role` cookie.
   - Google OAuth (`POST /api/auth/sync` + `src/contexts/AuthContext.tsx`) -> verifies Supabase Auth user, upserts `public.users` (`role = 'customer'` by default), and mints `tep_session` only if the existing PostgreSQL row already has `role = 'admin'`.
3. **Request Protection Stack**:
   - **Layer 1 (`src/proxy.ts`)**: Rate limits auth/admin endpoints, enforces `tep_maintenance` screen, guards `/admin/*` & `/api/admin/*`, locks `/mcq/*` to signed-in users, and sets security headers.
   - **Layer 2 (`src/app/admin/layout.tsx`)**: Client guard waiting for `AuthContext`, redirecting non-admins to `/login?redirect=/admin`.
   - **Layer 3 (`src/lib/admin-guard.ts` `verifyAdminAccess`)**: Verifies `tep_session` HMAC signature or Supabase Auth session + PostgreSQL `users.role = 'admin'` (cached for 60s in memory).
   - **Layer 4 (`verifyAdmin2FA` + `src/lib/totp.ts`)**: Enforces 6-digit RFC 4648/4226 TOTP (`admin_2fa_secrets`) + writes `admin_audit_logs` on Settings, Profile, and E-commerce Product/Order mutations. *(Audit note: MCQ, Live Test, and Notes admin APIs currently require `verifyAdminAccess` only, without 2FA or audit log entries.)*

---

## 3. Admin Modules Breakdown (LMS Scope)

### Module 1: Dashboard & Global Feature Controls (`/admin`)
- **Included LMS Features**:
  - `McqToggleCard`: Live ON/OFF switch for `settings.mcq_enabled` (shows "Coming Soon" screen to students when OFF).
  - Total registered users KPI (`users` count).
  - Real-time clock & dark mode toggle.
- **Excluded E-Commerce Features**: Revenue KPI, Orders KPI, Products Sold KPI, 7-day Sales Bar Chart, Supabase realtime `orders` listener, Recent Orders table.
- **Recommended LMS Dashboard Replacement**: Live MCQ Topics/Questions count, Active Live Tests & Submissions count, Uploaded PDFs count, Global `mcq_enabled` + `live_test_enabled` + `maintenance_mode` quick switches.

### Module 2: MCQ & Content Hierarchy Management (`/admin/mcq`)
- **4-Level Drill-Down Navigation** (state synced with `?topicId=...&chapterId=...&mediumId=...`):
  1. **Topics & Nested Subtopics** (`mcq_topics` with recursive `parent_id`): Create, rename, reorder (`display_order`), publish/hide (`is_published`), cascade-delete entire subtrees.
  2. **Chapters** (`mcq_chapters`): Create, edit, reorder, publish/hide, cascade-delete within a topic.
  3. **Languages / Mediums** (`mcq_mediums` + `mcq_question_sets`): Manage global mediums (`en`, `te`, `hi`, custom), attach a medium to a chapter as a draft question set, publish/unpublish versioned sets (`draft` / `published` / `archived`).
  4. **Questions & Bulk Importer** (`mcq_questions` + `src/lib/mcq-importer.ts`):
     - Import via CSV file, Excel (`.xlsx`/`.xls`), JSON file, or pasted JSON.
     - Mandatory preview & strict row-level validation (all 4 options `A..D`, valid `correct_option`, in-batch duplicate detection).
     - Append to current set OR Replace existing (auto-increments `version` in `mcq_question_sets`, preserving old attempts on `question_set_version`).
     - Option to `publishImmediately` upon commit; full import audit trail in `mcq_import_logs`.
     - Inline question list with 1-click `correct_option` switcher, Edit modal, Single delete, and `Clear All MCQs`.

### Module 3: Live Test Management (`/admin/live-tests`)
- **Global Switch**: Toggle `settings.live_test_enabled` ON/OFF.
- **Lifecycle**: `draft` -> `published` (requires >= 1 question) -> `closed` (blocks new submissions) -> optional `answers_released = true` (or revert `closed -> draft`).
- **Timing**: **No countdown timers exist** — live tests stay open indefinitely while `published` until the admin clicks **Close Test**.
- **Question Management**: Add manually, edit, 1-click `correct_option` switch, delete, or bulk import via CSV/JSON/Excel upload or paste.
- **Answer-Key & Anti-Cheat Protection**:
  - Public endpoint `GET /api/live-tests/[testId]` strips `correct_option` and `explanation` completely.
  - Grading occurs 100% server-side (`POST /api/live-tests/[testId]/submit`) with `UNIQUE(test_id, phone_number)` upsert (`1` mark per correct answer, `0` negative marking).
  - Answer keys (`GET /api/live-tests/[testId]/answers`) strictly require `answers_released === true` (`403 ANSWERS_NOT_RELEASED` otherwise).
- **Results & Export**: Ranked leaderboard (`marks_obtained DESC, submitted_at ASC`) exportable to `.xlsx` and `.pdf`.

### Module 4: Notes Management (`/admin/notes`)
- **Recursive Directory Tree (`note_folders`)**: Create/rename subfolders, 3-dots folder menu (Edit, New Subfolder, Delete with recursive cascade cleanup of notes + storage objects). No generic category dropdown in UI (`category_code` stored for schema compatibility).
- **PDF Upload & Metadata (`pdf_materials`)**: Upload `.pdf` up to 50MB to Supabase Storage (`notes` bucket), edit title/description/folder, quick-move between folders, replace file, delete file.
- **Dual Access Control Toggles**:
  - `is_previewable` (`true`/`false`, default `true`)
  - `allow_download` (`true`/`false`, default `false`)
  - Enforced across all 4 combinations (`ON/ON`, `ON/OFF`, `OFF/ON`, `OFF/OFF`).
- **Critical Architecture Note for Flutter**: Currently `notes` bucket is `public = true` and `pdf_url` is returned in `GET /api/notes`. In Flutter LMS, `notes` bucket MUST be switched to `public = false` and accessed strictly via signed URLs / Edge Function checks so `allow_download=false` and `is_previewable=false` cannot be bypassed.

### Module 5: Users / Students (`/admin/users`)
- Lists registered accounts with search (`name`, `email`, `phone`).
- **Adaptation Required**: Current User Details modal fetches e-commerce `orders`. Replace this with LMS participation stats (`mcq_attempts`, `live_test_submissions`, `mcq_bookmarks`).

### Module 6: System Settings, Profile, 2FA & Audit History (`/admin/settings`, `/admin/profile`, `/admin/history`)
- **Settings**: Controls `maintenance_mode` and Flash Notification Marquee (`live_notification_enabled`, `text`, `link`), both protected by Google Authenticator 2FA and logged to `admin_audit_logs`.
- **Profile & 2FA**: Edit admin name/phone/password, view/scan master 2FA QR code (`otpauth://totp/...`), or reset 2FA secret.
- **Audit History**: View immutable log of admin actions with before/after JSON diffs, TOTP verification badge, IP, and location.

---

## 4. Database vs. Direct SDK Architectural Difference

The existing Next.js app executes SQL directly via `postgres` (`DATABASE_URL` pooler), **bypassing PostgreSQL RLS**. Because a Flutter mobile app communicates through Supabase PostgREST (`anon`/`authenticated` JWTs) or Edge Functions:
- Direct client PostgREST writes will be **blocked** by current RLS (`service_role` only on admin tables; all `anon`/`public` writes revoked).
- **`note_folders` currently has RLS enabled with ZERO policies**, blocking non-service-role reads altogether.
- **`live_test_questions` currently allows `public SELECT`** across all columns (including `correct_option`), which must be masked via RPC/column privileges before shipping a native client.

See [ADMIN_DATABASE_SCHEMA.md](./ADMIN_DATABASE_SCHEMA.md), [RLS_POLICIES.md](../database-reference/RLS_POLICIES.md), and [LMS_ADMIN_IMPLEMENTATION_GUIDE.md](./LMS_ADMIN_IMPLEMENTATION_GUIDE.md) for the exact resolution design.
