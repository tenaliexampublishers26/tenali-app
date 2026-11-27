# Flutter & Dart Native Android LMS Implementation Guide

> **Objective:** Translate the audited Next.js Admin Panel into a production-ready **Flutter (Dart) + Supabase** native Android LMS application for Google Play Store distribution, **without any e-commerce features**.

---

## 1. Feature Inclusion vs. Exclusion Matrix

| Module from Website | Target Flutter LMS | Notes / Adaptation |
|---|---|---|
| Admin Auth & Role Guard (`users.role = 'admin'`) | **INCLUDE** | Use Supabase Auth + DB role check + `is_admin()` RLS / Edge Functions |
| Google Authenticator 2FA & Audit Logs | **INCLUDE** | Implement TOTP verification inside Supabase Edge Functions (never embed secret in app!) |
| Global Feature Switches (`mcq_enabled`, `live_test_enabled`, `maintenance_mode`, Live Notification) | **INCLUDE** | Stored in `settings` table; admin toggles via Edge Function / admin RLS |
| MCQ Hierarchy (`mcq_topics`, `mcq_chapters`, `mcq_mediums`, `mcq_question_sets`, `mcq_questions`) | **INCLUDE** | Full CRUD, recursive subtopics, versioning, publishing |
| CSV / JSON / Excel Bulk Question Importer | **INCLUDE** | Port `McqImportParser` to Dart + `file_picker` + `excel` + `csv` packages |
| Live Tests (`live_tests`, `live_test_questions`, `live_test_submissions`) | **INCLUDE** | Untimed lifecycle, manual/bulk questions, answer-key gating, ranking, Excel/PDF export |
| Notes Management (`note_folders`, `pdf_materials`) | **INCLUDE & HARDEN** | Switch `notes` bucket to **private**; enforce 4 Preview/Download states via Edge Function + Android `FLAG_SECURE` |
| Users / Students Directory | **INCLUDE & ADAPT** | Replace e-commerce `orders` modal with MCQ Attempts + Live Test Submissions + Bookmarks |
| Books Store, Cart, Checkout, Orders, Invoices, Postal Slips, Razorpay, Revenue Analytics | **EXCLUDE** | Do not migrate any of these files, tables, or routes |

---

## 2. Recommended Flutter Architecture (`lib/`)

```text
lib/
├── core/
│   ├── config/supabase_config.dart
│   ├── auth/auth_notifier.dart          # Supabase Auth session + public.users.role hydration
│   ├── utils/mcq_import_parser.dart     # Port of src/lib/mcq-importer.ts
│   ├── utils/size_formatter.dart        # Port of parseSizeToBytes / formatBytesToMB
│   └── widgets/                         # AdminCard, StatTile, SwitchTile, ConfirmModal, 2FA OTP Dialog
├── features/admin/
│   ├── dashboard/                       # LMS KPIs, mcq_enabled & live_test_enabled quick toggles
│   ├── mcq/                             # Topic/Subtopic tree, Chapters, Mediums, Importer, Question Editor
│   ├── live_tests/                      # Test CRUD, Question Manager, Publish/Close, Release Key, Excel/PDF Export
│   ├── notes/                           # Folder tree, 3-dots menu, PDF upload, Preview/Download toggles, Viewer
│   ├── users/                           # Student search + MCQ/LiveTest attempt inspector
│   ├── settings/                        # Live Notification Marquee + Maintenance Mode (2FA)
│   ├── audit_history/                   # admin_audit_logs viewer with JSON diff
│   └── profile/                         # Admin profile/password + 2FA QR setup
└── features/student/                    # (LMS student screens consuming the same Supabase backend)
```

---

## 3. Critical Backend Migrations Required Before Connecting Flutter

Because the Next.js website bypassed RLS via a server-side `postgres` pooler, **4 mandatory Supabase hardening steps** are required before shipping Flutter:

### Step 1: Create `public.is_admin()` & Admin RLS Policies
Apply SQL in Supabase to allow authenticated admins (`users.role = 'admin'`) to manage LMS tables, OR route all admin mutations through Supabase Edge Functions:
- Fix **`note_folders`**: Currently has `rls_enabled = true` with **zero policies** (all PostgREST reads fail). Add public/authenticated `SELECT` + admin `ALL`.
- Prevent student self-escalation on `users`: Restrict student `UPDATE` on `users` so `role` cannot be modified by non-admins.

### Step 2: Fix Live Test Answer-Key Security Hole
Currently `public.live_test_questions` has `Allow public read questions for published live tests` across **all columns**.
- Revoke direct `SELECT` on `live_test_questions` from `anon`/`authenticated`, **OR** serve active test questions through an RPC `get_student_live_test_questions(p_test_id uuid)` that omits `correct_option` and `explanation` unless `live_tests.answers_released = true` or `public.is_admin()`.
- Run live test grading inside an RPC or Edge Function (`submit_live_test`) so students never calculate their own score client-side.

### Step 3: Make `notes` Storage Bucket Private (`public = false`)
Currently `storage.buckets` has `notes.public = true` and `pdf_materials.pdf_url` exposes public URLs.
- Set `UPDATE storage.buckets SET public = false WHERE id = 'notes';`.
- Store relative object key in `pdf_materials` (e.g. `storage_path`).
- Build an Edge Function `notes-access`:
  - `mode=preview`: verifies `is_previewable == true`, streams bytes or returns 60s signed URL (`403 PREVIEW_DISABLED` if false).
  - `mode=download`: verifies `allow_download == true`, increments `download_count`, returns 60s download signed URL (`403 DOWNLOAD_DISABLED` if false).

### Step 4: Move TOTP 2FA Verification & Audit Writing Server-Side
- Keep `admin_2fa_secrets` strictly `service_role`-only (never readable from Flutter client).
- Build Edge Functions for Settings/Profile updates and optional destructive LMS actions (`delete_topic_tree`, `release_live_test_answers`), verifying `x-totp-code` inside Deno before executing and writing `admin_audit_logs`.

---

## 4. Dart Package Equivalents

| Website Dependency | Flutter / Dart Equivalent | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `supabase_flutter` | Auth, PostgREST, Storage, Edge Functions |
| `xlsx` (Import + Export) | `excel` + `csv` | Parse `.xlsx`/`.csv` questions & export Live Test `.xlsx` reports |
| `jspdf` | `pdf` + `printing` / `share_plus` | Generate & share ranked Live Test PDF result sheets |
| `pdfjs-dist` (`PdfViewerModal`) | `pdfrx` or `syncfusion_flutter_pdfviewer` / `pdfx` | Render PDF from in-memory `Uint8List` when `allow_download = false` |
| Native `<input type="file">` | `file_picker` | Pick `.csv`, `.json`, `.xlsx`, `.pdf` on Android |
| `qrcode` (Admin 2FA setup) | `qr_flutter` | Display Google Authenticator TOTP QR on `/admin/profile` |
| `lucide-react` | `lucide_icons` | Match icon set cleanly across Admin UI |
| Client screenshot guard | `screen_protector` / native `FLAG_SECURE` | Prevent screenshots/recording during `allow_download = false` PDF preview |

---

## 5. Suggested Implementation Phases

1. **Phase 1 — Supabase Hardening & Auth**: Add `is_admin()`, fix `note_folders` RLS, mask `live_test_questions` answers via RPC, set `notes` bucket private, verify Google + Email login in Flutter.
2. **Phase 2 — Core Admin Shell + Settings/Profile/History**: Build Flutter Admin Navigation, `McqToggleCard`, Live Test toggle, Settings (`maintenance_mode`, notification marquee), 2FA modal + QR screen, Audit History.
3. **Phase 3 — MCQ Hierarchy & Bulk Importer**: Build Topic/Subtopic tree, Chapter/Medium manager, `McqImportParser` in Dart, preview/commit flow, and single-question editor.
4. **Phase 4 — Live Tests & Exports**: Build Draft/Live/Closed/Release-Key lifecycle, Question manager/importer, Ranked leaderboard, `.xlsx` & `.pdf` report generation & Android share/save.
5. **Phase 5 — Notes & Student/User Directory**: Build `note_folders` 3-dots CRUD, PDF uploader, Preview/Download 4-combination UI + `FLAG_SECURE` viewer, and Student Attempt Inspector.
6. **Phase 6 — Google Play Store Readiness**: Strip all unused dependencies/e-commerce references, verify non-admin users cannot access admin routes/functions even via modified API calls, verify Play Console Data Safety declarations (Auth email/phone, quiz scores, crash logs if enabled).
